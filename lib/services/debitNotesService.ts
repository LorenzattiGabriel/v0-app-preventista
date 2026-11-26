import { SupabaseClient } from "@supabase/supabase-js"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"
import type { DebitNote } from "@/lib/types/database"

export interface CreateDebitNoteInput {
  customerId: string
  orderId?: string | null
  reason: string
  amount: number
  proofUrl?: string | null
  notes?: string | null
  createdBy: string
}

export type DebitNoteResult =
  | { success: true; debitNote: DebitNote }
  | { success: false; error: string }

class DebitNotesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Crea una nota de débito y su movimiento en cuenta corriente, de forma
   * atómica a nivel aplicación: si el movimiento falla, se revierte la
   * cabecera (a diferencia de la NC, aquí el impacto en cuenta corriente
   * SIEMPRE ocurre — no tiene sentido una ND que no aumente la deuda).
   */
  async create(input: CreateDebitNoteInput): Promise<DebitNoteResult> {
    if (!input.reason?.trim() || input.reason.trim().length < 5) {
      return { success: false, error: "El motivo es obligatorio (mínimo 5 caracteres)" }
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { success: false, error: "El monto debe ser mayor a $0" }
    }

    // 1. Validar pedido (si se vinculó uno) pertenece al cliente
    if (input.orderId) {
      const { data: order, error: orderError } = await this.supabase
        .from("orders")
        .select("id, customer_id")
        .eq("id", input.orderId)
        .single()
      if (orderError || !order) {
        return { success: false, error: "Pedido no encontrado" }
      }
      if (order.customer_id !== input.customerId) {
        return { success: false, error: "El pedido no pertenece a este cliente" }
      }
    }

    // 2. Número correlativo
    const { data: number, error: numberError } = await this.supabase.rpc("generate_debit_note_number")
    if (numberError || !number) {
      console.error("[debitNotes] Error generando número", numberError)
      return { success: false, error: "No se pudo generar el número de nota de débito" }
    }

    // 3. Cabecera
    const { data: debitNote, error: insertError } = await this.supabase
      .from("debit_notes")
      .insert({
        debit_note_number: number,
        customer_id: input.customerId,
        order_id: input.orderId ?? null,
        reason: input.reason.trim(),
        amount: input.amount,
        proof_url: input.proofUrl ?? null,
        notes: input.notes?.trim() || null,
        created_by: input.createdBy,
      })
      .select()
      .single()

    if (insertError || !debitNote) {
      console.error("[debitNotes] Error al crear cabecera", insertError)
      return { success: false, error: "No se pudo crear la nota de débito" }
    }

    // 4. Movimiento de cuenta corriente (aumenta deuda)
    try {
      const accountService = createAccountMovementsService(this.supabase)
      await accountService.createMovement({
        customerId: input.customerId,
        movementType: "NOTA_DEBITO",
        description: `Nota de débito ${number}: ${input.reason.trim()}`,
        amount: input.amount,
        orderId: input.orderId ?? undefined,
        createdBy: input.createdBy,
        notes: input.reason.trim(),
        proofUrl: input.proofUrl ?? undefined,
      })
    } catch (accountError) {
      console.error("[debitNotes] Error al registrar movimiento de cuenta corriente, revirtiendo ND", accountError)
      await this.supabase.from("debit_notes").delete().eq("id", debitNote.id)
      return { success: false, error: "No se pudo registrar el movimiento en la cuenta corriente" }
    }

    return { success: true, debitNote: debitNote as DebitNote }
  }

  /** Lista las notas de débito de un cliente, más recientes primero. */
  async listByCustomer(customerId: string): Promise<DebitNote[]> {
    const { data, error } = await this.supabase
      .from("debit_notes")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[debitNotes] Error al listar por cliente", error)
      return []
    }
    return (data ?? []) as DebitNote[]
  }
}

export function createDebitNotesService(supabase: SupabaseClient) {
  return new DebitNotesService(supabase)
}

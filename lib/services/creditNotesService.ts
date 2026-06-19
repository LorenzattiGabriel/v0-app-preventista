import { SupabaseClient } from "@supabase/supabase-js"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"
import type {
  CreditNote,
  CreditNoteDisposition,
  CreditNoteResolution,
} from "@/lib/types/database"

/** Coerción segura a número (Supabase devuelve DECIMAL como string). */
const toNum = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export interface CreditNoteReturnedItem {
  productId: string | null
  productName: string
  /** Productos por unidad: unidades devueltas. Por peso: PIEZAS devueltas (se reintegran al stock). */
  quantity: number
  /** Por unidad: precio por unidad. Por peso: precio por kg. */
  unitPrice: number
  /** 'peso' = el monto se calcula sobre weightKg × unitPrice. */
  saleUnit?: "unidad" | "peso" | null
  /** Kg exactos devueltos (solo saleUnit='peso'). */
  weightKg?: number
  /** Qué se hace con el producto devuelto: reintegrar al stock, dejar al cliente o desechar. */
  disposition: CreditNoteDisposition
}

export interface CreditNoteReplacementItem {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
}

export interface CreateCreditNoteInput {
  customerId: string
  orderId?: string | null
  invoiceType?: "A" | "B" | "C" | null
  resolutionType: CreditNoteResolution
  /** Solo se usa en 'devolucion_dinero'; en 'saldo_favor' se fuerza true, en 'reemplazo' false. */
  affectsAccount?: boolean
  reason: string
  authorizedBy?: string
  notes?: string
  returnedItems: CreditNoteReturnedItem[]
  replacementItems?: CreditNoteReplacementItem[]
  createdBy: string
}

export type CreditNoteResult =
  | { success: true; creditNote: CreditNote }
  | { success: false; error: string }

class CreditNotesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Determina si la resolución elegida debe impactar la cuenta corriente.
   * - 'saldo_favor': siempre.
   * - 'devolucion_dinero': según affectsAccount (lo decide el admin al emitir).
   * - 'reemplazo': nunca (se resuelve con producto, no con dinero).
   */
  private shouldAffectAccount(resolution: CreditNoteResolution, affectsAccount: boolean): boolean {
    if (resolution === "saldo_favor") return true
    if (resolution === "devolucion_dinero") return affectsAccount
    return false
  }

  /**
   * Ajusta el stock de un producto y registra el movimiento de auditoría.
   * @param delta cantidad a sumar (positivo) o restar (negativo)
   */
  private async adjustStock(params: {
    productId: string
    delta: number
    movementType: "return" | "order_assembly"
    note: string
    createdBy: string
    referenceId: string
  }): Promise<void> {
    const { productId, delta, movementType, note, createdBy, referenceId } = params
    if (delta === 0) return

    const { data: product, error } = await this.supabase
      .from("products")
      .select("code, name, current_stock")
      .eq("id", productId)
      .single()

    if (error || !product) {
      console.error(`[creditNotes] Producto ${productId} no encontrado para ajuste de stock`, error)
      return
    }

    const previousStock = toNum(product.current_stock)
    const newStock = Math.max(0, previousStock + delta)

    const { error: updateError } = await this.supabase
      .from("products")
      .update({ current_stock: newStock })
      .eq("id", productId)

    if (updateError) {
      console.error(`[creditNotes] Error al actualizar stock de ${productId}`, updateError)
      return
    }

    // Auditoría en stock_movements
    await this.supabase.from("stock_movements").insert({
      product_id: productId,
      product_code: product.code,
      product_name: product.name,
      previous_stock: previousStock,
      new_stock: newStock,
      quantity_changed: delta,
      movement_type: movementType,
      created_by: createdBy,
      notes: note,
      reference_id: referenceId,
      reference_type: "credit_note",
    })
  }

  /**
   * Crea una nota de crédito y ejecuta sus efectos (stock + cuenta corriente)
   * según la resolución elegida por el administrador.
   */
  async create(input: CreateCreditNoteInput): Promise<CreditNoteResult> {
    const returnedItems = input.returnedItems ?? []
    const replacementItems = input.replacementItems ?? []

    if (!input.orderId) {
      return { success: false, error: "La nota de crédito debe estar asociada a un pedido entregado" }
    }
    if (returnedItems.length === 0) {
      return { success: false, error: "Debe indicar al menos un producto devuelto" }
    }
    if (!input.reason?.trim()) {
      return { success: false, error: "El motivo es obligatorio" }
    }

    // Subtotal de una línea devuelta:
    //  - por peso: kg exactos × precio/kg
    //  - por unidad: cantidad × precio/unidad
    const lineSubtotal = (it: CreditNoteReturnedItem) =>
      it.saleUnit === "peso"
        ? toNum(it.weightKg) * toNum(it.unitPrice)
        : toNum(it.quantity) * toNum(it.unitPrice)

    // Monto total = suma de los productos devueltos
    const amount = returnedItems.reduce((sum, it) => sum + lineSubtotal(it), 0)

    const affectsAccount = this.shouldAffectAccount(
      input.resolutionType,
      input.affectsAccount ?? false,
    )

    // 1. Generar número correlativo
    const { data: number, error: numberError } = await this.supabase.rpc("generate_credit_note_number")
    if (numberError || !number) {
      console.error("[creditNotes] Error generando número", numberError)
      return { success: false, error: "No se pudo generar el número de nota de crédito" }
    }

    // 2. Insertar cabecera
    const { data: creditNote, error: insertError } = await this.supabase
      .from("credit_notes")
      .insert({
        credit_note_number: number,
        customer_id: input.customerId,
        order_id: input.orderId ?? null,
        invoice_type: input.invoiceType ?? null,
        resolution_type: input.resolutionType,
        affects_account: affectsAccount,
        reason: input.reason.trim(),
        authorized_by: input.authorizedBy?.trim() || null,
        amount,
        notes: input.notes?.trim() || null,
        created_by: input.createdBy,
      })
      .select()
      .single()

    if (insertError || !creditNote) {
      console.error("[creditNotes] Error al crear cabecera", insertError)
      return { success: false, error: "No se pudo crear la nota de crédito" }
    }

    // 3. Insertar líneas (devueltas + reemplazo)
    const itemsToInsert = [
      ...returnedItems.map((it) => ({
        credit_note_id: creditNote.id,
        product_id: it.productId,
        product_name: it.productName,
        line_type: "devuelto" as const,
        quantity: toNum(it.quantity),
        unit_price: toNum(it.unitPrice),
        subtotal: lineSubtotal(it),
        sale_unit: it.saleUnit ?? null,
        returned_weight_kg: it.saleUnit === "peso" ? toNum(it.weightKg) : null,
        disposition: it.disposition,
      })),
      ...replacementItems.map((it) => ({
        credit_note_id: creditNote.id,
        product_id: it.productId,
        product_name: it.productName,
        line_type: "reemplazo" as const,
        quantity: toNum(it.quantity),
        unit_price: toNum(it.unitPrice),
        subtotal: toNum(it.quantity) * toNum(it.unitPrice),
        sale_unit: null,
        returned_weight_kg: null,
        disposition: null,
      })),
    ]

    const { error: itemsError } = await this.supabase.from("credit_note_items").insert(itemsToInsert)
    if (itemsError) {
      console.error("[creditNotes] Error al insertar líneas, revirtiendo cabecera", itemsError)
      await this.supabase.from("credit_notes").delete().eq("id", creditNote.id)
      return { success: false, error: "No se pudieron guardar los productos de la nota de crédito" }
    }

    // 4. Stock: reingreso de devueltos marcados como 'reintegrar' + descuento de reemplazos
    for (const it of returnedItems) {
      if (it.disposition === "reintegrar" && it.productId) {
        await this.adjustStock({
          productId: it.productId,
          delta: toNum(it.quantity),
          movementType: "return",
          note: `Devolución NC ${number}`,
          createdBy: input.createdBy,
          referenceId: creditNote.id,
        })
      }
    }
    for (const it of replacementItems) {
      if (it.productId) {
        await this.adjustStock({
          productId: it.productId,
          delta: -toNum(it.quantity),
          movementType: "order_assembly",
          note: `Reemplazo NC ${number}`,
          createdBy: input.createdBy,
          referenceId: creditNote.id,
        })
      }
    }

    // 5. Cuenta corriente: crédito si corresponde a la resolución
    if (affectsAccount && amount > 0) {
      try {
        const accountService = createAccountMovementsService(this.supabase)
        await accountService.createMovement({
          customerId: input.customerId,
          movementType: "NOTA_CREDITO",
          description: `Nota de crédito ${number}`,
          amount,
          orderId: input.orderId ?? undefined,
          createdBy: input.createdBy,
          notes: input.reason.trim(),
        })
      } catch (accountError) {
        console.error("[creditNotes] Error al registrar movimiento de cuenta corriente", accountError)
        // La NC ya quedó creada; el movimiento de cuenta se puede corregir a mano si falla.
      }
    }

    return { success: true, creditNote: creditNote as CreditNote }
  }

  /** Lista las notas de crédito de un cliente (con sus líneas), más recientes primero. */
  async listByCustomer(customerId: string): Promise<CreditNote[]> {
    const { data, error } = await this.supabase
      .from("credit_notes")
      .select("*, items:credit_note_items(*)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[creditNotes] Error al listar por cliente", error)
      return []
    }
    return (data ?? []) as CreditNote[]
  }
}

export function createCreditNotesService(supabase: SupabaseClient) {
  return new CreditNotesService(supabase)
}

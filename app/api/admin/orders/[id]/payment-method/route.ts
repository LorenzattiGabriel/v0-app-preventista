import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"
import { PAYMENT_METHODS, type PaymentLine, type PaymentMethod } from "@/lib/types/database"

const ALLOWED_ROLES = ["administrativo"]

/**
 * POST /api/admin/orders/[id]/payment-method
 * Corrige la(s) forma(s) de pago de un pedido ya ENTREGADO y cobrado, SIN cambiar el monto.
 * Body: { lines: { method: PaymentMethod, amount: number }[] }
 * La suma de las líneas debe ser igual al monto ya cobrado (amount_paid).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const rawLines = Array.isArray(body.lines) ? body.lines : []

    if (rawLines.length === 0) {
      return NextResponse.json({ error: "Debe indicar al menos una forma de pago" }, { status: 400 })
    }

    // Validar y normalizar líneas
    const lines: { method: PaymentMethod; amount: number }[] = []
    for (const l of rawLines) {
      const method = l?.method as PaymentMethod
      const amount = Number(l?.amount)
      if (!PAYMENT_METHODS.includes(method)) {
        return NextResponse.json({ error: `Método de pago inválido: ${l?.method}` }, { status: 400 })
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Cada forma de pago debe tener un importe mayor a $0" }, { status: 400 })
      }
      lines.push({ method, amount })
    }

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, status, amount_paid, was_collected_on_delivery, payment_method, payment_methods_json, transfer_proof_url")
      .eq("id", orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    if (order.status !== "ENTREGADO") {
      return NextResponse.json(
        { error: "Solo se puede editar la forma de pago de pedidos entregados" },
        { status: 400 },
      )
    }

    if (!order.was_collected_on_delivery) {
      return NextResponse.json(
        { error: "Este pedido no registró cobro en la entrega" },
        { status: 400 },
      )
    }

    const amountPaid = Number(order.amount_paid || 0)
    const newTotal = lines.reduce((sum, l) => sum + l.amount, 0)

    // No se permite cambiar el monto, solo la forma de pago
    if (Math.abs(newTotal - amountPaid) > 0.01) {
      return NextResponse.json(
        {
          error: `El total de las formas de pago ($${newTotal.toFixed(2)}) debe ser igual al monto cobrado ($${amountPaid.toFixed(2)}).`,
        },
        { status: 400 },
      )
    }

    // Preservar comprobante de transferencia previo (si sigue habiendo una línea de transferencia)
    const oldJson: PaymentLine[] = Array.isArray(order.payment_methods_json)
      ? (order.payment_methods_json as PaymentLine[])
      : []
    const oldTransferProof =
      oldJson.find((p) => p.method === "Transferencia" && p.transferProofUrl)?.transferProofUrl ||
      order.transfer_proof_url ||
      undefined

    const newJson: PaymentLine[] = lines.map((l) => ({
      method: l.method,
      amount: l.amount,
      transferProofUrl: l.method === "Transferencia" ? oldTransferProof : undefined,
    }))

    // Método principal (mayor monto) para backward compat
    const primary = lines.reduce((max, l) => (l.amount > max.amount ? l : max), lines[0])
    const firstTransferProof = newJson.find((p) => p.method === "Transferencia")?.transferProofUrl || null

    const oldSummary =
      oldJson.length > 0
        ? oldJson.map((p) => `${p.method}: $${Number(p.amount).toFixed(2)}`).join(", ")
        : order.payment_method || "—"
    const newSummary = lines.map((l) => `${l.method}: $${l.amount.toFixed(2)}`).join(", ")

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_method: primary.method,
        payment_methods_json: newJson,
        transfer_proof_url: firstTransferProof,
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("[payment-method] update error:", updateError)
      return NextResponse.json({ error: "Error al actualizar el pedido" }, { status: 500 })
    }

    // Re-sincronizar movimientos de cuenta corriente (no cambia el balance, solo la categoría)
    try {
      const accountService = createAccountMovementsService(supabase)
      await accountService.correctOrderPaymentMethods({
        orderId,
        lines: newJson.map((l) => ({
          method: l.method,
          amount: l.amount,
          transferProofUrl: l.transferProofUrl,
        })),
        createdBy: user.id,
      })
    } catch (accountError) {
      console.warn("[payment-method] no se pudieron re-sincronizar movimientos:", accountError)
    }

    // Historial del pedido
    await supabase.from("order_history").insert({
      order_id: orderId,
      previous_status: "ENTREGADO",
      new_status: "ENTREGADO",
      changed_by: user.id,
      change_reason: `Forma de pago corregida por admin: ${oldSummary} → ${newSummary}`,
    })

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath("/admin/orders")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[payment-method] internal error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

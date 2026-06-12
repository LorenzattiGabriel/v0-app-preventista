import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createStockService } from "@/lib/services/stockService"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"

/**
 * Anula una VENTA DIRECTA (order_type = "local").
 * Las ventas directas nacen en estado ENTREGADO, por lo que el botón genérico de
 * cancelar pedido las bloquea. Este endpoint es el camino específico para anularlas:
 * revierte stock + la deuda pendiente en cuenta corriente y deja la venta CANCELADO.
 * Solo el rol administrativo puede anular, con un justificativo obligatorio.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Solo admin puede anular ventas
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") {
    return NextResponse.json({ error: "Forbidden - Solo el administrador puede anular ventas" }, { status: 403 })
  }

  // Justificativo obligatorio
  let reason = ""
  try {
    const body = await request.json()
    reason = (body?.reason || "").toString().trim()
  } catch {
    // body vacío → reason queda ""
  }
  if (reason.length < 5) {
    return NextResponse.json({ error: "El motivo de anulación es obligatorio (mínimo 5 caracteres)" }, { status: 400 })
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("status, order_type, total, customer_id, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })
    }

    if (order.order_type !== "local") {
      return NextResponse.json({ error: "Este endpoint solo anula ventas directas (tipo local)" }, { status: 400 })
    }

    if (order.status === "CANCELADO") {
      return NextResponse.json({ error: "La venta ya está anulada" }, { status: 400 })
    }

    // 1. Restaurar stock (la venta directa descontó stock al confirmarse)
    const stockService = createStockService(supabase)
    const restored = await stockService.restoreStockFromCancelledOrder(orderId)
    if (!restored) {
      console.warn(`[VoidSale ${orderId}] Restauración de stock falló, se continúa con la anulación`)
    }

    // 2. Revertir la deuda pendiente en cuenta corriente (solo el saldo no cobrado)
    try {
      const { data: paymentRecord } = await supabase
        .from("order_payments")
        .select("balance_due")
        .eq("order_id", orderId)
        .maybeSingle()

      const balanceToReverse = Number(paymentRecord?.balance_due ?? order.total) || 0

      if (balanceToReverse > 0) {
        const accountService = createAccountMovementsService(supabase)
        await accountService.createMovement({
          customerId: order.customer_id,
          movementType: "NOTA_CREDITO",
          description: `Anulación venta directa ${order.order_number}`,
          amount: balanceToReverse,
          orderId,
          createdBy: user.id,
          notes: reason,
        })
        console.log(`[VoidSale ${orderId}] Deuda revertida: $${balanceToReverse}`)
      }

      if (paymentRecord) {
        await supabase
          .from("order_payments")
          .update({ balance_due: 0, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
      }
    } catch (debtError) {
      console.error(`[VoidSale ${orderId}] Error al revertir deuda:`, debtError)
      // Se continúa con la anulación aunque falle la reversión de deuda
    }

    // 3. Marcar la venta como CANCELADO
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "CANCELADO", updated_at: new Date().toISOString() })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error al anular la venta:", updateError)
      return NextResponse.json({ error: "No se pudo anular la venta" }, { status: 500 })
    }

    // 4. Historial
    await supabase.from("order_history").insert({
      order_id: orderId,
      previous_status: order.status,
      new_status: "CANCELADO",
      changed_by: user.id,
      change_reason: `Venta directa anulada - Stock y deuda revertidos. Motivo: ${reason}`,
    })

    return NextResponse.json({ message: "Venta anulada correctamente", stockRestored: restored })
  } catch (error) {
    console.error("Error anulando venta:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

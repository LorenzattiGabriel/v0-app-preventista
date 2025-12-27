import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createStockService } from "@/lib/services/stockService"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"

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

  // Role check - only admin can cancel orders
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "administrativo") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
  }

  try {
    // Get order details to check status
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("status, assembly_completed_at")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if order can be cancelled
    if (order.status === "CANCELADO") {
      return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 })
    }

    if (order.status === "ENTREGADO") {
      return NextResponse.json({ error: "Cannot cancel delivered orders. Use returns instead." }, { status: 400 })
    }

    // Determine if stock needs to be restored
    // Stock is restored if order was assembled (status >= PENDIENTE_ENTREGA)
    const wasAssembled = ["PENDIENTE_ENTREGA", "EN_RUTA", "EN_REPARTICION"].includes(order.status)

    if (wasAssembled) {
      console.log(`[Order ${orderId}] Was assembled, restoring stock...`)
      const stockService = createStockService(supabase)
      const restored = await stockService.restoreStockFromCancelledOrder(orderId)

      if (!restored) {
        console.warn(`[Order ${orderId}] Stock restoration failed, but continuing with cancellation`)
      } else {
        console.log(`[Order ${orderId}] Stock restored successfully`)
      }
    } else {
      console.log(`[Order ${orderId}] Was not assembled, no stock to restore`)
    }

    // 🆕 Si el pedido fue armado, reversar la deuda PENDIENTE en cuenta corriente
    if (wasAssembled) {
      try {
        // Obtener el total del pedido y el estado de pago
        const { data: orderDetails } = await supabase
          .from("orders")
          .select("total, customer_id, order_number")
          .eq("id", orderId)
          .single()

        if (orderDetails) {
          // Obtener el balance pendiente del pedido (no el total)
          const { data: paymentRecord } = await supabase
            .from("order_payments")
            .select("balance_due, total_paid")
            .eq("order_id", orderId)
            .maybeSingle()

          // El monto a reversar es el balance pendiente, no el total
          const balanceToReverse = paymentRecord?.balance_due ?? orderDetails.total

          if (balanceToReverse > 0) {
            const accountService = createAccountMovementsService(supabase)
            
            // Crear movimiento de crédito (NOTA_CREDITO) para reversar solo la deuda pendiente
            await accountService.createMovement({
              customerId: orderDetails.customer_id,
              movementType: "NOTA_CREDITO",
              description: `Cancelación pedido ${orderDetails.order_number}`,
              amount: balanceToReverse,
              orderId,
              createdBy: user.id,
            })

            console.log(`[Order ${orderId}] Debt reversed: $${balanceToReverse} (of total $${orderDetails.total})`)
          }

          // Actualizar order_payments a cancelado (no eliminar para mantener historial)
          if (paymentRecord) {
            await supabase
              .from("order_payments")
              .update({ 
                balance_due: 0,
                updated_at: new Date().toISOString(),
              })
              .eq("order_id", orderId)
          }
        }
      } catch (debtError) {
        console.error("Error reversing debt:", debtError)
        // Continue with cancellation even if debt reversal fails
      }
    }

    // Update order status to CANCELADO
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "CANCELADO",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error updating order status:", updateError)
      return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 })
    }

    // Create order history entry
    await supabase.from("order_history").insert({
      order_id: orderId,
      previous_status: order.status,
      new_status: "CANCELADO",
      changed_by: user.id,
      change_reason: wasAssembled ? "Pedido cancelado - Stock y deuda revertidos" : "Pedido cancelado",
    })

    return NextResponse.json({
      message: "Order cancelled successfully",
      stockRestored: wasAssembled,
    })
  } catch (error) {
    console.error("Error cancelling order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


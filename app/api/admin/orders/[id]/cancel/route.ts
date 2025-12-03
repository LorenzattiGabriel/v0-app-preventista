import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createStockService } from "@/lib/services/stockService"

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
      change_reason: wasAssembled ? "Pedido cancelado - Stock devuelto" : "Pedido cancelado",
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


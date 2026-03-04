import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MERGEABLE_STATUSES = ["BORRADOR", "PENDIENTE_ARMADO"]
const ALLOWED_ROLES = ["administrativo", "encargado_armado"]

const PRIORITY_ORDER: Record<string, number> = {
  urgente: 5,
  alta: 4,
  media: 3,
  normal: 2,
  baja: 1,
}

/**
 * POST /api/admin/orders/merge
 * Fusiona múltiples pedidos del mismo cliente en uno solo.
 * Body: { order_ids: string[] }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos para fusionar pedidos" }, { status: 403 })
    }

    const body = await request.json()
    const { order_ids } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 pedidos para fusionar" },
        { status: 400 }
      )
    }

    // 1. Fetch all orders
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .in("id", order_ids)
      .order("created_at", { ascending: true })

    if (fetchError || !orders) {
      return NextResponse.json(
        { error: "Error al obtener pedidos" },
        { status: 500 }
      )
    }

    // Validate all orders exist
    if (orders.length !== order_ids.length) {
      return NextResponse.json(
        { error: "Algunos pedidos no fueron encontrados" },
        { status: 404 }
      )
    }

    // Validate same customer
    const customerIds = new Set(orders.map((o) => o.customer_id))
    if (customerIds.size !== 1) {
      return NextResponse.json(
        { error: "Todos los pedidos deben ser del mismo cliente" },
        { status: 400 }
      )
    }

    // Validate statuses
    const invalidOrders = orders.filter((o) => !MERGEABLE_STATUSES.includes(o.status))
    if (invalidOrders.length > 0) {
      return NextResponse.json(
        {
          error: `Los pedidos deben estar en estado BORRADOR o PENDIENTE_ARMADO. Pedidos inválidos: ${invalidOrders.map((o) => o.order_number).join(", ")}`,
        },
        { status: 400 }
      )
    }

    // 2. Determine surviving order (oldest by created_at)
    const survivingOrder = orders[0]
    const absorbedOrders = orders.slice(1)
    const absorbedIds = absorbedOrders.map((o) => o.id)

    // 3. Fetch all items from all orders
    const { data: allItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", order_ids)

    if (itemsError) {
      return NextResponse.json(
        { error: "Error al obtener items de pedidos" },
        { status: 500 }
      )
    }

    // 4. Consolidate items: same product = sum quantities, use lower price
    const consolidatedItems = new Map<
      string,
      {
        product_id: string
        quantity_requested: number
        unit_price: number
        discount: number
        subtotal: number
      }
    >()

    for (const item of allItems || []) {
      const existing = consolidatedItems.get(item.product_id)
      if (existing) {
        existing.quantity_requested += item.quantity_requested
        // Use lower unit price
        existing.unit_price = Math.min(existing.unit_price, item.unit_price)
        // Sum discounts
        existing.discount += item.discount
        // Recalculate subtotal
        existing.subtotal =
          existing.quantity_requested * existing.unit_price - existing.discount
      } else {
        consolidatedItems.set(item.product_id, {
          product_id: item.product_id,
          quantity_requested: item.quantity_requested,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          subtotal: item.subtotal,
        })
      }
    }

    // Recalculate subtotals properly
    for (const item of consolidatedItems.values()) {
      item.subtotal = item.quantity_requested * item.unit_price - item.discount
    }

    // 5. Resolve conflicts
    // Priority: highest across all orders
    const highestPriority = orders.reduce((best, o) => {
      const currentLevel = PRIORITY_ORDER[o.priority] || 0
      const bestLevel = PRIORITY_ORDER[best] || 0
      return currentLevel > bestLevel ? o.priority : best
    }, orders[0].priority)

    // Delivery date: earliest
    const earliestDate = orders.reduce((earliest, o) => {
      return o.delivery_date < earliest ? o.delivery_date : earliest
    }, orders[0].delivery_date)

    // Observations: concatenate all non-empty
    const allObservations = orders
      .map((o) => o.observations)
      .filter(Boolean)
    const mergedObservations = allObservations.length > 0
      ? allObservations.join(" | ")
      : null

    // Time restrictions: if any order has one, keep the most restrictive
    const ordersWithTimeRestriction = orders.filter((o) => o.has_time_restriction)
    const hasTimeRestriction = ordersWithTimeRestriction.length > 0
    let deliveryWindowStart = null
    let deliveryWindowEnd = null
    let timeRestrictionNotes = null

    if (hasTimeRestriction) {
      // Latest start time (most restrictive)
      deliveryWindowStart = ordersWithTimeRestriction.reduce((latest, o) => {
        if (!o.delivery_window_start) return latest
        if (!latest) return o.delivery_window_start
        return o.delivery_window_start > latest ? o.delivery_window_start : latest
      }, null as string | null)

      // Earliest end time (most restrictive)
      deliveryWindowEnd = ordersWithTimeRestriction.reduce((earliest, o) => {
        if (!o.delivery_window_end) return earliest
        if (!earliest) return o.delivery_window_end
        return o.delivery_window_end < earliest ? o.delivery_window_end : earliest
      }, null as string | null)

      const allNotes = ordersWithTimeRestriction
        .map((o) => o.time_restriction_notes)
        .filter(Boolean)
      timeRestrictionNotes = allNotes.length > 0 ? allNotes.join(" | ") : null
    }

    // Requires invoice: if any order requires it
    const requiresInvoice = orders.some((o) => o.requires_invoice)

    // Calculate new totals
    const newSubtotal = Array.from(consolidatedItems.values()).reduce(
      (sum, item) => sum + item.subtotal,
      0
    )
    // Sum general discounts from all orders
    const newGeneralDiscount = orders.reduce(
      (sum, o) => sum + (o.general_discount || 0),
      0
    )
    const newTotal = newSubtotal - newGeneralDiscount

    // 6. Delete existing items of surviving order
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", survivingOrder.id)

    if (deleteItemsError) {
      return NextResponse.json(
        { error: "Error al actualizar items del pedido" },
        { status: 500 }
      )
    }

    // 7. Insert consolidated items for surviving order
    const newItems = Array.from(consolidatedItems.values()).map((item) => ({
      order_id: survivingOrder.id,
      product_id: item.product_id,
      quantity_requested: item.quantity_requested,
      unit_price: item.unit_price,
      discount: item.discount,
      subtotal: item.subtotal,
      is_shortage: false,
      is_substituted: false,
    }))

    if (newItems.length > 0) {
      const { error: insertError } = await supabase
        .from("order_items")
        .insert(newItems)

      if (insertError) {
        return NextResponse.json(
          { error: "Error al insertar items consolidados" },
          { status: 500 }
        )
      }
    }

    // 8. Update surviving order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        priority: highestPriority,
        delivery_date: earliestDate,
        observations: mergedObservations,
        subtotal: newSubtotal,
        general_discount: newGeneralDiscount,
        total: newTotal,
        requires_invoice: requiresInvoice,
        has_time_restriction: hasTimeRestriction,
        delivery_window_start: deliveryWindowStart,
        delivery_window_end: deliveryWindowEnd,
        time_restriction_notes: timeRestrictionNotes,
        merged_from: absorbedIds,
        status: "PENDIENTE_ARMADO",
      })
      .eq("id", survivingOrder.id)

    if (updateError) {
      return NextResponse.json(
        { error: "Error al actualizar pedido principal" },
        { status: 500 }
      )
    }

    // 9. Cancel absorbed orders
    for (const absorbed of absorbedOrders) {
      // Delete items of absorbed order
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", absorbed.id)

      // Update absorbed order status
      await supabase
        .from("orders")
        .update({
          status: "CANCELADO",
          observations: `Fusionado en ${survivingOrder.order_number}. ${absorbed.observations || ""}`.trim(),
        })
        .eq("id", absorbed.id)

      // Create history entry for absorbed order
      await supabase.from("order_date_changes").insert({
        order_id: absorbed.id,
        change_type: "status_change",
        previous_status: absorbed.status,
        new_status: "CANCELADO",
        change_reason: `Pedido fusionado en ${survivingOrder.order_number}`,
        changed_by: user.id,
        changed_by_name: profile.full_name,
      })
    }

    // 10. Create history entry for surviving order
    await supabase.from("order_date_changes").insert({
      order_id: survivingOrder.id,
      change_type: "status_change",
      previous_status: survivingOrder.status,
      new_status: "PENDIENTE_ARMADO",
      change_reason: `Pedido fusionado con: ${absorbedOrders.map((o) => o.order_number).join(", ")}`,
      changed_by: user.id,
      changed_by_name: profile.full_name,
    })

    return NextResponse.json({
      success: true,
      surviving_order_id: survivingOrder.id,
      surviving_order_number: survivingOrder.order_number,
      merged_count: absorbedOrders.length,
      new_total: newTotal,
      consolidated_items_count: consolidatedItems.size,
    })
  } catch (error) {
    console.error("Error merging orders:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

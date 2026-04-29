import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * POST /api/repartidor/routes/[id]/reorder
 * Mueve un stop al "próximo" (delivery_order = primero entre los pendientes).
 * Body: { order_id: string, reason: string }
 *
 * El repartidor usa el botón "Ir ahora" cuando hay un imprevisto y necesita
 * cambiar el orden propuesto. El motivo es obligatorio para auditoría.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { order_id, reason } = body

    if (!order_id) {
      return NextResponse.json(
        { error: "Falta order_id" },
        { status: 400 }
      )
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "El motivo es obligatorio (mínimo 5 caracteres)" },
        { status: 400 }
      )
    }

    // Validar que la ruta exista y pertenezca al repartidor actual
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, driver_id, status")
      .eq("id", routeId)
      .single()

    if (routeError || !route) {
      return NextResponse.json(
        { error: "Ruta no encontrada" },
        { status: 404 }
      )
    }

    if (route.driver_id !== user.id) {
      return NextResponse.json(
        { error: "Solo el repartidor asignado puede reordenar la ruta" },
        { status: 403 }
      )
    }

    if (route.status !== "EN_CURSO") {
      return NextResponse.json(
        { error: "Solo se puede reordenar una ruta EN_CURSO" },
        { status: 400 }
      )
    }

    // Traer todos los stops de la ruta junto con el estado del pedido
    const { data: stops, error: stopsError } = await supabase
      .from("route_orders")
      .select(`
        id,
        order_id,
        delivery_order,
        actual_arrival_time,
        orders (
          status
        )
      `)
      .eq("route_id", routeId)
      .order("delivery_order", { ascending: true })

    if (stopsError || !stops) {
      return NextResponse.json(
        { error: "Error al obtener stops de la ruta" },
        { status: 500 }
      )
    }

    // Stops ya entregados o procesados no se pueden mover
    const isDelivered = (s: any) =>
      s.actual_arrival_time !== null ||
      ["ENTREGADO", "NO_ENTREGADO"].includes(s.orders?.status)

    const target = stops.find((s) => s.order_id === order_id)
    if (!target) {
      return NextResponse.json(
        { error: "El pedido no pertenece a esta ruta" },
        { status: 400 }
      )
    }

    if (isDelivered(target)) {
      return NextResponse.json(
        { error: "Este pedido ya fue procesado, no se puede reordenar" },
        { status: 400 }
      )
    }

    // El "próximo" es el delivery_order más bajo entre los pendientes
    const pendingStops = stops.filter((s) => !isDelivered(s))
    const minPendingOrder = Math.min(
      ...pendingStops.map((s) => s.delivery_order)
    )

    if (target.delivery_order === minPendingOrder) {
      return NextResponse.json(
        { error: "Este pedido ya es el próximo en la ruta" },
        { status: 400 }
      )
    }

    const previousOrder = target.delivery_order
    const newOrder = minPendingOrder

    // Reordenar: el target pasa a tener delivery_order = minPendingOrder.
    // Los stops pendientes que estaban entre minPendingOrder y previousOrder se desplazan +1.
    // Para evitar conflictos de UNIQUE (si lo hubiera), usamos valores temporales.

    // Strategy: usar valores grandes negativos temporalmente para los pendientes a desplazar
    // y el target, después asignar los valores finales.

    // Pendientes a desplazar (los que están entre min y previousOrder, sin contar target)
    const toShift = pendingStops.filter(
      (s) =>
        s.order_id !== order_id &&
        s.delivery_order >= minPendingOrder &&
        s.delivery_order < previousOrder
    )

    // Aplicar updates
    // 1. Mover target a delivery_order = newOrder (provisorio: -1 para evitar choque)
    const { error: tempErr } = await supabase
      .from("route_orders")
      .update({ delivery_order: -1 })
      .eq("id", target.id)
    if (tempErr) {
      console.error("[reorder] temp move error:", tempErr)
      return NextResponse.json({ error: "Error al reordenar (paso 1)" }, { status: 500 })
    }

    // 2. Desplazar los demás +1 de mayor a menor para no chocar
    const sortedToShift = [...toShift].sort(
      (a, b) => b.delivery_order - a.delivery_order
    )
    for (const s of sortedToShift) {
      const { error: shiftErr } = await supabase
        .from("route_orders")
        .update({ delivery_order: s.delivery_order + 1 })
        .eq("id", s.id)
      if (shiftErr) {
        console.error("[reorder] shift error:", shiftErr)
        return NextResponse.json({ error: "Error al reordenar (paso 2)" }, { status: 500 })
      }
    }

    // 3. Asignar el target al newOrder definitivo
    const { error: finalErr } = await supabase
      .from("route_orders")
      .update({ delivery_order: newOrder })
      .eq("id", target.id)
    if (finalErr) {
      console.error("[reorder] final move error:", finalErr)
      return NextResponse.json({ error: "Error al reordenar (paso 3)" }, { status: 500 })
    }

    // 4. Loggear el cambio
    const { error: logErr } = await supabase.from("route_reorder_log").insert({
      route_id: routeId,
      order_id,
      previous_order: previousOrder,
      new_order: newOrder,
      reason: reason.trim(),
      changed_by: user.id,
    })
    if (logErr) {
      console.error("[reorder] log error:", logErr)
      // No fallamos toda la operación si solo falla el log, pero advertimos
    }

    revalidatePath(`/repartidor/routes/${routeId}`)
    revalidatePath(`/admin/routes/${routeId}`)

    return NextResponse.json({
      success: true,
      previous_order: previousOrder,
      new_order: newOrder,
    })
  } catch (error) {
    console.error("[reorder] internal error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

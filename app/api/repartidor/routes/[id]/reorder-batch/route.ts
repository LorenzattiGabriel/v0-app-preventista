import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * POST /api/repartidor/routes/[id]/reorder-batch
 * Reordena masivamente los stops PENDIENTES de una ruta (drag & drop).
 * Body: { new_orders: [{order_id, delivery_order}], reason: string }
 *
 * Respeta los stops ya entregados/no-entregados (no se mueven).
 * Cada stop movido se loggea en route_reorder_log con el mismo motivo.
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
    const { new_orders, reason } = body as {
      new_orders: Array<{ order_id: string; delivery_order: number }>
      reason: string
    }

    if (!Array.isArray(new_orders) || new_orders.length === 0) {
      return NextResponse.json(
        { error: "Falta el nuevo orden de stops" },
        { status: 400 }
      )
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "El motivo es obligatorio (mínimo 5 caracteres)" },
        { status: 400 }
      )
    }

    // Validar que la ruta exista y pertenezca al repartidor
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, driver_id, status")
      .eq("id", routeId)
      .single()

    if (routeError || !route) {
      return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 })
    }

    if (route.driver_id !== user.id) {
      return NextResponse.json(
        { error: "Solo el repartidor asignado puede reordenar la ruta" },
        { status: 403 }
      )
    }

    // Permitimos reordenar tanto en PLANIFICADO como EN_CURSO
    if (!["PLANIFICADO", "EN_CURSO"].includes(route.status)) {
      return NextResponse.json(
        { error: "Solo se puede reordenar una ruta planificada o en curso" },
        { status: 400 }
      )
    }

    // Cargar stops actuales
    const { data: stops, error: stopsError } = await supabase
      .from("route_orders")
      .select(`
        id,
        order_id,
        delivery_order,
        actual_arrival_time,
        orders ( status )
      `)
      .eq("route_id", routeId)

    if (stopsError || !stops) {
      return NextResponse.json(
        { error: "Error al obtener stops" },
        { status: 500 }
      )
    }

    const isProcessed = (s: any) =>
      s.actual_arrival_time !== null ||
      ["ENTREGADO", "NO_ENTREGADO"].includes(s.orders?.status)

    // Mapa de stops por order_id
    const stopByOrderId = new Map<string, any>()
    stops.forEach((s) => stopByOrderId.set(s.order_id, s))

    // Validar que todos los new_orders correspondan a stops existentes y NO procesados
    const movedStops: Array<{
      stop: any
      previousOrder: number
      newOrder: number
    }> = []

    for (const entry of new_orders) {
      const stop = stopByOrderId.get(entry.order_id)
      if (!stop) {
        return NextResponse.json(
          { error: `El pedido ${entry.order_id} no pertenece a esta ruta` },
          { status: 400 }
        )
      }
      if (isProcessed(stop)) {
        return NextResponse.json(
          {
            error: `El pedido ${entry.order_id} ya fue procesado, no se puede reordenar`,
          },
          { status: 400 }
        )
      }
      if (entry.delivery_order !== stop.delivery_order) {
        movedStops.push({
          stop,
          previousOrder: stop.delivery_order,
          newOrder: entry.delivery_order,
        })
      }
    }

    if (movedStops.length === 0) {
      return NextResponse.json(
        { error: "No hay cambios en el orden" },
        { status: 400 }
      )
    }

    // Para evitar conflictos de uniqueness, primero ponemos todos los movidos
    // en delivery_order negativo (-1, -2, ...), luego asignamos los finales.
    for (let i = 0; i < movedStops.length; i++) {
      const { stop } = movedStops[i]
      const { error } = await supabase
        .from("route_orders")
        .update({ delivery_order: -(i + 1) })
        .eq("id", stop.id)
      if (error) {
        console.error("[reorder-batch] temp move error:", error)
        return NextResponse.json(
          { error: "Error al reordenar (paso temporal)" },
          { status: 500 }
        )
      }
    }

    // Asignar los nuevos delivery_order definitivos
    for (const { stop, newOrder } of movedStops) {
      const { error } = await supabase
        .from("route_orders")
        .update({ delivery_order: newOrder })
        .eq("id", stop.id)
      if (error) {
        console.error("[reorder-batch] final move error:", error)
        return NextResponse.json(
          { error: "Error al reordenar (paso final)" },
          { status: 500 }
        )
      }
    }

    // Loggear cada cambio en route_reorder_log
    const logEntries = movedStops.map((m) => ({
      route_id: routeId,
      order_id: m.stop.order_id,
      previous_order: m.previousOrder,
      new_order: m.newOrder,
      reason: reason.trim(),
      changed_by: user.id,
    }))

    const { error: logError } = await supabase
      .from("route_reorder_log")
      .insert(logEntries)

    if (logError) {
      console.error("[reorder-batch] log error:", logError)
      // No fallamos, pero advertimos
    }

    revalidatePath(`/repartidor/routes/${routeId}`)
    revalidatePath(`/admin/routes/${routeId}`)

    return NextResponse.json({
      success: true,
      moved_count: movedStops.length,
    })
  } catch (error) {
    console.error("[reorder-batch] internal error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

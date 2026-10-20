import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * POST /api/admin/routes/[id]/reorder
 *
 * Define el orden DEFINITIVO de entrega de una ruta desde administración.
 * Body: { new_orders: [{order_id, delivery_order}], reason, confirm_in_progress? }
 *
 * Es el equivalente administrativo de /api/repartidor/routes/[id]/reorder-batch:
 * misma tabla y mismo log de auditoría, pero validando rol en vez de dueño de la
 * ruta. El orden definitivo vive en route_orders.delivery_order, del que ya se
 * derivan la pantalla del repartidor, el croquis y el link de Google Maps.
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "administrativo") {
      return NextResponse.json({ error: "Sin permisos para reordenar rutas" }, { status: 403 })
    }

    const body = await request.json()
    const { new_orders, reason, confirm_in_progress } = body as {
      new_orders: Array<{ order_id: string; delivery_order: number }>
      reason: string
      confirm_in_progress?: boolean
    }

    if (!Array.isArray(new_orders) || new_orders.length === 0) {
      return NextResponse.json({ error: "Falta el nuevo orden de paradas" }, { status: 400 })
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "El motivo es obligatorio (mínimo 5 caracteres)" },
        { status: 400 },
      )
    }

    // Posiciones duplicadas dejarían dos paradas en el mismo puesto y el orden
    // definitivo dejaría de ser uno solo.
    const positions = new_orders.map((o) => o.delivery_order)
    if (new Set(positions).size !== positions.length) {
      return NextResponse.json(
        { error: "Hay dos paradas con el mismo número de posición" },
        { status: 400 },
      )
    }

    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select("id, status, route_code")
      .eq("id", routeId)
      .single()

    if (routeError || !route) {
      return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 })
    }

    // 🛡️ Una ruta terminada o cancelada no se toca: su orden ya es historia.
    if (!["PLANIFICADO", "EN_CURSO"].includes(route.status)) {
      return NextResponse.json(
        { error: "Solo se puede reordenar una ruta planificada o en curso" },
        { status: 400 },
      )
    }

    // 🛡️ Con la ruta ya iniciada el repartidor puede estar manejando con el
    // orden viejo en pantalla, así que pedimos confirmación explícita.
    if (route.status === "EN_CURSO" && !confirm_in_progress) {
      return NextResponse.json(
        {
          error:
            "La ruta ya está en curso. Confirmá el cambio para reordenarla: el repartidor va a ver el orden nuevo.",
          requiresConfirmation: true,
        },
        { status: 409 },
      )
    }

    const { data: stops, error: stopsError } = await supabase
      .from("route_orders")
      .select(`
        id,
        order_id,
        delivery_order,
        actual_arrival_time,
        orders ( status, order_number )
      `)
      .eq("route_id", routeId)

    if (stopsError || !stops) {
      return NextResponse.json({ error: "Error al obtener las paradas" }, { status: 500 })
    }

    const isProcessed = (s: any) =>
      s.actual_arrival_time !== null ||
      ["ENTREGADO", "NO_ENTREGADO"].includes(s.orders?.status)

    const stopByOrderId = new Map<string, any>()
    stops.forEach((s) => stopByOrderId.set(s.order_id, s))

    const movedStops: Array<{ stop: any; previousOrder: number; newOrder: number }> = []

    for (const entry of new_orders) {
      const stop = stopByOrderId.get(entry.order_id)
      if (!stop) {
        return NextResponse.json(
          { error: `Un pedido del listado no pertenece a esta ruta` },
          { status: 400 },
        )
      }
      if (entry.delivery_order === stop.delivery_order) continue

      // Una parada ya visitada no se mueve: el orden ejecutado es un hecho.
      if (isProcessed(stop)) {
        return NextResponse.json(
          {
            error: `El pedido ${stop.orders?.order_number ?? ""} ya fue visitado, no se puede cambiar de puesto`,
          },
          { status: 400 },
        )
      }

      movedStops.push({
        stop,
        previousOrder: stop.delivery_order,
        newOrder: entry.delivery_order,
      })
    }

    if (movedStops.length === 0) {
      return NextResponse.json({ error: "No hay cambios en el orden" }, { status: 400 })
    }

    // Dos pasadas: primero a posiciones negativas y después a las definitivas,
    // para no chocar con el orden que todavía tienen las otras paradas.
    for (let i = 0; i < movedStops.length; i++) {
      const { error } = await supabase
        .from("route_orders")
        .update({ delivery_order: -(i + 1) })
        .eq("id", movedStops[i].stop.id)

      if (error) {
        console.error("[admin reorder] error en paso temporal:", error)
        return NextResponse.json({ error: "Error al reordenar (paso temporal)" }, { status: 500 })
      }
    }

    for (const { stop, newOrder } of movedStops) {
      const { error } = await supabase
        .from("route_orders")
        .update({ delivery_order: newOrder })
        .eq("id", stop.id)

      if (error) {
        console.error("[admin reorder] error en paso final:", error)
        return NextResponse.json({ error: "Error al reordenar (paso final)" }, { status: 500 })
      }
    }

    const { error: logError } = await supabase.from("route_reorder_log").insert(
      movedStops.map((m) => ({
        route_id: routeId,
        order_id: m.stop.order_id,
        previous_order: m.previousOrder,
        new_order: m.newOrder,
        reason: reason.trim(),
        changed_by: user.id,
      })),
    )

    if (logError) {
      console.error("[admin reorder] error guardando el log:", logError)
    }

    revalidatePath(`/admin/routes/${routeId}`)
    revalidatePath(`/repartidor/routes/${routeId}`)

    return NextResponse.json({
      success: true,
      moved_count: movedStops.length,
      message: `Orden actualizado: ${movedStops.length} parada(s) cambiaron de puesto`,
    })
  } catch (error) {
    console.error("[admin reorder] error interno:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

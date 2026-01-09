import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDelayedOrdersService } from "@/lib/services/delayedOrdersService"

/**
 * POST /api/admin/orders/reschedule-bulk
 * Reprograma múltiples pedidos a una nueva fecha de entrega
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación y rol
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
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { order_ids, new_delivery_date, reason, increase_priority } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar al menos un pedido" },
        { status: 400 }
      )
    }

    if (!new_delivery_date) {
      return NextResponse.json(
        { error: "La nueva fecha de entrega es requerida" },
        { status: 400 }
      )
    }

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        { error: "El motivo del cambio es requerido" },
        { status: 400 }
      )
    }

    // Validar que la fecha no sea pasada
    const today = new Date().toISOString().split("T")[0]
    if (new_delivery_date < today) {
      return NextResponse.json(
        { error: "La nueva fecha no puede ser anterior a hoy" },
        { status: 400 }
      )
    }

    // Reprogramar pedidos
    const service = createDelayedOrdersService(supabase)
    const result = await service.rescheduleMultipleOrders(
      order_ids,
      new_delivery_date,
      reason.trim(),
      user.id,
      increase_priority || false
    )

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `${order_ids.length} pedidos reprogramados exitosamente`
        : result.error,
      results: result.results,
    })
  } catch (error) {
    console.error("Error bulk rescheduling orders:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}


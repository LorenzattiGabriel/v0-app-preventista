import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDelayedOrdersService } from "@/lib/services/delayedOrdersService"

/**
 * POST /api/admin/orders/[id]/reschedule
 * Reprograma un pedido a una nueva fecha de entrega
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
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
    const { new_delivery_date, reason, increase_priority } = body

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

    // Reprogramar pedido
    const service = createDelayedOrdersService(supabase)
    const result = await service.rescheduleOrder(
      orderId,
      new_delivery_date,
      reason.trim(),
      user.id,
      increase_priority || false
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Pedido reprogramado exitosamente",
      data: result.data,
    })
  } catch (error) {
    console.error("Error rescheduling order:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/orders/[id]/reschedule
 * Obtiene el historial de reprogramaciones de un pedido
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener historial
    const service = createDelayedOrdersService(supabase)
    const history = await service.getOrderRescheduleHistory(orderId)

    return NextResponse.json({
      success: true,
      data: history,
    })
  } catch (error) {
    console.error("Error fetching reschedule history:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}





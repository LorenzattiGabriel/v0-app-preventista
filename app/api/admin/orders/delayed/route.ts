import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDelayedOrdersService } from "@/lib/services/delayedOrdersService"

/**
 * GET /api/admin/orders/delayed
 * Obtiene todos los pedidos retrasados
 */
export async function GET() {
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

    // Obtener pedidos retrasados
    const service = createDelayedOrdersService(supabase)
    const delayedOrders = await service.getDelayedOrders()

    return NextResponse.json({
      success: true,
      data: delayedOrders,
      count: delayedOrders.length,
    })
  } catch (error) {
    console.error("Error fetching delayed orders:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}




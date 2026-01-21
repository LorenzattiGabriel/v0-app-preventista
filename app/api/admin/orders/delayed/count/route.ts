import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDelayedOrdersService } from "@/lib/services/delayedOrdersService"

/**
 * GET /api/admin/orders/delayed/count
 * Obtiene el conteo de pedidos retrasados (para badge en sidebar)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener conteo
    const service = createDelayedOrdersService(supabase)
    const count = await service.getDelayedOrdersCount()

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error counting delayed orders:", error)
    return NextResponse.json({ count: 0 })
  }
}





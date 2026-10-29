import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"
import { revalidatePath } from "next/cache"

const ALLOWED_ROLES = ["repartidor", "administrativo"]

/**
 * POST /api/repartidor/orders/[id]/ensure-payment
 * Body: { route_id?: string }
 *
 * Responde si el cobro de la entrega quedó asentado en la cuenta corriente y,
 * si faltaba, lo completa.
 *
 * Existe porque el guard anti-doble-cobro de la entrega corta cuando el pedido
 * ya está ENTREGADO, y eso dejaba sin salida al caso en que el primer intento
 * se cayó a mitad de camino: el pedido quedaba entregado pero el cobro nunca
 * llegaba al ledger, y el reintento del repartidor no lo arreglaba.
 *
 * Es server-side a propósito: una sola request en vez de varias desde un celular
 * con mala señal, que es justamente lo que provoca el problema.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
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

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    let routeId: string | undefined
    try {
      const body = await request.json()
      routeId = body?.route_id || undefined
    } catch {
      // Sin body: se registra sin ruta asociada
    }

    const accountService = createAccountMovementsService(supabase)
    const result = await accountService.ensureOrderPaymentsRegistered({
      orderId,
      routeId,
      createdBy: user.id,
    })

    if (routeId) {
      revalidatePath(`/repartidor/routes/${routeId}`)
      revalidatePath(`/admin/routes/${routeId}`)
    }

    const messages = {
      ok: "El cobro ya estaba registrado en la cuenta corriente.",
      repaired: `Faltaba registrar $${result.missingAmount.toFixed(2)} del cobro. Ya quedó asentado en la cuenta corriente.`,
      nothing: "Este pedido no tiene cobro registrado en la entrega.",
    } as const

    return NextResponse.json({
      success: true,
      status: result.status,
      missing_amount: result.missingAmount,
      message: messages[result.status],
    })
  } catch (error: any) {
    console.error("[ensure-payment] error:", error)
    return NextResponse.json(
      { error: error.message || "No se pudo verificar el cobro" },
      { status: 500 },
    )
  }
}

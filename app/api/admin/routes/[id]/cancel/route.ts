import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const ALLOWED_ROLES = ["administrativo"]

/**
 * POST /api/admin/routes/[id]/cancel
 * Cancela una ruta (PLANIFICADO o EN_CURSO) y devuelve los pedidos no entregados
 * a PENDIENTE_ENTREGA. Todo de forma atómica vía RPC cancel_route.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { data: revertedCount, error: rpcError } = await supabase.rpc("cancel_route", {
      p_route_id: routeId,
      p_cancelled_by: user.id,
    })

    if (rpcError) {
      console.error("[cancel-route] rpc error:", rpcError)
      return NextResponse.json(
        { error: rpcError.message || "Error al cancelar la ruta" },
        { status: 400 },
      )
    }

    revalidatePath("/admin/routes")
    revalidatePath(`/admin/routes/${routeId}`)
    revalidatePath("/admin/dashboard")

    return NextResponse.json({ success: true, revertedCount: revertedCount ?? 0 })
  } catch (error) {
    console.error("[cancel-route] internal error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const ALLOWED_ROLES = ["administrativo"]

/**
 * POST /api/admin/orders/early-assembly
 * Habilita o deshabilita el armado anticipado de pedidos.
 * Body: { order_ids: string[], allowed: boolean }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { order_ids, allowed } = body

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: "Falta order_ids" }, { status: 400 })
    }
    if (typeof allowed !== "boolean") {
      return NextResponse.json({ error: "Falta el flag allowed" }, { status: 400 })
    }

    const { error } = await supabase
      .from("orders")
      .update({ early_assembly_allowed: allowed })
      .in("id", order_ids)

    if (error) {
      console.error("[early-assembly] Error:", error)
      return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
    }

    revalidatePath("/admin/orders/assign")
    revalidatePath("/armado/dashboard")

    return NextResponse.json({
      success: true,
      updated_count: order_ids.length,
      allowed,
    })
  } catch (error) {
    console.error("[early-assembly] internal error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

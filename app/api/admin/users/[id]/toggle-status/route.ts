import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUsersService } from "@/lib/services/usersService"

/**
 * POST /api/admin/users/[id]/toggle-status
 * Toggle user active status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "administrativo") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  // Prevent self-deactivation
  if (id === user.id) {
    return NextResponse.json(
      { error: "No puedes cambiar el estado de tu propia cuenta" },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { is_active } = body

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "El campo is_active es requerido" },
        { status: 400 }
      )
    }

    const usersService = createUsersService(supabase)
    await usersService.toggleUserStatus(id, is_active)

    return NextResponse.json({
      success: true,
      is_active,
      message: is_active ? "Usuario activado" : "Usuario desactivado",
    })
  } catch (error: any) {
    console.error("Error toggling user status:", error)
    return NextResponse.json(
      { error: error.message || "Error al cambiar estado del usuario" },
      { status: 500 }
    )
  }
}







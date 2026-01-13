import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createUsersService } from "@/lib/services/usersService"

/**
 * GET /api/admin/users/[id]
 * Get user by ID
 */
export async function GET(
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

  try {
    const usersService = createUsersService(supabase)
    const userData = await usersService.getUserById(id)
    return NextResponse.json(userData)
  } catch (error: any) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener usuario" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user (role, status, etc.)
 */
export async function PATCH(
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
  const body = await request.json()
  if (id === user.id && body.is_active === false) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta" },
      { status: 400 }
    )
  }

  // Prevent changing own role
  if (id === user.id && body.role && body.role !== "administrativo") {
    return NextResponse.json(
      { error: "No puedes cambiar tu propio rol" },
      { status: 400 }
    )
  }

  try {
    const usersService = createUsersService(supabase)
    const updatedUser = await usersService.updateUser(id, {
      full_name: body.full_name,
      role: body.role,
      phone: body.phone,
      is_active: body.is_active,
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Usuario actualizado correctamente",
    })
  } catch (error: any) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar usuario" },
      { status: 500 }
    )
  }
}





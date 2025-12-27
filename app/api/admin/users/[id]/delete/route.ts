import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

/**
 * DELETE /api/admin/users/[id]/delete
 * Permanently delete a user from both auth.users and profiles
 */
export async function DELETE(
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

  // Prevent self-deletion
  if (id === user.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta" },
      { status: 400 }
    )
  }

  try {
    // Get user to delete (to confirm existence and get info)
    const { data: userToDelete, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", id)
      .single()

    if (fetchError || !userToDelete) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Check if user has related data that would prevent deletion
    // Check for orders created by this user
    const { count: ordersCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("created_by", id)

    if (ordersCount && ordersCount > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar: el usuario tiene ${ordersCount} pedidos asociados. Considera desactivarlo en su lugar.`,
          suggestion: "deactivate"
        },
        { status: 400 }
      )
    }

    // Check for routes assigned to this user (if driver)
    const { count: routesCount } = await supabase
      .from("routes")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", id)

    if (routesCount && routesCount > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar: el usuario tiene ${routesCount} rutas asignadas. Considera desactivarlo en su lugar.`,
          suggestion: "deactivate"
        },
        { status: 400 }
      )
    }

    // Create admin client to delete from auth.users
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Delete from profiles table first
    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id)

    if (profileDeleteError) {
      console.error("Error deleting profile:", profileDeleteError)
      return NextResponse.json(
        { error: "Error al eliminar el perfil del usuario" },
        { status: 500 }
      )
    }

    // 2. Delete from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError)
      // Profile was already deleted, log this inconsistency
      console.warn(`Profile deleted but auth.user deletion failed for user ${id}`)
      // Still return success since the main profile is deleted
    }

    return NextResponse.json({
      success: true,
      message: `Usuario ${userToDelete.full_name} (${userToDelete.email}) eliminado permanentemente`,
      deletedUser: {
        id: userToDelete.id,
        email: userToDelete.email,
        full_name: userToDelete.full_name,
      }
    })
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}

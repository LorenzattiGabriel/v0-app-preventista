import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

/**
 * POST /api/admin/users/[id]/change-password
 * Change user password (Admin only)
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

  try {
    const body = await request.json()
    const { newPassword } = body

    // Validate password
    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "La nueva contraseña es requerida" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: targetUser, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", id)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Create admin client to update password in auth.users
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

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { password: newPassword }
    )

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Error al cambiar la contraseña" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Contraseña actualizada para ${targetUser.full_name}`,
    })
  } catch (error: any) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: error.message || "Error al cambiar la contraseña" },
      { status: 500 }
    )
  }
}







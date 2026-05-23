import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createExpenseCategoriesService } from "@/lib/services/expenseCategoriesService"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "administrativo") {
    return { error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) }
  }
  return { supabase, user }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error
  const { id } = await params

  try {
    const body = await request.json()
    const service = createExpenseCategoriesService(auth.supabase)
    const category = await service.update(id, body)
    return NextResponse.json({ success: true, category })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar categoría" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error
  const { id } = await params

  try {
    const service = createExpenseCategoriesService(auth.supabase)
    const result = await service.delete(id)
    return NextResponse.json({
      success: true,
      softDeleted: result.softDeleted,
      message: result.softDeleted
        ? "La categoría tiene egresos asociados, se desactivó en lugar de eliminarse"
        : "Categoría eliminada",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar categoría" },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createExpensesService } from "@/lib/services/expensesService"

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error
  const { id } = await params

  const service = createExpensesService(auth.supabase)
  const expense = await service.getExpenseById(id)
  if (!expense) {
    return NextResponse.json({ error: "Egreso no encontrado" }, { status: 404 })
  }
  return NextResponse.json({ expense })
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
    const service = createExpensesService(auth.supabase)
    const expense = await service.update(id, body)
    return NextResponse.json({ success: true, expense })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar egreso" },
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
    const service = createExpensesService(auth.supabase)
    await service.delete(id)
    return NextResponse.json({ success: true, message: "Egreso eliminado" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar egreso" },
      { status: 500 },
    )
  }
}

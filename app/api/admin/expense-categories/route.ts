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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const url = new URL(request.url)
  const onlyActive = url.searchParams.get("active") === "true"

  const service = createExpenseCategoriesService(auth.supabase)
  if (onlyActive) {
    const categories = await service.getActiveCategories()
    return NextResponse.json({ categories })
  }
  const page = parseInt(url.searchParams.get("page") || "1")
  const { categories, total, totalPages } = await service.getCategories(
    {
      search: url.searchParams.get("search") || undefined,
      expense_type: (url.searchParams.get("expense_type") as any) || undefined,
      is_active: url.searchParams.get("is_active") || undefined,
    },
    page,
  )
  return NextResponse.json({ categories, total, totalPages, page })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    if (!body.name || !body.expense_type) {
      return NextResponse.json(
        { error: "Nombre y tipo son obligatorios" },
        { status: 400 },
      )
    }
    const service = createExpenseCategoriesService(auth.supabase)
    const category = await service.create({
      name: body.name,
      description: body.description,
      expense_type: body.expense_type,
      is_active: body.is_active,
    })
    return NextResponse.json({ success: true, category })
  } catch (error: any) {
    console.error("Error creating expense category:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear categoría" },
      { status: 500 },
    )
  }
}

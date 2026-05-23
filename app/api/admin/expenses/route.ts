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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error
  const url = new URL(request.url)

  const service = createExpensesService(auth.supabase)
  const page = parseInt(url.searchParams.get("page") || "1")
  const result = await service.getExpenses(
    {
      search: url.searchParams.get("search") || undefined,
      category_id: url.searchParams.get("category_id") || undefined,
      supplier_id: url.searchParams.get("supplier_id") || undefined,
      payment_method: (url.searchParams.get("payment_method") as any) || undefined,
      expense_type: (url.searchParams.get("expense_type") as any) || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
    },
    page,
  )
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    if (!body.expense_date || !body.description || !body.category_id || body.amount == null) {
      return NextResponse.json(
        { error: "Fecha, descripción, categoría y monto son obligatorios" },
        { status: 400 },
      )
    }
    const service = createExpensesService(auth.supabase)
    const expense = await service.create({
      expense_date: body.expense_date,
      description: body.description,
      category_id: body.category_id,
      supplier_id: body.supplier_id || null,
      amount: body.amount,
      payment_method: body.payment_method || null,
      proof_url: body.proof_url || null,
      notes: body.notes || null,
      created_by: auth.user.id,
    })
    return NextResponse.json({ success: true, expense })
  } catch (error: any) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear egreso" },
      { status: 500 },
    )
  }
}

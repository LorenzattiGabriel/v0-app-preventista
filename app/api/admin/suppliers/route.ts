import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSuppliersService } from "@/lib/services/suppliersService"

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
  const service = createSuppliersService(auth.supabase)

  if (onlyActive) {
    const suppliers = await service.getActiveSuppliers()
    return NextResponse.json({ suppliers })
  }
  const page = parseInt(url.searchParams.get("page") || "1")
  const { suppliers, total, totalPages } = await service.getSuppliers(
    {
      search: url.searchParams.get("search") || undefined,
      is_active: url.searchParams.get("is_active") || undefined,
    },
    page,
  )
  return NextResponse.json({ suppliers, total, totalPages, page })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }
    const service = createSuppliersService(auth.supabase)
    const supplier = await service.create({
      name: body.name.trim(),
      tax_id: body.tax_id,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
      is_active: body.is_active,
    })
    return NextResponse.json({ success: true, supplier })
  } catch (error: any) {
    console.error("Error creating supplier:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear proveedor" },
      { status: 500 },
    )
  }
}

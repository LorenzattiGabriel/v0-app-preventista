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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error
  const { id } = await params

  try {
    const body = await request.json()
    const allowed = [
      "name",
      "tax_id",
      "phone",
      "email",
      "notes",
      "is_active",
      "external_id",
      "fiscal_condition",
      "address",
      "locality",
      "province",
      "mobile",
      "credit_limit",
      "category",
      "siap_concept",
    ] as const
    const patch: Record<string, unknown> = {}
    for (const k of allowed) {
      if (k in body) patch[k] = body[k]
    }
    const service = createSuppliersService(auth.supabase)
    const supplier = await service.update(id, patch)
    return NextResponse.json({ success: true, supplier })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar proveedor" },
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
    const service = createSuppliersService(auth.supabase)
    const result = await service.delete(id)
    return NextResponse.json({
      success: true,
      softDeleted: result.softDeleted,
      message: result.softDeleted
        ? "El proveedor tiene egresos asociados, se desactivó en lugar de eliminarse"
        : "Proveedor eliminado",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar proveedor" },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

/** POST /api/admin/zones — crea una zona */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const name = (body.name || "").trim()
    const description = (body.description || "").trim() || null

    if (!name) {
      return NextResponse.json({ error: "El nombre de la zona es obligatorio" }, { status: 400 })
    }

    // Evita duplicados por mayúsculas/espacios: el nombre es lo único que ve el
    // admin en el desplegable, dos zonas iguales serían indistinguibles.
    const { data: existing } = await auth.supabase
      .from("zones")
      .select("id, name")
      .ilike("name", name)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `Ya existe una zona llamada "${existing[0].name}"` },
        { status: 409 },
      )
    }

    const { data, error } = await auth.supabase
      .from("zones")
      .insert({ name, description, is_active: true })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ zone: data, message: `Zona "${name}" creada` })
  } catch (error: any) {
    console.error("[zones] Error creando zona:", error)
    return NextResponse.json({ error: error.message || "Error al crear la zona" }, { status: 500 })
  }
}

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

/** PATCH /api/admin/zones/[id] — renombra o activa/desactiva */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, any> = {}

    if (body.name !== undefined) {
      const name = (body.name || "").trim()
      if (!name) {
        return NextResponse.json({ error: "El nombre de la zona es obligatorio" }, { status: 400 })
      }

      const { data: existing } = await auth.supabase
        .from("zones")
        .select("id, name")
        .ilike("name", name)
        .neq("id", id)
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: `Ya existe una zona llamada "${existing[0].name}"` },
          { status: 409 },
        )
      }
      updates.name = name
    }

    if (body.description !== undefined) {
      updates.description = (body.description || "").trim() || null
    }

    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from("zones")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ zone: data, message: "Zona actualizada" })
  } catch (error: any) {
    console.error("[zones] Error actualizando zona:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar la zona" }, { status: 500 })
  }
}

/** DELETE /api/admin/zones/[id] — sólo si no tiene clientes asignados */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  try {
    const { id } = await params

    // Borrar una zona en uso dejaría clientes apuntando a nada (o fallaría la
    // FK). Para esos casos está desactivar, que la saca del desplegable sin
    // perder la etiqueta de los clientes que ya la tienen.
    const { count } = await auth.supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("zone_id", id)

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error: `La zona tiene ${count} cliente(s) asignado(s). Desactivala en vez de borrarla: deja de aparecer al cargar clientes pero no se pierde la etiqueta.`,
        },
        { status: 409 },
      )
    }

    const { error } = await auth.supabase.from("zones").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ message: "Zona eliminada" })
  } catch (error: any) {
    console.error("[zones] Error eliminando zona:", error)
    return NextResponse.json({ error: error.message || "Error al eliminar la zona" }, { status: 500 })
  }
}

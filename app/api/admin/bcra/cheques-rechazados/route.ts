import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getChequesRechazados, getEntidadesMap, isValidCuit, BcraApiError } from "@/lib/services/bcraService"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const cuit = request.nextUrl.searchParams.get("cuit") || ""
  if (!isValidCuit(cuit)) {
    return NextResponse.json({ error: "CUIT/CUIL inválido: debe tener 11 dígitos" }, { status: 400 })
  }

  try {
    const [lookup, entidadesMap] = await Promise.all([getChequesRechazados(cuit), getEntidadesMap()])

    if (!lookup.found) {
      return NextResponse.json({ found: false })
    }

    // Enriquecemos con el nombre del banco cuando `entidad` viene como código
    // numérico (el nombre no siempre está en la respuesta de ChequesRechazados).
    const data = {
      ...lookup.data,
      causales: lookup.data.causales.map((c) => ({
        ...c,
        entidades: c.entidades.map((e) => ({
          ...e,
          entidadNombre:
            typeof e.entidad === "number" ? entidadesMap.get(e.entidad) || null : null,
        })),
      })),
    }

    return NextResponse.json({ found: true, data })
  } catch (error) {
    if (error instanceof BcraApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 502 })
    }
    console.error("[bcra/cheques-rechazados] error inesperado:", error)
    return NextResponse.json({ error: "Error interno al consultar el BCRA" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDeudas, isValidCuit, BcraApiError } from "@/lib/services/bcraService"

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
    const lookup = await getDeudas(cuit)
    if (!lookup.found) {
      return NextResponse.json({ found: false })
    }
    return NextResponse.json({ found: true, data: lookup.data })
  } catch (error) {
    if (error instanceof BcraApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 502 })
    }
    console.error("[bcra/deudas] error inesperado:", error)
    return NextResponse.json({ error: "Error interno al consultar el BCRA" }, { status: 500 })
  }
}

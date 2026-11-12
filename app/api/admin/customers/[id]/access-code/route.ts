import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  setCustomerAccessCode,
  revokeCustomerAccess,
  getCustomerPortalStatus,
  MIN_ACCESS_CODE_LENGTH,
} from "@/lib/services/clientPortalService"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) }
  }
  return {}
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  const status = await getCustomerPortalStatus(id)
  return NextResponse.json(status)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === "string" ? body.code.trim() : ""

  if (code.length < MIN_ACCESS_CODE_LENGTH) {
    return NextResponse.json(
      { error: `El código debe tener al menos ${MIN_ACCESS_CODE_LENGTH} caracteres` },
      { status: 400 },
    )
  }

  const result = await setCustomerAccessCode(id, code)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  const result = await revokeCustomerAccess(id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

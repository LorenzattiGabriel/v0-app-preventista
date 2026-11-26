import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDebitNotesService } from "@/lib/services/debitNotesService"

/**
 * Notas de débito: aumentan la deuda del cliente con un motivo documentado
 * (ej: cheque rechazado), opcionalmente vinculadas a un pedido.
 * Solo el rol administrativo puede emitirlas.
 */
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized", status: 401 as const, user: null }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") {
    return { error: "Solo el administrador puede emitir notas de débito", status: 403 as const, user: null }
  }
  return { error: null, status: 200 as const, user }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 })
  }

  if (!body?.customerId) {
    return NextResponse.json({ error: "Falta el cliente" }, { status: 400 })
  }

  const service = createDebitNotesService(supabase)
  const result = await service.create({
    customerId: body.customerId,
    orderId: body.orderId ?? null,
    reason: body.reason,
    amount: Number(body.amount),
    proofUrl: body.proofUrl ?? null,
    notes: body.notes ?? null,
    createdBy: auth.user.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ debitNote: result.debitNote })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const customerId = new URL(request.url).searchParams.get("customerId")
  if (!customerId) {
    return NextResponse.json({ error: "Falta customerId" }, { status: 400 })
  }

  const service = createDebitNotesService(supabase)
  const debitNotes = await service.listByCustomer(customerId)
  return NextResponse.json({ debitNotes })
}

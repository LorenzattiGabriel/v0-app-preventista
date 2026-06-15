import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCreditNotesService } from "@/lib/services/creditNotesService"

/**
 * Notas de crédito / devoluciones.
 * Solo el rol administrativo puede emitirlas, con motivo obligatorio.
 */
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized", status: 401 as const, user: null }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") {
    return { error: "Solo el administrador puede emitir notas de crédito", status: 403 as const, user: null }
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

  const reason = (body?.reason || "").toString().trim()
  if (reason.length < 5) {
    return NextResponse.json({ error: "El motivo es obligatorio (mínimo 5 caracteres)" }, { status: 400 })
  }
  if (!body?.customerId) {
    return NextResponse.json({ error: "Falta el cliente" }, { status: 400 })
  }
  if (!Array.isArray(body?.returnedItems) || body.returnedItems.length === 0) {
    return NextResponse.json({ error: "Debe indicar al menos un producto devuelto" }, { status: 400 })
  }

  const service = createCreditNotesService(supabase)
  const result = await service.create({
    customerId: body.customerId,
    orderId: body.orderId ?? null,
    invoiceType: body.invoiceType ?? null,
    resolutionType: body.resolutionType,
    affectsAccount: !!body.affectsAccount,
    reason,
    authorizedBy: body.authorizedBy,
    notes: body.notes,
    returnedItems: body.returnedItems,
    replacementItems: body.replacementItems ?? [],
    createdBy: auth.user.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ creditNote: result.creditNote })
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

  const service = createCreditNotesService(supabase)
  const creditNotes = await service.listByCustomer(customerId)
  return NextResponse.json({ creditNotes })
}

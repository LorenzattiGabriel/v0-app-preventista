import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "administrativo") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { customerId, direction, amount, reason, password, proofUrl } = body

    if (!customerId || !direction || !amount || !reason || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (direction !== "debit" && direction !== "credit") {
      return NextResponse.json({ error: "Dirección inválida" }, { status: 400 })
    }

    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 })
    }

    if (typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json({ error: "El motivo debe tener al menos 10 caracteres" }, { status: 400 })
    }

    // ── Doble verificación de contraseña ──────────────────────────────────
    // Usamos un cliente Supabase efímero sin persistir sesión ni cookies,
    // así no tocamos la sesión activa del admin en el navegador.
    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { error: pwdError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    })

    if (pwdError) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
    }

    // Cerramos la sesión efímera por las dudas (no comparte cookies con el request,
    // pero la liberamos explícitamente).
    await verifyClient.auth.signOut()

    // ── Validar cliente existente ─────────────────────────────────────────
    const { data: customer, error: custError } = await supabase
      .from("customers")
      .select("id, commercial_name")
      .eq("id", customerId)
      .single()

    if (custError || !customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // ── Registrar el movimiento ───────────────────────────────────────────
    const accountService = createAccountMovementsService(supabase)
    const movementType = direction === "debit" ? "AJUSTE_DEBITO" : "AJUSTE_CREDITO"
    const description = direction === "debit"
      ? `Ajuste manual (débito): ${reason.trim()}`
      : `Ajuste manual (crédito): ${reason.trim()}`

    const movement = await accountService.createMovement({
      customerId,
      movementType,
      description,
      amount: amountNum,
      createdBy: user.id,
      notes: reason.trim(),
      proofUrl: proofUrl || undefined,
    })

    return NextResponse.json({
      success: true,
      movement,
      message: `Ajuste registrado para ${customer.commercial_name}`,
    })
  } catch (error: any) {
    console.error("Error en account-adjustment:", error)
    return NextResponse.json(
      { error: error.message || "Error al registrar el ajuste" },
      { status: 500 }
    )
  }
}

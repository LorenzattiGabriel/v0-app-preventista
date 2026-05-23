import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
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
    const { customerId, direction, amount, reason, confirmText, proofUrl } = body

    if (!customerId || !direction || !amount || !reason || !confirmText) {
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

    if (typeof confirmText !== "string" || confirmText.trim().toUpperCase() !== "CONFIRMAR") {
      return NextResponse.json({ error: 'Debés escribir "CONFIRMAR" para autorizar el ajuste' }, { status: 400 })
    }

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

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "administrativo") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const { paymentScope, orderId, customerId, amount, paymentMethod, notes, proofUrl } = body

    if (!customerId || !amount || !paymentMethod) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }
    if (amount <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 })
    }

    const accountService = createAccountMovementsService(supabase)

    // ── PAGO A CUENTA GENERAL (sin pedido específico) ──────────────────────
    if (paymentScope === "account") {
      const movement = await accountService.recordGeneralPayment({
        customerId,
        amount,
        paymentMethod,
        createdBy: user.id,
        notes,
        proofUrl,
      })
      return NextResponse.json({
        success: true,
        movement,
        message: `Pago a cuenta de $${amount.toFixed(2)} registrado exitosamente`,
      })
    }

    // ── PAGO APLICADO A PEDIDO ESPECÍFICO ──────────────────────────────────
    if (!orderId) {
      return NextResponse.json({ error: "Debe indicar un pedido" }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, total, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }
    if (order.customer_id !== customerId) {
      return NextResponse.json({ error: "El pedido no pertenece a este cliente" }, { status: 400 })
    }

    const payment = await accountService.recordDebtPayment({
      orderId,
      amount,
      paymentMethod,
      createdBy: user.id,
      notes,
      proofUrl,
    })

    return NextResponse.json({
      success: true,
      payment,
      message: `Pago de $${amount.toFixed(2)} registrado para ${order.order_number}`,
    })

  } catch (error: any) {
    console.error("Error registering payment:", error)
    return NextResponse.json(
      { error: error.message || "Error al registrar el pago" },
      { status: 500 }
    )
  }
}

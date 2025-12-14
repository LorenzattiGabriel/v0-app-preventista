import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "administrativo") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, customerId, amount, paymentMethod, notes } = body

    // Validaciones
    if (!orderId || !customerId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0" },
        { status: 400 }
      )
    }

    // Verificar que el pedido existe y pertenece al cliente
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, total, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }

    if (order.customer_id !== customerId) {
      return NextResponse.json(
        { error: "El pedido no pertenece a este cliente" },
        { status: 400 }
      )
    }

    // Registrar el pago usando el servicio
    const accountService = createAccountMovementsService(supabase)
    
    const payment = await accountService.recordDebtPayment({
      orderId,
      amount,
      paymentMethod,
      createdBy: user.id,
      notes,
    })

    return NextResponse.json({
      success: true,
      payment,
      message: `Pago de $${amount.toFixed(2)} registrado exitosamente para ${order.order_number}`,
    })

  } catch (error: any) {
    console.error("Error registering payment:", error)
    return NextResponse.json(
      { error: error.message || "Error al registrar el pago" },
      { status: 500 }
    )
  }
}


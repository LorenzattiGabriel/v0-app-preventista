import { SupabaseClient } from "@supabase/supabase-js"
import type {
  CustomerAccountMovement,
  AccountMovementType,
  OrderPayment,
  RouteCashClosure,
  PaymentMethod
} from "@/lib/types/database"
import { getLocalDateString } from "@/lib/utils/dates"

interface CreateMovementParams {
  customerId: string
  movementType: AccountMovementType
  description: string
  amount: number // Positivo = deuda, se determina por tipo
  orderId?: string
  routeId?: string
  createdBy?: string
  notes?: string
  proofUrl?: string // URL del comprobante (opcional)
}

interface RecordPaymentParams {
  orderId: string
  amount: number
  paymentMethod: PaymentMethod
  routeId?: string
  createdBy?: string
  notes?: string
  proofUrl?: string
}

interface RecordGeneralPaymentParams {
  customerId: string
  amount: number
  paymentMethod: PaymentMethod
  createdBy?: string
  notes?: string
  proofUrl?: string
}

interface UpdateOrderPaymentParams {
  orderId: string
  amountPaid: number
}

interface CreateCashClosureParams {
  routeId: string
  driverId: string
  orders: Array<{
    total: number
    wasCollected: boolean
    collectedAmount: number
    paymentMethod: PaymentMethod
  }>
  notes?: string
}

export class AccountMovementsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Obtiene el saldo actual del cliente
   */
  async getCustomerBalance(customerId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("current_balance")
      .eq("id", customerId)
      .single()

    if (error) throw error
    return data?.current_balance || 0
  }

  /**
   * Crea un movimiento en la cuenta corriente del cliente
   * Actualiza automáticamente el current_balance del cliente
   */
  async createMovement(params: CreateMovementParams): Promise<CustomerAccountMovement> {
    const { customerId, movementType, description, amount, orderId, routeId, createdBy, notes, proofUrl } = params

    // Obtener saldo actual
    const currentBalance = await this.getCustomerBalance(customerId)

    // Determinar si es débito o crédito según el tipo
    const isDebit = ["DEUDA_PEDIDO", "AJUSTE_DEBITO"].includes(movementType)
    const debitAmount = isDebit ? amount : 0
    const creditAmount = isDebit ? 0 : amount
    const balanceAfter = currentBalance + debitAmount - creditAmount

    const { data, error } = await this.supabase
      .from("customer_account_movements")
      .insert({
        customer_id: customerId,
        movement_type: movementType,
        description,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        balance_after: balanceAfter,
        order_id: orderId,
        route_id: routeId,
        created_by: createdBy,
        notes,
        proof_url: proofUrl, // Comprobante de pago (opcional)
      })
      .select()
      .single()

    if (error) throw error
    
    // 🆕 Actualizar el saldo del cliente
    await this.supabase
      .from("customers")
      .update({ current_balance: balanceAfter })
      .eq("id", customerId)

    return data
  }

  /**
   * Registra un pago POSTERIOR de deuda existente
   * Usar cuando el cliente viene a pagar una deuda que ya tiene
   * NO usar para cobros al momento de la entrega (usar updateOrderPayment)
   */
  async recordDebtPayment(params: RecordPaymentParams): Promise<OrderPayment> {
    const { orderId, amount, paymentMethod, routeId, createdBy, notes, proofUrl } = params

    // Obtener info del pedido y cliente
    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .select("id, total, customer_id, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) throw orderError || new Error("Pedido no encontrado")

    // Obtener o crear registro de pago
    let { data: payment } = await this.supabase
      .from("order_payments")
      .select("*")
      .eq("order_id", orderId)
      .single()

    const totalPaid = (payment?.total_paid || 0) + amount
    const balanceDue = order.total - totalPaid

    if (payment) {
      // Actualizar pago existente
      const { data, error } = await this.supabase
        .from("order_payments")
        .update({ total_paid: totalPaid, balance_due: balanceDue, updated_at: new Date().toISOString() })
        .eq("id", payment.id)
        .select()
        .single()

      if (error) throw error
      payment = data
    } else {
      // Crear nuevo registro de pago
      const { data, error } = await this.supabase
        .from("order_payments")
        .insert({
          order_id: orderId,
          order_total: order.total,
          total_paid: totalPaid,
          balance_due: balanceDue,
        })
        .select()
        .single()

      if (error) throw error
      payment = data
    }

    // Registrar movimiento de pago en cuenta corriente
    const paymentMethodLower = paymentMethod.toLowerCase()
    const movementType = paymentMethodLower === "efectivo" ? "PAGO_EFECTIVO" 
      : paymentMethodLower === "transferencia" ? "PAGO_TRANSFERENCIA" 
      : paymentMethodLower === "cheque" ? "PAGO_CHEQUE"
      : "PAGO_TARJETA"

    await this.createMovement({
      customerId: order.customer_id,
      movementType,
      description: `Pago pedido ${order.order_number}`,
      amount,
      orderId,
      routeId,
      createdBy,
      notes,
      proofUrl, // Comprobante de pago (opcional)
    })

    return payment!
  }

  /**
   * Registra un pago a cuenta general sin asociarlo a un pedido específico.
   * Reduce el current_balance del cliente (o genera saldo a favor si balance era 0).
   */
  async recordGeneralPayment(params: RecordGeneralPaymentParams): Promise<CustomerAccountMovement> {
    const { customerId, amount, paymentMethod, createdBy, notes, proofUrl } = params

    const method = paymentMethod.toLowerCase()
    const movementType: AccountMovementType =
      method === "efectivo" ? "PAGO_EFECTIVO"
      : method === "transferencia" ? "PAGO_TRANSFERENCIA"
      : method === "cheque" ? "PAGO_CHEQUE"
      : "PAGO_TARJETA"

    return this.createMovement({
      customerId,
      movementType,
      description: "Pago a cuenta corriente (sin pedido específico)",
      amount,
      orderId: undefined,
      createdBy,
      notes,
      proofUrl,
    })
  }

  /**
   * Actualiza el estado de pago de un pedido (sin afectar cuenta corriente)
   * Usar para cobros al momento de la entrega
   */
  async updateOrderPayment(params: UpdateOrderPaymentParams): Promise<void> {
    const { orderId, amountPaid } = params

    // Obtener info del pedido
    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .select("id, total")
      .eq("id", orderId)
      .single()

    if (orderError || !order) throw orderError || new Error("Pedido no encontrado")

    const balanceDue = order.total - amountPaid

    // Obtener o crear registro de pago
    const { data: existingPayment } = await this.supabase
      .from("order_payments")
      .select("id")
      .eq("order_id", orderId)
      .single()

    if (existingPayment) {
      await this.supabase
        .from("order_payments")
        .update({ 
          total_paid: amountPaid, 
          balance_due: balanceDue, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", existingPayment.id)
    } else {
      await this.supabase
        .from("order_payments")
        .insert({
          order_id: orderId,
          order_total: order.total,
          total_paid: amountPaid,
          balance_due: balanceDue,
        })
    }
  }

  /**
   * Mapea un método de pago al tipo de movimiento de cuenta corriente.
   * Mantiene la misma lógica que recordDebtPayment (Cuenta Corriente / Otro / Tarjetas → PAGO_TARJETA).
   */
  private methodToMovementType(method: PaymentMethod): AccountMovementType {
    const m = method.toLowerCase()
    if (m === "efectivo") return "PAGO_EFECTIVO"
    if (m === "transferencia") return "PAGO_TRANSFERENCIA"
    if (m === "cheque") return "PAGO_CHEQUE"
    return "PAGO_TARJETA"
  }

  /**
   * 🆕 Corrige SOLO la(s) forma(s) de pago de un pedido ya cobrado, sin alterar el monto.
   * Re-categoriza los movimientos PAGO_* del pedido para que reportes/cierre de caja por tipo
   * queden consistentes. NO modifica current_balance porque el total cobrado no cambia.
   *
   * Requiere que la suma de las nuevas líneas sea igual al total ya cobrado (validado en el API).
   */
  async correctOrderPaymentMethods(params: {
    orderId: string
    lines: { method: PaymentMethod; amount: number; transferProofUrl?: string }[]
    createdBy?: string
  }): Promise<void> {
    const { orderId, lines, createdBy } = params

    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .select("id, customer_id, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) throw orderError || new Error("Pedido no encontrado")

    // Movimientos de pago existentes del pedido
    const { data: existing } = await this.supabase
      .from("customer_account_movements")
      .select("*")
      .eq("order_id", orderId)
      .in("movement_type", ["PAGO_EFECTIVO", "PAGO_TRANSFERENCIA", "PAGO_TARJETA", "PAGO_CHEQUE"])
      .order("created_at", { ascending: true })

    // Si no hay movimientos previos (sistema de cuenta no usado en su momento), no hay nada que re-categorizar.
    if (!existing || existing.length === 0) return

    const oldTotal = existing.reduce((sum, m) => sum + Number(m.credit_amount || 0), 0)
    const newTotal = lines.reduce((sum, l) => sum + Number(l.amount || 0), 0)

    if (Math.abs(oldTotal - newTotal) > 0.01) {
      throw new Error(
        `El total de las nuevas formas de pago ($${newTotal.toFixed(2)}) no coincide con el cobro registrado ($${oldTotal.toFixed(2)}).`,
      )
    }

    // Metadatos a preservar del registro original
    const first = existing[0]
    const last = existing[existing.length - 1]
    const origCreatedAt = first.created_at
    const routeId = first.route_id || undefined
    // Saldo luego de aplicar todos los pagos (no cambia: el total cobrado es el mismo)
    const balanceAfter = Number(last.balance_after ?? (await this.getCustomerBalance(order.customer_id)))

    // Borrar los movimientos de pago anteriores
    const ids = existing.map((m) => m.id)
    const { error: deleteError } = await this.supabase
      .from("customer_account_movements")
      .delete()
      .in("id", ids)

    if (deleteError) throw deleteError

    // Insertar movimientos nuevos según las líneas corregidas (el balance neto no cambia)
    const newRows = lines.map((line) => ({
      customer_id: order.customer_id,
      movement_type: this.methodToMovementType(line.method),
      description: `Pago pedido ${order.order_number} (forma de pago corregida)`,
      debit_amount: 0,
      credit_amount: Number(line.amount || 0),
      balance_after: balanceAfter,
      order_id: orderId,
      route_id: routeId,
      created_by: createdBy || first.created_by || undefined,
      created_at: origCreatedAt,
      proof_url: line.method === "Transferencia" ? line.transferProofUrl || null : null,
    }))

    const { error: insertError } = await this.supabase
      .from("customer_account_movements")
      .insert(newRows)

    if (insertError) throw insertError
  }

  /**
   * Genera deuda cuando un pedido no se cobra completamente
   */
  async generateDebt(orderId: string, debtAmount: number, routeId: string, createdBy: string): Promise<void> {
    if (debtAmount <= 0) return

    const { data: order, error } = await this.supabase
      .from("orders")
      .select("customer_id, order_number")
      .eq("id", orderId)
      .single()

    if (error || !order) throw error || new Error("Pedido no encontrado")

    await this.createMovement({
      customerId: order.customer_id,
      movementType: "DEUDA_PEDIDO",
      description: `Saldo pendiente pedido ${order.order_number}`,
      amount: debtAmount,
      orderId,
      routeId,
      createdBy,
    })
  }

  /**
   * 🆕 Genera la deuda del pedido cuando el armador lo confirma
   * Se llama cuando el pedido pasa de EN_ARMADO a PENDIENTE_ENTREGA
   */
  async recordOrderAssembled(orderId: string, orderTotal: number, createdBy: string): Promise<void> {
    if (orderTotal <= 0) return

    const { data: order, error } = await this.supabase
      .from("orders")
      .select("customer_id, order_number, total")
      .eq("id", orderId)
      .single()

    if (error || !order) throw error || new Error("Pedido no encontrado")

    // Usar el total del pedido (ya ajustado por faltantes)
    const amount = orderTotal || order.total

    // 🛡️ Idempotencia: si ya existe una deuda para este pedido, no crear otra.
    // Evita duplicar DEUDA_PEDIDO si el armado se confirma más de una vez.
    const { data: existingDebt } = await this.supabase
      .from("customer_account_movements")
      .select("id")
      .eq("order_id", orderId)
      .eq("movement_type", "DEUDA_PEDIDO")
      .limit(1)

    if (existingDebt && existingDebt.length > 0) {
      console.warn(`[accountMovements] Deuda ya registrada para pedido ${order.order_number}, se omite duplicado.`)
      return
    }

    // Crear movimiento de deuda
    await this.createMovement({
      customerId: order.customer_id,
      movementType: "DEUDA_PEDIDO",
      description: `Pedido armado ${order.order_number}`,
      amount,
      orderId,
    })

    // Crear o actualizar order_payments
    const { data: existingPayment } = await this.supabase
      .from("order_payments")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle()

    if (existingPayment) {
      await this.supabase
        .from("order_payments")
        .update({
          order_total: amount,
          balance_due: amount,
        })
        .eq("order_id", orderId)
    } else {
      await this.supabase
        .from("order_payments")
        .insert({
          order_id: orderId,
          order_total: amount,
          total_paid: 0,
          balance_due: amount,
        })
    }
    // El saldo del cliente ya se actualiza en createMovement()
  }

  /**
   * Obtiene historial de movimientos de un cliente
   */
  async getCustomerMovements(customerId: string, limit = 50): Promise<CustomerAccountMovement[]> {
    const { data, error } = await this.supabase
      .from("customer_account_movements")
      .select("*, orders(order_number)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Obtiene estado de pago de un pedido
   */
  async getOrderPaymentStatus(orderId: string): Promise<OrderPayment | null> {
    const { data, error } = await this.supabase
      .from("order_payments")
      .select("*")
      .eq("order_id", orderId)
      .single()

    if (error && error.code !== "PGRST116") throw error
    return data
  }

  /**
   * Crea cierre de caja de una ruta
   */
  async createCashClosure(params: CreateCashClosureParams): Promise<RouteCashClosure> {
    const { routeId, driverId, orders, notes } = params

    const totalExpected = orders.reduce((sum, o) => sum + o.total, 0)
    const totalCollected = orders.reduce((sum, o) => sum + (o.wasCollected ? o.collectedAmount : 0), 0)
    const ordersDelivered = orders.length
    const ordersCollected = orders.filter(o => o.wasCollected).length

    // Desglose por método de pago
    const cashCollected = orders
      .filter(o => o.wasCollected && o.paymentMethod === "Efectivo")
      .reduce((sum, o) => sum + o.collectedAmount, 0)
    const transferCollected = orders
      .filter(o => o.wasCollected && o.paymentMethod === "Transferencia")
      .reduce((sum, o) => sum + o.collectedAmount, 0)
    const cardCollected = orders
      .filter(o => o.wasCollected && (o.paymentMethod === "Tarjeta de Débito" || o.paymentMethod === "Tarjeta de Crédito"))
      .reduce((sum, o) => sum + o.collectedAmount, 0)

    const { data, error } = await this.supabase
      .from("route_cash_closures")
      .insert({
        route_id: routeId,
        driver_id: driverId,
        total_expected: totalExpected,
        total_collected: totalCollected,
        total_difference: totalExpected - totalCollected,
        total_orders: orders.length,
        orders_delivered: ordersDelivered,
        orders_collected: ordersCollected,
        cash_collected: cashCollected,
        transfer_collected: transferCollected,
        card_collected: cardCollected,
        closure_date: getLocalDateString(),
        notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtiene cierre de caja de una ruta
   */
  async getCashClosure(routeId: string): Promise<RouteCashClosure | null> {
    const { data, error } = await this.supabase
      .from("route_cash_closures")
      .select("*")
      .eq("route_id", routeId)
      .single()

    if (error && error.code !== "PGRST116") throw error
    return data
  }

  /**
   * Obtiene clientes con deuda
   */
  async getCustomersWithDebt(): Promise<Array<{ id: string; commercial_name: string; current_balance: number }>> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id, commercial_name, current_balance")
      .gt("current_balance", 0)
      .order("current_balance", { ascending: false })

    if (error) throw error
    return data || []
  }
}

// Factory function para crear instancia del servicio
export function createAccountMovementsService(supabase: SupabaseClient) {
  return new AccountMovementsService(supabase)
}


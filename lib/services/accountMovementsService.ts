import { SupabaseClient } from "@supabase/supabase-js"
import type { 
  CustomerAccountMovement, 
  AccountMovementType, 
  OrderPayment,
  RouteCashClosure 
} from "@/lib/types/database"
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants/payment-methods"

interface CreateMovementParams {
  customerId: string
  movementType: AccountMovementType
  description: string
  amount: number // Positivo = deuda, se determina por tipo
  orderId?: string
  routeId?: string
  createdBy?: string
  notes?: string
}

interface RecordPaymentParams {
  orderId: string
  amount: number
  paymentMethod: PaymentMethod
  routeId?: string
  createdBy?: string
  notes?: string
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
   */
  async createMovement(params: CreateMovementParams): Promise<CustomerAccountMovement> {
    const { customerId, movementType, description, amount, orderId, routeId, createdBy, notes } = params

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
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Registra un pago POSTERIOR de deuda existente
   * Usar cuando el cliente viene a pagar una deuda que ya tiene
   * NO usar para cobros al momento de la entrega (usar updateOrderPayment)
   */
  async recordDebtPayment(params: RecordPaymentParams): Promise<OrderPayment> {
    const { orderId, amount, paymentMethod, routeId, createdBy, notes } = params

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
    const movementType = paymentMethod === PAYMENT_METHODS.EFECTIVO ? "PAGO_EFECTIVO" 
      : paymentMethod === PAYMENT_METHODS.TRANSFERENCIA ? "PAGO_TRANSFERENCIA" 
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
    })

    return payment!
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

    // Desglose por método de pago (usando constantes)
    const cashCollected = orders
      .filter(o => o.wasCollected && o.paymentMethod === PAYMENT_METHODS.EFECTIVO)
      .reduce((sum, o) => sum + o.collectedAmount, 0)
    const transferCollected = orders
      .filter(o => o.wasCollected && o.paymentMethod === PAYMENT_METHODS.TRANSFERENCIA)
      .reduce((sum, o) => sum + o.collectedAmount, 0)
    const cardCollected = orders
      .filter(o => o.wasCollected && (o.paymentMethod === PAYMENT_METHODS.TARJETA_CREDITO || o.paymentMethod === PAYMENT_METHODS.TARJETA_DEBITO))
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
        closure_date: new Date().toISOString().split("T")[0],
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


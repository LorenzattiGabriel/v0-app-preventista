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

/** Un pedido viejo, ya entregado, que todavía tiene saldo pendiente. */
export interface CollectibleOrder {
  orderId: string
  orderNumber: string
  orderTotal: number
  balanceDue: number
  deliveredAt: string | null
}

/** Lo que el repartidor cobró en una ruta, separado por origen. */
export interface RouteCollectionBreakdown {
  routeCollected: number
  debtCollected: number
  debtPaymentsCount: number
  byMethod: Record<string, number>
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
  /**
   * Recalcula el saldo del cliente sumando TODO el ledger y lo persiste.
   *
   * 🚨 Por qué sumar todo en vez de hacer `saldo += monto`:
   * el saldo se guardaba con un read-modify-write (leer current_balance, sumar,
   * escribir). Si dos movimientos del mismo cliente se creaban casi a la vez
   * (repartidor que toca "Confirmar entrega" dos veces, doble confirmación de
   * armado) los dos leían el mismo saldo previo, calculaban el mismo
   * balance_after y el segundo pisaba al primero: el movimiento quedaba en la
   * lista pero su efecto se perdía del saldo. De ahí salían los saldos que no
   * cierran contra la suma de las boletas (casos RAQUEL VARELA y SUSSI CABRAL).
   *
   * Al derivar el saldo del ledger completo, un movimiento perdido se corrige
   * solo en el siguiente movimiento del cliente.
   */
  async recalculateCustomerBalance(customerId: string): Promise<number> {
    let total = 0
    let from = 0
    const PAGE = 1000

    while (true) {
      const { data, error } = await this.supabase
        .from("customer_account_movements")
        .select("debit_amount, credit_amount")
        .eq("customer_id", customerId)
        .range(from, from + PAGE - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const m of data) {
        total += (Number(m.debit_amount) || 0) - (Number(m.credit_amount) || 0)
      }

      if (data.length < PAGE) break
      from += PAGE
    }

    // Redondeo a 2 decimales: evita arrastrar 99527.44999 por punto flotante
    const balance = Math.round(total * 100) / 100

    const { error: updateError } = await this.supabase
      .from("customers")
      .update({ current_balance: balance })
      .eq("id", customerId)

    if (updateError) throw updateError

    return balance
  }

  async createMovement(params: CreateMovementParams): Promise<CustomerAccountMovement> {
    const { customerId, movementType, description, amount, orderId, routeId, createdBy, notes, proofUrl } = params

    // Determinar si es débito o crédito según el tipo
    const isDebit = ["DEUDA_PEDIDO", "AJUSTE_DEBITO"].includes(movementType)
    const debitAmount = isDebit ? Number(amount) || 0 : 0
    const creditAmount = isDebit ? 0 : Number(amount) || 0

    // Saldo provisorio: se corrige abajo con el recálculo sobre el ledger ya
    // con esta fila adentro.
    const previousBalance = Number(await this.getCustomerBalance(customerId)) || 0
    const provisionalBalance = previousBalance + debitAmount - creditAmount

    const { data, error } = await this.supabase
      .from("customer_account_movements")
      .insert({
        customer_id: customerId,
        movement_type: movementType,
        description,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        balance_after: provisionalBalance,
        order_id: orderId,
        route_id: routeId,
        created_by: createdBy,
        notes,
        proof_url: proofUrl, // Comprobante de pago (opcional)
      })
      .select()
      .single()

    if (error) throw error

    // 🆕 El saldo real sale de sumar el ledger completo (ver comentario en
    // recalculateCustomerBalance), no de incrementar el valor cacheado.
    const balanceAfter = await this.recalculateCustomerBalance(customerId)

    if (balanceAfter !== provisionalBalance) {
      await this.supabase
        .from("customer_account_movements")
        .update({ balance_after: balanceAfter })
        .eq("id", data.id)
    }

    return { ...data, balance_after: balanceAfter }
  }

  /**
   * 🛡️ Red de seguridad: garantiza que el pedido tenga su DEUDA_PEDIDO cargada.
   *
   * La deuda se crea al confirmar el armado. Si ese registro falló (conexión
   * caída del armador, pedido armado por una vía vieja, etc.) el pedido llega a
   * la entrega sin deuda: el cobro posterior genera un "saldo a favor" fantasma
   * y el pedido nunca aparece en la cuenta corriente del cliente.
   *
   * Devuelve true si la deuda faltaba y se creó, false si ya existía.
   * Es idempotente: recordOrderAssembled ya chequea duplicados.
   */
  async ensureOrderDebt(orderId: string, createdBy?: string): Promise<boolean> {
    const { data: existingDebt, error: debtError } = await this.supabase
      .from("customer_account_movements")
      .select("id")
      .eq("order_id", orderId)
      .eq("movement_type", "DEUDA_PEDIDO")
      .limit(1)

    if (debtError) throw debtError
    if (existingDebt && existingDebt.length > 0) return false

    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .select("total, order_number")
      .eq("id", orderId)
      .single()

    if (orderError || !order) throw orderError || new Error("Pedido no encontrado")

    const total = Number(order.total) || 0
    if (total <= 0) return false

    console.warn(
      `[accountMovements] El pedido ${order.order_number} no tenía deuda registrada. Se genera ahora ($${total}).`,
    )
    await this.recordOrderAssembled(orderId, total, createdBy || "")
    return true
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
    const movementType = this.methodToMovementType(paymentMethod)

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

    const movementType = this.methodToMovementType(paymentMethod)

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
   * Cada método tiene su propio tipo: Cuenta Corriente → PAGO_CUENTA_CORRIENTE,
   * Otro/desconocido → PAGO_OTRO. Sólo las tarjetas (débito/crédito) → PAGO_TARJETA.
   */
  private methodToMovementType(method: PaymentMethod): AccountMovementType {
    const m = (method || "").toLowerCase()
    if (m === "efectivo") return "PAGO_EFECTIVO"
    if (m === "transferencia") return "PAGO_TRANSFERENCIA"
    if (m === "cheque") return "PAGO_CHEQUE"
    if (m === "cuenta corriente") return "PAGO_CUENTA_CORRIENTE"
    if (m.startsWith("tarjeta")) return "PAGO_TARJETA"
    return "PAGO_OTRO"
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
      .in("movement_type", ["PAGO_EFECTIVO", "PAGO_TRANSFERENCIA", "PAGO_TARJETA", "PAGO_CHEQUE", "PAGO_CUENTA_CORRIENTE", "PAGO_OTRO"])
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

    // Acá se borran e insertan filas a mano (sin pasar por createMovement), así
    // que resincronizamos el saldo contra el ledger.
    await this.recalculateCustomerBalance(order.customer_id)
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
  /**
   * Pedidos viejos del cliente que el repartidor puede cobrar: ya entregados y
   * con saldo pendiente.
   *
   * ⚠️ El tope es el saldo de cuenta corriente del cliente, NO la suma de los
   * saldos por pedido. Los dos números no coinciden: históricamente los pagos a
   * cuenta y los sobrepagos bajaron el saldo del cliente sin descontar de ningún
   * pedido, así que la suma por pedido está inflada (llegó a mostrar $1,17M de
   * deuda en un cliente cuyo saldo real era $0). Si cobráramos contra esa suma,
   * le cobraríamos de más al cliente en la calle.
   */
  async getCollectibleOrders(
    customerId: string,
    excludeOrderIds: string[] = [],
  ): Promise<{ balance: number; orders: CollectibleOrder[] }> {
    const balance = Number(await this.getCustomerBalance(customerId)) || 0

    // Si según la cuenta corriente no debe nada, no hay nada que cobrar.
    if (balance <= 0.005) return { balance, orders: [] }

    const { data, error } = await this.supabase
      .from("order_payments")
      .select("order_id, order_total, balance_due, orders!inner(id, order_number, status, customer_id, delivered_at)")
      .eq("orders.customer_id", customerId)
      .eq("orders.status", "ENTREGADO")
      .gt("balance_due", 0)
      .order("balance_due", { ascending: false })

    if (error) throw error

    const excluded = new Set(excludeOrderIds)
    const orders: CollectibleOrder[] = (data || [])
      .filter((row: any) => !excluded.has(row.order_id))
      .map((row: any) => ({
        orderId: row.order_id,
        orderNumber: row.orders?.order_number || "",
        orderTotal: Number(row.order_total) || 0,
        balanceDue: Number(row.balance_due) || 0,
        deliveredAt: row.orders?.delivered_at ?? null,
      }))
      .sort((a, b) => (b.deliveredAt || "").localeCompare(a.deliveredAt || ""))

    return { balance, orders }
  }

  /**
   * Reconstruye desde el ledger lo que se cobró en una ruta, separando los
   * pedidos de la ruta de la deuda anterior.
   *
   * No hace falta una tabla nueva: los movimientos de pago ya guardan `route_id`
   * (la ruta en la que se cobraron) y `order_id` (a qué pedido se imputaron).
   * Si el pedido no pertenece a la ruta — o no hay pedido, porque fue un pago a
   * cuenta — entonces es deuda anterior.
   */
  async getRouteCollectionBreakdown(routeId: string): Promise<RouteCollectionBreakdown> {
    const { data: routeOrders, error: roError } = await this.supabase
      .from("route_orders")
      .select("order_id")
      .eq("route_id", routeId)

    if (roError) throw roError
    const routeOrderIds = new Set((routeOrders || []).map((r: any) => r.order_id))

    const { data: movements, error: mError } = await this.supabase
      .from("customer_account_movements")
      .select("order_id, credit_amount, movement_type")
      .eq("route_id", routeId)
      .in("movement_type", [
        "PAGO_EFECTIVO",
        "PAGO_TRANSFERENCIA",
        "PAGO_TARJETA",
        "PAGO_CHEQUE",
        "PAGO_CUENTA_CORRIENTE",
        "PAGO_OTRO",
      ])

    if (mError) throw mError

    const result: RouteCollectionBreakdown = {
      routeCollected: 0,
      debtCollected: 0,
      debtPaymentsCount: 0,
      byMethod: {},
    }

    for (const m of movements || []) {
      const amount = Number(m.credit_amount) || 0
      if (amount <= 0) continue

      const isFromRoute = m.order_id && routeOrderIds.has(m.order_id)
      if (isFromRoute) {
        result.routeCollected += amount
      } else {
        result.debtCollected += amount
        result.debtPaymentsCount += 1
      }

      result.byMethod[m.movement_type] = (result.byMethod[m.movement_type] || 0) + amount
    }

    return result
  }

  async createCashClosure(params: CreateCashClosureParams): Promise<RouteCashClosure> {
    const { routeId, driverId, orders, notes } = params

    const totalExpected = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    const ordersDelivered = orders.length
    const ordersCollected = orders.filter((o) => o.wasCollected).length

    // 🆕 Lo cobrado sale del ledger, no de los pedidos de la ruta.
    //
    // Por qué: (1) el repartidor ahora puede cobrar deuda anterior, que no está
    // en ningún pedido de la ruta pero sí vuelve en su bolsillo; (2) el desglose
    // viejo sólo tenía efectivo/transferencia/tarjeta y usaba el método
    // "principal" de cada pedido, así que con pagos divididos o con Cheque /
    // Cuenta Corriente la plata se contaba en el total pero desaparecía del
    // desglose (5 de los últimos 20 cierres tenían ese agujero).
    const breakdown = await this.getRouteCollectionBreakdown(routeId)

    const routeCollected = breakdown.routeCollected
    const debtCollected = breakdown.debtCollected
    const totalCollected = routeCollected + debtCollected

    const byMethod = breakdown.byMethod

    // Columnas que existen desde siempre
    const basePayload = {
      route_id: routeId,
      driver_id: driverId,
      total_expected: totalExpected,
      // Total a rendir: todo lo que cobró, sea de la ruta o de deuda anterior
      total_collected: totalCollected,
      // La diferencia es lo que quedó fiado DE ESTA RUTA: no puede mezclarse
      // con la deuda anterior cobrada o daría un descuadre falso.
      total_difference: totalExpected - routeCollected,
      total_orders: orders.length,
      orders_delivered: ordersDelivered,
      orders_collected: ordersCollected,
      cash_collected: byMethod["PAGO_EFECTIVO"] || 0,
      transfer_collected: byMethod["PAGO_TRANSFERENCIA"] || 0,
      card_collected: byMethod["PAGO_TARJETA"] || 0,
      closure_date: getLocalDateString(),
      notes,
    }

    // Columnas que agrega add_debt_collection_to_cash_closure.sql
    const extendedPayload = {
      ...basePayload,
      route_collected: routeCollected,
      debt_collected: debtCollected,
      debt_payments_count: breakdown.debtPaymentsCount,
      cheque_collected: byMethod["PAGO_CHEQUE"] || 0,
      account_collected: byMethod["PAGO_CUENTA_CORRIENTE"] || 0,
      other_collected: byMethod["PAGO_OTRO"] || 0,
    }

    const { data, error } = await this.supabase
      .from("route_cash_closures")
      .insert(extendedPayload)
      .select()
      .single()

    if (!error) return data

    // 🛡️ El deploy es automático pero la migración se corre a mano: si el código
    // llega antes que las columnas nuevas, guardamos el cierre con el formato
    // viejo en vez de hacerle explotar el cierre de ruta al repartidor.
    if (error.code === "42703") {
      console.warn(
        "[accountMovements] Faltan las columnas de add_debt_collection_to_cash_closure.sql. " +
          "Se guarda el cierre sin el desglose de deuda anterior — corré la migración.",
      )
      const { data: legacyData, error: legacyError } = await this.supabase
        .from("route_cash_closures")
        .insert(basePayload)
        .select()
        .single()

      if (legacyError) throw legacyError
      return legacyData
    }

    throw error
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


/**
 * Route Calculations Service
 * 
 * Centralized logic for calculating route summaries, totals, and statistics.
 * Single source of truth for payment and delivery calculations.
 */

import type { Order, PaymentMethod, OrderStatus } from '@/lib/types/database'

// =====================================================
// TYPES
// =====================================================

export interface RouteOrderData {
  id: string
  route_id: string
  order_id: string
  delivery_order: number
  actual_arrival_time?: string
  orders: OrderWithCustomer
}

export interface OrderWithCustomer extends Order {
  customers?: {
    id: string
    commercial_name: string
    contact_name?: string
    phone?: string
    street?: string
    street_number?: string
    floor_apt?: string
    locality?: string
    province?: string
  }
  order_items?: Array<{
    id: string
    quantity_requested: number
    products?: {
      name: string
    }
  }>
}

export interface DeliveredOrderSummary {
  orderNumber: string
  customer: string
  orderTotal: number
  collectedAmount: number
  debtAmount: number
  paymentMethod: PaymentMethod | null
  wasCollected: boolean
}

export interface NotDeliveredOrderSummary {
  orderNumber: string
  customer: string
  reason: string | null
  notes: string | null
}

export interface PaymentBreakdown {
  [key: string]: number
}

export interface RouteSummary {
  totalOrders: number
  deliveredCount: number
  notDeliveredCount: number
  pendingCount: number
  totalExpected: number
  totalCollected: number
  difference: number
  cashCollected: number
  transferCollected: number
  cardCollected: number
  chequeCollected: number
  deliveredOrders: DeliveredOrderSummary[]
  notDeliveredOrders: NotDeliveredOrderSummary[]
  paymentBreakdown: PaymentBreakdown
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if an order was collected on delivery
 * Uses orders.was_collected_on_delivery as the single source of truth
 */
export function wasOrderCollected(order: OrderWithCustomer): boolean {
  return order.was_collected_on_delivery === true
}

/**
 * Get the amount paid for an order
 * Uses orders.amount_paid as the single source of truth
 */
export function getOrderAmountPaid(order: OrderWithCustomer): number {
  if (!wasOrderCollected(order)) return 0
  return Number(order.amount_paid) || 0
}

/**
 * Get the payment method for an order
 * Uses orders.payment_method as the single source of truth
 */
export function getOrderPaymentMethod(order: OrderWithCustomer): PaymentMethod | null {
  return order.payment_method || null
}

/**
 * Calculate debt for an order
 */
export function calculateOrderDebt(order: OrderWithCustomer): number {
  const total = Number(order.total) || 0
  const paid = getOrderAmountPaid(order)
  return Math.max(0, total - paid)
}

/**
 * Check if order is delivered
 */
export function isOrderDelivered(order: OrderWithCustomer): boolean {
  return order.status === 'ENTREGADO'
}

/**
 * Check if order has a non-delivery reason (failed delivery attempt)
 */
export function hasNonDeliveryReason(order: OrderWithCustomer): boolean {
  return !isOrderDelivered(order) && !!order.no_delivery_reason
}

/**
 * Check if order is pending (not delivered and no non-delivery reason)
 */
export function isOrderPending(order: OrderWithCustomer): boolean {
  return !isOrderDelivered(order) && !order.no_delivery_reason
}

// =====================================================
// MAIN CALCULATION FUNCTIONS
// =====================================================

/**
 * Build a summary for a single delivered order
 */
export function buildDeliveredOrderSummary(order: OrderWithCustomer): DeliveredOrderSummary {
  const orderTotal = Number(order.total) || 0
  const collectedAmount = getOrderAmountPaid(order)
  
  return {
    orderNumber: order.order_number,
    customer: order.customers?.commercial_name || 'Cliente desconocido',
    orderTotal,
    collectedAmount,
    debtAmount: calculateOrderDebt(order),
    paymentMethod: getOrderPaymentMethod(order),
    wasCollected: wasOrderCollected(order),
  }
}

/**
 * Build a summary for a non-delivered order
 */
export function buildNotDeliveredOrderSummary(order: OrderWithCustomer): NotDeliveredOrderSummary {
  return {
    orderNumber: order.order_number,
    customer: order.customers?.commercial_name || 'Cliente desconocido',
    reason: order.no_delivery_reason || null,
    notes: order.no_delivery_notes || null,
  }
}

/**
 * Calculate payment breakdown by method
 */
export function calculatePaymentBreakdown(deliveredOrders: DeliveredOrderSummary[]): PaymentBreakdown {
  const breakdown: PaymentBreakdown = {}
  
  for (const order of deliveredOrders) {
    if (order.wasCollected && order.collectedAmount > 0 && order.paymentMethod) {
      const method = order.paymentMethod
      breakdown[method] = (breakdown[method] || 0) + order.collectedAmount
    }
  }
  
  return breakdown
}

/**
 * Get amount for a specific payment method from breakdown
 * Handles case variations (Efectivo vs efectivo)
 */
export function getPaymentMethodAmount(
  breakdown: PaymentBreakdown, 
  ...methods: string[]
): number {
  for (const method of methods) {
    if (breakdown[method]) {
      return breakdown[method]
    }
  }
  return 0
}

/**
 * Calculate complete route summary
 * Main function to use from components
 */
export function calculateRouteSummary(routeOrders: RouteOrderData[]): RouteSummary {
  // Extract orders from route_orders
  const orders = routeOrders.map(ro => ro.orders)
  
  // Categorize orders
  const deliveredOrdersList = orders.filter(isOrderDelivered)
  const notDeliveredOrdersList = orders.filter(hasNonDeliveryReason)
  const pendingOrdersList = orders.filter(isOrderPending)
  
  // Build detailed summaries
  const deliveredOrders = deliveredOrdersList.map(buildDeliveredOrderSummary)
  const notDeliveredOrders = notDeliveredOrdersList.map(buildNotDeliveredOrderSummary)
  
  // Calculate totals
  const totalExpected = deliveredOrdersList.reduce(
    (sum, o) => sum + (Number(o.total) || 0), 
    0
  )
  
  const totalCollected = deliveredOrders.reduce(
    (sum, o) => sum + o.collectedAmount, 
    0
  )
  
  // Calculate payment breakdown
  const paymentBreakdown = calculatePaymentBreakdown(deliveredOrders)
  
  return {
    totalOrders: orders.length,
    deliveredCount: deliveredOrdersList.length,
    notDeliveredCount: notDeliveredOrdersList.length,
    pendingCount: pendingOrdersList.length,
    totalExpected,
    totalCollected,
    difference: totalExpected - totalCollected,
    // Payment method totals
    cashCollected: getPaymentMethodAmount(paymentBreakdown, 'Efectivo', 'efectivo'),
    transferCollected: getPaymentMethodAmount(paymentBreakdown, 'Transferencia', 'transferencia'),
    cardCollected: getPaymentMethodAmount(
      paymentBreakdown, 
      'Tarjeta de Débito', 
      'Tarjeta de Crédito', 
      'Tarjeta', 
      'tarjeta'
    ),
    chequeCollected: getPaymentMethodAmount(paymentBreakdown, 'Cheque', 'cheque'),
    // Detailed lists
    deliveredOrders,
    notDeliveredOrders,
    paymentBreakdown,
  }
}

/**
 * Calculate total collected from route_orders (for display in cards/lists)
 * Simplified version for quick calculations
 */
export function calculateRouteCollectedTotal(routeOrders: RouteOrderData[]): number {
  return routeOrders.reduce((sum, ro) => {
    if (isOrderDelivered(ro.orders) && wasOrderCollected(ro.orders)) {
      return sum + getOrderAmountPaid(ro.orders)
    }
    return sum
  }, 0)
}

/**
 * Calculate total expected from route_orders
 */
export function calculateRouteExpectedTotal(routeOrders: RouteOrderData[]): number {
  return routeOrders.reduce((sum, ro) => {
    return sum + (Number(ro.orders?.total) || 0)
  }, 0)
}

/**
 * Calculate total expected from delivered orders only
 */
export function calculateDeliveredExpectedTotal(routeOrders: RouteOrderData[]): number {
  return routeOrders.reduce((sum, ro) => {
    if (isOrderDelivered(ro.orders)) {
      return sum + (Number(ro.orders?.total) || 0)
    }
    return sum
  }, 0)
}

/**
 * Calculate route debt (delivered but not fully paid)
 */
export function calculateRouteDebt(routeOrders: RouteOrderData[]): number {
  const deliveredExpected = calculateDeliveredExpectedTotal(routeOrders)
  const collected = calculateRouteCollectedTotal(routeOrders)
  return Math.max(0, deliveredExpected - collected)
}


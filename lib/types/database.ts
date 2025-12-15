// Database types for TypeScript
export type UserRole = "preventista" | "encargado_armado" | "repartidor" | "cliente" | "administrativo"

export type OrderStatus =
  | "BORRADOR"
  | "PENDIENTE_ARMADO"
  | "EN_ARMADO"
  | "PENDIENTE_ENTREGA"
  | "EN_REPARTICION"
  | "ENTREGADO"
  | "CANCELADO"
  | "ESPERANDO_STOCK"

export type OrderPriority = "baja" | "normal" | "media" | "alta" | "urgente"

export type OrderType = "web" | "presencial" | "telefono" | "whatsapp"

export type CustomerType = "mayorista" | "minorista"

export type IvaCondition = "responsable_inscripto" | "monotributista" | "exento" | "consumidor_final"

export type ShortageReason = "sin_stock" | "producto_danado" | "producto_discontinuado" | "error_pedido" | "otro"

export type RouteStatus = "PLANIFICADO" | "EN_CURSO" | "COMPLETADO" | "CANCELADO"

// Cuenta Corriente Types
export type AccountMovementType =
  | "DEUDA_PEDIDO"
  | "PAGO_EFECTIVO"
  | "PAGO_TRANSFERENCIA"
  | "PAGO_TARJETA"
  | "AJUSTE_CREDITO"
  | "AJUSTE_DEBITO"
  | "NOTA_CREDITO"
  | "PAGO_ADELANTADO"

export type PaymentStatus = "PENDIENTE" | "PAGO_PARCIAL" | "PAGADO" | "VENCIDO"



export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  name: string
  description?: string
  polygon?: any
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  code: string
  commercial_name: string
  contact_name: string
  phone: string
  email?: string
  street: string
  street_number: string
  floor_apt?: string
  locality: string
  province: string
  postal_code?: string
  latitude?: number
  longitude?: number
  legal_name?: string
  tax_id?: string
  customer_type: CustomerType
  iva_condition?: IvaCondition
  credit_days: number
  credit_limit: number
  general_discount: number
  zone_id?: string
  created_by?: string
  observations?: string
  is_active: boolean
  current_balance: number // Saldo cuenta corriente (positivo = deuda)
  // Time Windows (VRPTW)
  has_time_restriction: boolean // Si tiene ventana de tiempo para entregas
  delivery_window_start?: string // Hora inicio (HH:MM)
  delivery_window_end?: string // Hora fin (HH:MM)
  time_restriction_notes?: string // Notas sobre la restricción
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  code: string
  name: string
  brand?: string
  description?: string
  category?: string
  base_price: number
  wholesale_price?: number
  retail_price?: number
  weight?: number
  volume?: number
  current_stock: number
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
  barcode?: string
  iva_aliquot: number
  category_margin: number
  product_margin: number
  location?: string
  supplier?: string
}

export type PaymentMethod = 
  | "Efectivo" 
  | "Transferencia" 
  | "Tarjeta de Débito" 
  | "Tarjeta de Crédito" 
  | "Cuenta Corriente" 
  | "Cheque" 
  | "Otro"

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Efectivo",
  "Transferencia",
  "Tarjeta de Débito",
  "Tarjeta de Crédito",
  "Cuenta Corriente",
  "Cheque",
  "Otro"
]

export interface Order {
  id: string
  order_number: string
  customer_id: string
  order_date: string
  delivery_date: string
  priority: OrderPriority
  order_type: OrderType
  status: OrderStatus
  subtotal: number
  general_discount: number
  total: number
  requires_invoice: boolean
  has_shortages: boolean
  created_by?: string
  assembled_by?: string
  delivered_by?: string
  created_at: string
  assembly_started_at?: string
  assembly_completed_at?: string
  delivery_started_at?: string
  delivered_at?: string
  observations?: string
  assembly_notes?: string
  delivery_notes?: string
  delivery_photo_url?: string // 🆕 Photo evidence of delivery
  received_by_name?: string // 🆕 Name of person who received the order
  no_delivery_reason?: string // 🆕 MEDIUM-2: Reason for non-delivery
  no_delivery_notes?: string // 🆕 MEDIUM-2: Additional notes for non-delivery
  payment_method?: PaymentMethod // Payment method: Efectivo, Transferencia, Tarjeta, etc.
  payment_status: PaymentStatus // Estado de pago del pedido
  // 🆕 Campos de pago normalizados (antes estaban en route_orders)
  amount_paid?: number // Monto pagado al momento de la entrega
  was_collected_on_delivery?: boolean // Si se cobró al momento de la entrega
  transfer_proof_url?: string // URL del comprobante de transferencia bancaria
  // Time Windows (VRPTW) - Restricciones horarias para la entrega
  has_time_restriction: boolean // Si tiene restricción horaria
  delivery_window_start?: string // Hora inicio (HH:MM)
  delivery_window_end?: string // Hora fin (HH:MM)
  time_restriction_notes?: string // Notas sobre la restricción
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity_requested: number
  quantity_assembled?: number
  quantity_delivered?: number
  unit_price: number
  discount: number
  subtotal: number
  is_shortage: boolean
  shortage_reason?: ShortageReason
  shortage_notes?: string
  is_substituted: boolean
  substituted_product_id?: string
  created_at: string
  updated_at: string
}

export interface Route {
  id: string
  route_code: string
  driver_id?: string
  zone_id?: string
  scheduled_date: string
  scheduled_start_time?: string
  scheduled_end_time?: string
  actual_start_time?: string
  actual_end_time?: string
  total_distance?: number
  estimated_duration?: number
  optimized_route?: any
  status: RouteStatus
  created_by?: string
  created_at: string
  updated_at: string
}

export interface RouteOrder {
  id: string
  route_id: string
  order_id: string
  delivery_order: number
  estimated_arrival_time?: string
  actual_arrival_time?: string
  // ⚠️ DEPRECADOS: Estos campos se mantienen por compatibilidad pero ya no se usan
  // Los datos de pago ahora están en orders (amount_paid, was_collected_on_delivery, transfer_proof_url)
  /** @deprecated Usar orders.was_collected_on_delivery */
  was_collected?: boolean
  /** @deprecated Usar orders.amount_paid */
  collected_amount?: number
  /** @deprecated Usar orders.payment_method */
  payment_method?: PaymentMethod
  /** @deprecated Usar orders.transfer_proof_url */
  transfer_proof_url?: string
  created_at: string
}

export interface OrderRating {
  id: string
  order_id: string
  customer_id: string
  rating: number
  comments?: string
  created_at: string
}

// =====================================================
// SISTEMA DE CUENTA CORRIENTE
// =====================================================

export interface CustomerAccountMovement {
  id: string
  customer_id: string
  movement_type: AccountMovementType
  description: string
  debit_amount: number   // Aumenta deuda
  credit_amount: number  // Reduce deuda (pago)
  balance_after: number  // Saldo después del movimiento
  order_id?: string
  route_id?: string
  created_by?: string
  created_at: string
  notes?: string
}

export interface OrderPayment {
  id: string
  order_id: string
  order_total: number
  total_paid: number
  balance_due: number
  payment_status: PaymentStatus
  due_date?: string
  created_at: string
  updated_at: string
}

export interface RouteCashClosure {
  id: string
  route_id: string
  driver_id: string
  total_expected: number
  total_collected: number
  total_difference: number
  total_orders: number
  orders_delivered: number
  orders_collected: number
  cash_collected: number
  transfer_collected: number
  card_collected: number
  closure_date: string
  created_at: string
  is_locked: boolean
  notes?: string
}

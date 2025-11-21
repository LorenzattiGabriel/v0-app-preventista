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
  delivery_code?: string // 🆕 MEDIUM-1: 4-digit code for delivery verification
  no_delivery_reason?: string // 🆕 MEDIUM-2: Reason for non-delivery
  no_delivery_notes?: string // 🆕 MEDIUM-2: Additional notes for non-delivery
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
  was_collected: boolean
  collected_amount?: number
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

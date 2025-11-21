/**
 * Order Status Constants
 * Centralized definitions for order statuses, priorities, and their display properties
 */

export const ORDER_STATUS = {
  BORRADOR: 'BORRADOR',
  PENDIENTE_ARMADO: 'PENDIENTE_ARMADO',
  EN_ARMADO: 'EN_ARMADO',
  PENDIENTE_ENTREGA: 'PENDIENTE_ENTREGA',
  EN_RUTA: 'EN_RUTA',
  EN_REPARTICION: 'EN_REPARTICION',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO',
  ESPERANDO_STOCK: 'ESPERANDO_STOCK',
} as const

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_ARMADO: 'Pendiente de Armado',
  EN_ARMADO: 'En Armado',
  PENDIENTE_ENTREGA: 'Listo para Entrega',
  EN_RUTA: 'En Ruta',
  EN_REPARTICION: 'En Reparto',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  ESPERANDO_STOCK: 'Esperando Stock',
}

export const STATUS_COLORS: Record<OrderStatus, 'secondary' | 'default' | 'destructive'> = {
  BORRADOR: 'secondary',
  PENDIENTE_ARMADO: 'secondary',
  EN_ARMADO: 'default',
  PENDIENTE_ENTREGA: 'default',
  EN_RUTA: 'default',
  EN_REPARTICION: 'default',
  ENTREGADO: 'default',
  CANCELADO: 'destructive',
  ESPERANDO_STOCK: 'destructive',
}

export const ORDER_PRIORITY = {
  NORMAL: 'normal',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const

export type OrderPriority = typeof ORDER_PRIORITY[keyof typeof ORDER_PRIORITY]

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORITY_COLORS: Record<OrderPriority, 'secondary' | 'default' | 'destructive'> = {
  normal: 'secondary',
  alta: 'default',
  urgente: 'destructive',
}

/**
 * Pagination constants
 */
export const ORDERS_PER_PAGE = 10



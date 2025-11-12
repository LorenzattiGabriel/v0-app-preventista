/**
 * Utilidades para filtrar y procesar pedidos
 * Siguiendo principios de clean code: funciones puras, single responsibility
 */

import type { OrderStatus } from "@/lib/types/database"

interface OrderForFiltering {
  id: string
  delivery_date: string
  status: OrderStatus
  customers: {
    zone_id?: string
    latitude?: number | null
    longitude?: number | null
  }
}

/**
 * Filtra pedidos por fecha de entrega
 */
export function filterOrdersByDeliveryDate<T extends OrderForFiltering>(
  orders: T[],
  deliveryDate: string
): T[] {
  if (!deliveryDate) return []
  return orders.filter(order => order.delivery_date === deliveryDate)
}

/**
 * Filtra pedidos por zona
 */
export function filterOrdersByZone<T extends OrderForFiltering>(
  orders: T[],
  zoneId: string
): T[] {
  if (!zoneId) return []
  return orders.filter(order => order.customers.zone_id === zoneId)
}

/**
 * Filtra pedidos por estado
 */
export function filterOrdersByStatus<T extends OrderForFiltering>(
  orders: T[],
  status: OrderStatus
): T[] {
  return orders.filter(order => order.status === status)
}

/**
 * Filtra pedidos que tienen coordenadas válidas
 */
export function filterOrdersWithCoordinates<T extends OrderForFiltering>(
  orders: T[]
): T[] {
  return orders.filter(order => 
    order.customers.latitude != null && 
    order.customers.longitude != null
  )
}

/**
 * Filtra pedidos sin coordenadas
 */
export function filterOrdersWithoutCoordinates<T extends OrderForFiltering>(
  orders: T[]
): T[] {
  return orders.filter(order => 
    order.customers.latitude == null || 
    order.customers.longitude == null
  )
}

/**
 * Obtiene pedidos disponibles para una ruta
 * Aplica todos los filtros necesarios: fecha, zona, estado y coordenadas
 */
export function getAvailableOrdersForRoute<T extends OrderForFiltering>(
  orders: T[],
  params: {
    deliveryDate: string
    zoneId: string
    status?: OrderStatus
  }
): T[] {
  const { deliveryDate, zoneId, status = "PENDIENTE_ENTREGA" } = params

  if (!deliveryDate || !zoneId) {
    return []
  }

  let filteredOrders = orders

  // Aplicar filtros en secuencia
  filteredOrders = filterOrdersByStatus(filteredOrders, status)
  filteredOrders = filterOrdersByDeliveryDate(filteredOrders, deliveryDate)
  filteredOrders = filterOrdersByZone(filteredOrders, zoneId)
  filteredOrders = filterOrdersWithCoordinates(filteredOrders)

  return filteredOrders
}

/**
 * Valida que haya al menos un pedido seleccionado
 */
export function validateOrderSelection(selectedIds: string[]): {
  isValid: boolean
  error?: string
} {
  if (selectedIds.length === 0) {
    return {
      isValid: false,
      error: "Debe seleccionar al menos un pedido"
    }
  }

  return { isValid: true }
}


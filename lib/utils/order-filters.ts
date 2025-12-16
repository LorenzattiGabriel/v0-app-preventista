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
    locality?: string
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
 * Filtra pedidos por localidad del cliente
 */
export function filterOrdersByLocality<T extends OrderForFiltering>(
  orders: T[],
  locality: string
): T[] {
  if (!locality) return []
  return orders.filter(order => 
    order.customers.locality?.toLowerCase() === locality.toLowerCase()
  )
}

/**
 * Obtiene lista única de localidades de los pedidos
 */
export function getUniqueLocalities<T extends OrderForFiltering>(
  orders: T[]
): string[] {
  const localities = orders
    .map(order => order.customers.locality)
    .filter((locality): locality is string => !!locality && locality.trim() !== "")
  
  return [...new Set(localities)].sort((a, b) => a.localeCompare(b, 'es'))
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
 * Filtra pedidos hasta una fecha de entrega (inclusive)
 * Útil para incluir pedidos atrasados (backlog)
 */
export function filterOrdersUpToDate<T extends OrderForFiltering>(
  orders: T[],
  deliveryDate: string
): T[] {
  if (!deliveryDate) return []
  return orders.filter(order => order.delivery_date <= deliveryDate)
}

/**
 * Obtiene pedidos disponibles para una ruta
 * Aplica todos los filtros necesarios: fecha, localidad/zona, estado y coordenadas
 */
export function getAvailableOrdersForRoute<T extends OrderForFiltering>(
  orders: T[],
  params: {
    deliveryDate: string
    zoneId?: string
    locality?: string
    status?: OrderStatus
  }
): T[] {
  const { deliveryDate, zoneId, locality, status = "PENDIENTE_ENTREGA" } = params

  // Si no hay fecha de entrega, no mostrar nada
  if (!deliveryDate) {
    return []
  }

  let filteredOrders = orders

  // Aplicar filtros en secuencia
  filteredOrders = filterOrdersByStatus(filteredOrders, status)
  
  // Lógica de fecha:
  // Si buscamos pendientes, queremos ver los de la fecha seleccionada Y los anteriores (backlog)
  // Si buscamos entregados u otros, queremos ver estrictamente los de esa fecha
  if (status === "PENDIENTE_ENTREGA") {
    filteredOrders = filterOrdersUpToDate(filteredOrders, deliveryDate)
  } else {
    filteredOrders = filterOrdersByDeliveryDate(filteredOrders, deliveryDate)
  }
  
  // Filtrar por localidad (prioridad) o zona
  if (locality && locality !== "" && locality !== "all") {
    filteredOrders = filterOrdersByLocality(filteredOrders, locality)
  } else if (zoneId && zoneId !== "" && zoneId !== "all") {
    filteredOrders = filterOrdersByZone(filteredOrders, zoneId)
  }
  
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


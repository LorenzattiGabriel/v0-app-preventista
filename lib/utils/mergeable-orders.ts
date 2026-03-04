/**
 * Utilidad para detectar pedidos fusionables del mismo cliente.
 * Opera sobre datos ya cargados (función pura, sin queries).
 */

export interface MergeableOrder {
  id: string
  order_number: string
  customer_id: string
  status: string
  priority: string
  delivery_date: string
  total: number
  observations?: string
  created_at: string
  customers?: {
    commercial_name: string
    locality?: string
  }
}

export interface MergeableGroup {
  customer_id: string
  customer_name: string
  customer_locality?: string
  orders: MergeableOrder[]
}

const MERGEABLE_STATUSES = ["BORRADOR", "PENDIENTE_ARMADO"]

/**
 * Agrupa pedidos por customer_id y retorna solo los grupos con 2+ pedidos.
 * Solo considera pedidos en estados pre-armado (BORRADOR, PENDIENTE_ARMADO).
 */
export function findMergeableGroups(orders: MergeableOrder[]): MergeableGroup[] {
  // Filtrar solo pedidos en estados fusionables
  const mergeable = orders.filter((o) => MERGEABLE_STATUSES.includes(o.status))

  // Agrupar por customer_id
  const groups = new Map<string, MergeableOrder[]>()
  for (const order of mergeable) {
    const existing = groups.get(order.customer_id) || []
    existing.push(order)
    groups.set(order.customer_id, existing)
  }

  // Retornar solo grupos con 2+ pedidos
  const result: MergeableGroup[] = []
  for (const [customerId, customerOrders] of groups) {
    if (customerOrders.length >= 2) {
      // Ordenar por created_at ascendente (el más antiguo primero)
      customerOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const firstOrder = customerOrders[0]
      result.push({
        customer_id: customerId,
        customer_name: firstOrder.customers?.commercial_name || "Cliente desconocido",
        customer_locality: firstOrder.customers?.locality,
        orders: customerOrders,
      })
    }
  }

  return result
}

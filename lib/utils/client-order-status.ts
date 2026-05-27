// Labels y colores que ve el cliente final.
// Why: un pedido en EN_REPARTICION puede estar todavía en el depósito (ruta asignada
// pero el repartidor no salió) o efectivamente en la calle. Para el cliente, mostrar
// "En Camino" antes de que el repartidor salga es engañoso, así que distinguimos según
// routes.actual_start_time.

type BadgeVariant = "secondary" | "default" | "destructive" | "outline"

// Forma esperada al hacer:
//   .select("*, route_orders(routes(actual_start_time, status))")
interface OrderWithRouteInfo {
  status: string
  route_orders?: Array<{
    routes?: { actual_start_time?: string | null; status?: string } | null
  }> | null
}

const BASE_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  PENDIENTE_ARMADO: "Pendiente de Armado",
  EN_ARMADO: "En Armado",
  PENDIENTE_ENTREGA: "Listo para Entrega",
  EN_REPARTICION: "En Camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
  ESPERANDO_STOCK: "Esperando Stock",
}

const BASE_COLORS: Record<string, BadgeVariant> = {
  BORRADOR: "secondary",
  PENDIENTE_ARMADO: "secondary",
  EN_ARMADO: "default",
  PENDIENTE_ENTREGA: "default",
  EN_REPARTICION: "default",
  ENTREGADO: "default",
  CANCELADO: "destructive",
  ESPERANDO_STOCK: "destructive",
}

// Devuelve true si alguna ruta asociada al pedido ya inició físicamente.
const isRouteStarted = (order: OrderWithRouteInfo): boolean => {
  const routes = order.route_orders ?? []
  return routes.some(ro => !!ro.routes?.actual_start_time)
}

export const getClientOrderStatusLabel = (order: OrderWithRouteInfo): string => {
  if (order.status === "EN_REPARTICION" && !isRouteStarted(order)) {
    return "Programado para entrega"
  }
  return BASE_LABELS[order.status] ?? order.status
}

export const getClientOrderStatusColor = (order: OrderWithRouteInfo): BadgeVariant => {
  return BASE_COLORS[order.status] ?? "secondary"
}

// Útil cuando el cliente quiere saber si el pedido está literalmente en la calle.
export const isOrderInTransit = (order: OrderWithRouteInfo): boolean =>
  order.status === "EN_REPARTICION" && isRouteStarted(order)

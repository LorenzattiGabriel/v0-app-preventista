"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, Clock, MapPin, Package, Search } from "lucide-react"

type StopFilter = "pendientes" | "entregados" | "todos"

interface RouteStopsListProps {
  orders: any[] // route_orders ordenados por delivery_order, con .orders anidado
  statusLabels: Record<string, string>
}

export function RouteStopsList({ orders, statusLabels }: RouteStopsListProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<StopFilter>("todos")

  // Posición original (secuencia de entrega) por id de route_order, estable ante filtros
  const positionById = useMemo(() => {
    const m = new Map<string, number>()
    orders.forEach((ro, i) => m.set(ro.id, i + 1))
    return m
  }, [orders])

  const counts = useMemo(() => {
    let entregados = 0
    let pendientes = 0
    for (const ro of orders) {
      const o = ro.orders
      if (o.status === "ENTREGADO" || o.no_delivery_reason) entregados++
      else pendientes++
    }
    return { entregados, pendientes, todos: orders.length }
  }, [orders])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((ro) => {
      const o = ro.orders
      const isGestionado = o.status === "ENTREGADO" || !!o.no_delivery_reason
      if (filter === "pendientes" && isGestionado) return false
      if (filter === "entregados" && !isGestionado) return false
      if (!q) return true
      const haystack = [
        o.order_number,
        o.customers?.commercial_name,
        o.customers?.street,
        o.customers?.street_number,
        o.customers?.locality,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [orders, search, filter])

  const filterBtn = (value: StopFilter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
        filter === value ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
      }`}
    >
      {label} ({count})
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por pedido, cliente o dirección..."
          className="pl-9"
        />
      </div>

      {/* Filtro segmentado */}
      <div className="flex rounded-md border overflow-hidden">
        {filterBtn("pendientes", "Por entregar", counts.pendientes)}
        {filterBtn("entregados", "Entregados", counts.entregados)}
        {filterBtn("todos", "Todos", counts.todos)}
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay paradas que coincidan con la búsqueda.
          </p>
        ) : (
          visible.map((routeOrder: any) => {
            const order = routeOrder.orders
            const isDelivered = order.status === "ENTREGADO"
            const isNotDelivered = !!order.no_delivery_reason && !isDelivered
            const collected = order.was_collected_on_delivery ? Number(order.amount_paid || 0) : 0
            const debt = isDelivered ? Number(order.total || 0) - collected : 0
            const position = positionById.get(routeOrder.id)

            return (
              <div
                key={routeOrder.id}
                className={`p-4 border rounded-lg ${
                  isDelivered
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    : isNotDelivered
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                    : "bg-background"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                      isDelivered
                        ? "bg-green-500 text-white"
                        : isNotDelivered
                        ? "bg-red-500 text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isDelivered ? <CheckCircle className="h-5 w-5" /> : isNotDelivered ? "✕" : position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{order.order_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {statusLabels[order.status]}
                      </Badge>
                      {isNotDelivered && (
                        <Badge variant="destructive" className="text-xs">
                          No entregado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{order.customers.commercial_name}</p>
                    <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {order.customers.street} {order.customers.street_number}, {order.customers.locality}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                      <span className="text-muted-foreground">Items: {order.order_items?.length || 0}</span>
                      <span className="font-medium">Total: ${Number(order.total).toFixed(2)}</span>
                    </div>

                    {/* Info de cobro si está entregado */}
                    {isDelivered && (
                      <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800 space-y-1 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-green-700 dark:text-green-400">
                            Cobrado: ${collected.toFixed(2)}
                          </span>
                          {order.payment_method && (
                            <Badge variant="outline" className="text-xs">
                              {order.payment_method}
                            </Badge>
                          )}
                          {debt > 0 && (
                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                              Deuda: ${debt.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {order.received_by_name && (
                          <p className="text-muted-foreground">
                            Recibido por: <span className="font-medium text-foreground">{order.received_by_name}</span>
                          </p>
                        )}
                        {order.delivered_at && (
                          <p className="text-muted-foreground">
                            {new Date(order.delivered_at).toLocaleString("es-AR")}
                          </p>
                        )}
                        {order.delivery_photo_url && (
                          <a
                            href={order.delivery_photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-block"
                          >
                            📸 Ver foto de entrega
                          </a>
                        )}
                      </div>
                    )}

                    {/* Info de no entrega */}
                    {isNotDelivered && (
                      <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800 space-y-1 text-xs">
                        <p className="font-medium text-red-700 dark:text-red-400">
                          Motivo: {order.no_delivery_reason?.replace(/_/g, " ")}
                        </p>
                        {order.no_delivery_notes && (
                          <p className="text-muted-foreground italic">"{order.no_delivery_notes}"</p>
                        )}
                        {order.no_delivery_photo_url && (
                          <a
                            href={order.no_delivery_photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-block"
                          >
                            📸 Ver foto evidencia
                          </a>
                        )}
                      </div>
                    )}

                    {routeOrder.estimated_arrival_time && !isDelivered && !isNotDelivered && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        Llegada estimada:{" "}
                        {new Date(routeOrder.estimated_arrival_time).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/orders/${order.id}`}>Ver</Link>
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

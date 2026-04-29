import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Package,
  Clock,
  Calendar,
  User,
  Navigation,
  CheckCircle,
  Truck,
} from "lucide-react"
import { RouteMapView } from "@/components/admin/route-map-view"

export default async function AdminRouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/auth/login")
  }

  // Get route with all details
  const { data: route } = await supabase
    .from("routes")
    .select(
      `
      *,
      zones (
        name
      ),
      profiles:driver_id (
        full_name,
        email,
        phone
      ),
      route_orders (
        *,
        orders (
          *,
          customers (
            *
          ),
          order_items (
            id,
            quantity_requested
          )
        )
      )
    `,
    )
    .eq("id", id)
    .single()

  if (!route) {
    redirect("/admin/routes")
  }

  // Sort orders by current (executed) delivery sequence
  const sortedOrders = [...(route.route_orders || [])].sort((a, b) => a.delivery_order - b.delivery_order)

  // Build planned order map from optimized_route snapshot (original microservice order)
  const plannedOrderMap = new Map<string, number>()
  const plannedOrders: Array<{ id: string; order_number: string; customer_name: string }> = []
  if (route.optimized_route?.orders && Array.isArray(route.optimized_route.orders)) {
    route.optimized_route.orders.forEach((o: any, idx: number) => {
      plannedOrderMap.set(o.id, idx + 1)
      plannedOrders.push({ id: o.id, order_number: o.order_number, customer_name: o.customer_name })
    })
  }
  const routeWasReordered = sortedOrders.some((ro: any) => {
    const planned = plannedOrderMap.get(ro.order_id)
    return planned !== undefined && planned !== ro.delivery_order
  })

  // 🆕 Historial de cambios manuales del orden de la ruta
  const { data: reorderLog } = await supabase
    .from("route_reorder_log")
    .select(
      `
      id,
      previous_order,
      new_order,
      reason,
      changed_at,
      orders (
        order_number,
        customers ( commercial_name )
      ),
      changed_by:profiles!route_reorder_log_changed_by_fkey (
        full_name
      )
    `
    )
    .eq("route_id", id)
    .order("changed_at", { ascending: true })

  const statusLabels = {
    PLANIFICADO: "Planificado",
    EN_CURSO: "En Curso",
    COMPLETADO: "Completado",
    CANCELADO: "Cancelado",
  } as const

  const statusColors = {
    PLANIFICADO: "secondary",
    EN_CURSO: "default",
    COMPLETADO: "default",
    CANCELADO: "destructive",
  } as const

  const orderStatusLabels = {
    BORRADOR: "Borrador",
    PENDIENTE_ARMADO: "Pendiente Armado",
    EN_ARMADO: "En Armado",
    PENDIENTE_ENTREGA: "Pendiente Entrega",
    EN_RUTA: "En Ruta",
    EN_REPARTICION: "En Reparto",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
    ESPERANDO_STOCK: "Esperando Stock",
  } as const

  // Calculate stats
  const totalOrders = sortedOrders.length
  const deliveredOrders = sortedOrders.filter((ro: any) => ro.orders.status === "ENTREGADO").length
  const totalValue = sortedOrders.reduce((sum: number, ro: any) => sum + parseFloat(ro.orders.total), 0)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Detalle de Ruta</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <form action="/auth/logout" method="post">
              <Button variant="outline" size="sm">
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/routes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Rutas
              </Link>
            </Button>
          </div>

          {/* Route Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{route.route_code}</CardTitle>
                  <CardDescription>
                    Creada el {new Date(route.created_at).toLocaleDateString("es-AR")}
                  </CardDescription>
                </div>
                <Badge variant={statusColors[route.status as keyof typeof statusColors]} className="text-base px-3 py-1">
                  {statusLabels[route.status as keyof typeof statusLabels]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Fecha Programada:</span>
                  </div>
                  <p>{new Date(route.scheduled_date).toLocaleDateString("es-AR")}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Horario:</span>
                  </div>
                  <p>
                    {route.scheduled_start_time} - {route.scheduled_end_time}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Repartidor:</span>
                  </div>
                  <p>{route.profiles?.full_name || "No asignado"}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Zona:</span>
                  </div>
                  <p>{route.zones?.name || "Sin zona"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Paradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">Pedidos en ruta</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Entregados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {deliveredOrders}
                  <span className="text-sm text-muted-foreground">/{totalOrders}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0}% completado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distancia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{route.total_distance?.toFixed(1) || 0} km</div>
                <p className="text-xs text-muted-foreground">Total estimado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Suma de pedidos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Map */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Mapa de la Ruta
                </CardTitle>
                <CardDescription>Visualización de las paradas en el mapa</CardDescription>
              </CardHeader>
              <CardContent>
                <RouteMapView route={route} orders={sortedOrders} />
              </CardContent>
            </Card>

            {/* Orders List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Paradas ({sortedOrders.length})
                </CardTitle>
                <CardDescription>Orden de entrega programado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {sortedOrders.map((routeOrder: any, index: number) => {
                    const order = routeOrder.orders
                    const isDelivered = order.status === "ENTREGADO"

                    return (
                      <div
                        key={routeOrder.id}
                        className={`p-4 border rounded-lg ${isDelivered ? "bg-green-50 border-green-200" : "bg-background"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                              isDelivered
                                ? "bg-green-500 text-white"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isDelivered ? <CheckCircle className="h-5 w-5" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{order.order_number}</span>
                              <Badge variant="outline" className="text-xs">
                                {orderStatusLabels[order.status as keyof typeof orderStatusLabels]}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{order.customers.commercial_name}</p>
                            <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>
                                {order.customers.street} {order.customers.street_number},{" "}
                                {order.customers.locality}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="text-muted-foreground">
                                Items: {order.order_items?.length || 0}
                              </span>
                              <span className="font-medium">Total: ${order.total}</span>
                            </div>
                            {routeOrder.estimated_arrival_time && (
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
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Driver Info */}
          {route.profiles && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Información del Repartidor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Nombre:</span>
                    <p className="text-muted-foreground">{route.profiles.full_name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>
                    <p className="text-muted-foreground">{route.profiles.email}</p>
                  </div>
                  <div>
                    <span className="font-medium">Teléfono:</span>
                    <p className="text-muted-foreground">{route.profiles.phone || "No disponible"}</p>
                  </div>
                </div>
                {route.actual_start_time && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="font-medium">Inicio Real:</span>
                        <p className="text-muted-foreground">
                          {new Date(route.actual_start_time).toLocaleString("es-AR")}
                        </p>
                      </div>
                      {route.actual_end_time && (
                        <div>
                          <span className="font-medium">Fin Real:</span>
                          <p className="text-muted-foreground">
                            {new Date(route.actual_end_time).toLocaleString("es-AR")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comparación ruta planificada vs ejecutada */}
          {plannedOrderMap.size > 0 && (route.status === "EN_CURSO" || route.status === "COMPLETADO") && (
            <Card className={routeWasReordered ? "border-blue-200 bg-blue-50/30 dark:bg-blue-950/10" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Ruta Planificada vs Ejecutada
                </CardTitle>
                {routeWasReordered ? (
                  <CardDescription>El repartidor modificó el orden original. Se muestran las diferencias.</CardDescription>
                ) : (
                  <CardDescription>El repartidor siguió el orden planificado sin modificaciones.</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedOrders.map((ro: any) => {
                    const order = ro.orders
                    const plannedPos = plannedOrderMap.get(ro.order_id)
                    const executedPos = ro.delivery_order
                    const moved = plannedPos !== undefined && plannedPos !== executedPos
                    return (
                      <div key={ro.id} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${moved ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-background"}`}>
                        <div className="flex items-center gap-2 shrink-0">
                          {plannedPos !== undefined ? (
                            <span className="text-muted-foreground w-6 text-right">{plannedPos}</span>
                          ) : (
                            <span className="text-muted-foreground w-6 text-right">—</span>
                          )}
                          {moved && (
                            <>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-semibold text-amber-700 dark:text-amber-400 w-6">{executedPos}</span>
                            </>
                          )}
                          {!moved && <span className="text-muted-foreground w-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{order.order_number}</span>
                          <span className="text-muted-foreground ml-2">{order.customers.commercial_name}</span>
                        </div>
                        {moved && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">Reordenado</span>
                        )}
                        {order.status === "ENTREGADO" && (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 🆕 Historial de cambios manuales del orden de la ruta */}
          {reorderLog && reorderLog.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  ⚡ Cambios manuales del orden ({reorderLog.length})
                </CardTitle>
                <CardDescription>
                  El repartidor reordenó la ruta original en estos momentos. Mostramos lo entregado vs lo propuesto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {reorderLog.map((entry: any) => {
                    const order = Array.isArray(entry.orders) ? entry.orders[0] : entry.orders
                    const changedBy = Array.isArray(entry.changed_by)
                      ? entry.changed_by[0]
                      : entry.changed_by
                    const customer = Array.isArray(order?.customers)
                      ? order.customers[0]
                      : order?.customers
                    return (
                      <li
                        key={entry.id}
                        className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 rounded-lg border bg-background"
                      >
                        <div className="text-xs text-muted-foreground sm:w-40 shrink-0">
                          {new Date(entry.changed_at).toLocaleString("es-AR")}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="outline" className="font-mono">
                              {order?.order_number}
                            </Badge>
                            <span className="text-muted-foreground">
                              {customer?.commercial_name || "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              · Posición {entry.previous_order} → {entry.new_order}
                            </span>
                          </div>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Motivo:</span> {entry.reason}
                          </p>
                          {changedBy?.full_name && (
                            <p className="text-xs text-muted-foreground">
                              Por: {changedBy.full_name}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}


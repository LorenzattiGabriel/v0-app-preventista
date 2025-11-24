import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ArrowLeft,
  Truck,
  Package,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Calendar,
  Star,
  History,
} from "lucide-react"
import { CancelOrderButton } from "@/components/admin/cancel-order-button"

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Get order with all details
  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      *,
      customers (
        *,
        zones (
          name
        )
      ),
      order_items (
        *,
        products:product_id (
          *
        )
      ),
      created_profile:profiles!orders_created_by_fkey (
        full_name,
        email,
        role
      ),
      assembled_profile:profiles!orders_assembled_by_fkey (
        full_name,
        email
      ),
      delivered_profile:profiles!orders_delivered_by_fkey (
        full_name,
        email
      )
    `,
    )
    .eq("id", id)
    .single()

  if (!order) {
    redirect("/admin/orders")
  }

  // Get order history
  const { data: history } = await supabase
    .from("order_history")
    .select(
      `
      *,
      profiles (
        full_name,
        role
      )
    `,
    )
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })

  // Get rating if exists
  const { data: rating } = await supabase.from("order_ratings").select("*").eq("order_id", order.id).single()

  // Get route if exists
  const { data: routeOrder } = await supabase
    .from("route_orders")
    .select(
      `
      *,
      routes (
        *,
        profiles (
          full_name,
          email
        )
      )
    `,
    )
    .eq("order_id", order.id)
    .single()

  const statusLabels = {
    BORRADOR: "Borrador",
    PENDIENTE_ARMADO: "Pendiente de Armado",
    EN_ARMADO: "En Armado",
    PENDIENTE_ENTREGA: "Listo para Entrega",
    EN_RUTA: "En Ruta",
    EN_REPARTICION: "En Reparto",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
    ESPERANDO_STOCK: "Esperando Stock",
  } as const

  const statusColors = {
    BORRADOR: "secondary",
    PENDIENTE_ARMADO: "secondary",
    EN_ARMADO: "default",
    PENDIENTE_ENTREGA: "default",
    EN_RUTA: "default",
    EN_REPARTICION: "default",
    ENTREGADO: "default",
    CANCELADO: "destructive",
    ESPERANDO_STOCK: "destructive",
  } as const

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDIENTE_ARMADO":
      case "EN_ARMADO":
        return <Package className="h-5 w-5" />
      case "PENDIENTE_ENTREGA":
        return <Clock className="h-5 w-5" />
      case "EN_RUTA":
      case "EN_REPARTICION":
        return <Truck className="h-5 w-5" />
      case "ENTREGADO":
        return <CheckCircle className="h-5 w-5" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Detalle del Pedido - Admin</h1>
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
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Pedidos
              </Link>
            </Button>
            
            {/* Cancel Order Button */}
            <CancelOrderButton
              orderId={order.id}
              orderNumber={order.order_number}
              status={order.status}
              wasAssembled={["PENDIENTE_ENTREGA", "EN_RUTA", "EN_REPARTICION"].includes(order.status)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{order.order_number}</CardTitle>
                      <CardDescription>
                        Pedido realizado el {new Date(order.order_date).toLocaleDateString("es-AR")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <Badge
                        variant={statusColors[order.status as keyof typeof statusColors]}
                        className="text-base px-3 py-1"
                      >
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Fecha de Entrega:</span>
                      </div>
                      <p>{new Date(order.delivery_date).toLocaleDateString("es-AR")}</p>
                    </div>
                    <div>
                      <span className="font-medium">Prioridad:</span>
                      <p className="capitalize">{order.priority}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tipo de Pedido:</span>
                      <p className="capitalize">{order.order_type}</p>
                    </div>
                    <div>
                      <span className="font-medium">Requiere Factura:</span>
                      <p>{order.requires_invoice ? "Sí" : "No"}</p>
                    </div>
                  </div>

                  {order.has_shortages && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="font-medium text-yellow-900">Este pedido tiene productos faltantes</p>
                      <p className="text-sm text-yellow-700">
                        Algunos productos no estaban disponibles al momento del armado
                      </p>
                    </div>
                  )}

                  {order.observations && (
                    <div>
                      <span className="font-medium">Observaciones:</span>
                      <p className="text-muted-foreground mt-1">{order.observations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 🆕 Delivery Evidence (Photo + Name) */}
              {order.status === "ENTREGADO" && order.delivery_photo_url && order.received_by_name && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Evidencia de Entrega
                    </CardTitle>
                    <CardDescription>Foto y datos de quien recibió el pedido</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="space-y-3">
                        {/* Received By Name */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-300 dark:border-green-700">
                          <p className="text-xs font-medium text-muted-foreground">Recibido por:</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {order.received_by_name}
                          </p>
                        </div>

                        {/* Delivery Photo */}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Foto de entrega:</p>
                          <img
                            src={order.delivery_photo_url}
                            alt="Evidencia de entrega"
                            className="w-full rounded-lg border-2 border-green-300 dark:border-green-700"
                          />
                        </div>

                        {/* Delivery Date/Time */}
                        {order.delivered_at && (
                          <div className="text-xs text-green-700 dark:text-green-300 text-center pt-2 border-t border-green-200 dark:border-green-800">
                            Entregado el {new Date(order.delivered_at).toLocaleDateString("es-AR")} a las{" "}
                            {new Date(order.delivered_at).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {order.delivery_notes && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Notas de entrega:</p>
                        <p>{order.delivery_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos</CardTitle>
                  <CardDescription>Detalle de los productos del pedido</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Producto</th>
                          <th className="text-right p-3 text-sm font-medium">Solicitado</th>
                          <th className="text-right p-3 text-sm font-medium">Armado</th>
                          <th className="text-right p-3 text-sm font-medium">Precio Unit.</th>
                          <th className="text-right p-3 text-sm font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.order_items.map((item: any) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">
                                  {item.products.name} {item.products.brand && `- ${item.products.brand}`}
                                </p>
                                <p className="text-xs text-muted-foreground">{item.products.code}</p>
                                {item.is_shortage && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 bg-yellow-50 text-yellow-700 border-yellow-200"
                                  >
                                    Faltante
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right">{item.quantity_requested}</td>
                            <td className="p-3 text-right">
                              {item.quantity_assembled !== null ? (
                                <span className={item.quantity_assembled < item.quantity_requested ? "text-yellow-600" : ""}>
                                  {item.quantity_assembled}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                            <td className="p-3 text-right font-medium">${item.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t bg-muted/50">
                        <tr>
                          <td colSpan={4} className="p-3 text-right font-medium">
                            Subtotal:
                          </td>
                          <td className="p-3 text-right font-medium">${order.subtotal.toFixed(2)}</td>
                        </tr>
                        {order.general_discount > 0 && (
                          <tr>
                            <td colSpan={4} className="p-3 text-right font-medium">
                              Descuento:
                            </td>
                            <td className="p-3 text-right font-medium text-destructive">
                              -${order.general_discount.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        <tr className="border-t">
                          <td colSpan={4} className="p-3 text-right font-bold text-lg">
                            Total:
                          </td>
                          <td className="p-3 text-right font-bold text-lg">${order.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial de Cambios
                  </CardTitle>
                  <CardDescription>Timeline completo del pedido</CardDescription>
                </CardHeader>
                <CardContent>
                  {history && history.length > 0 ? (
                    <div className="space-y-4">
                      {history.map((h: any, i: number) => (
                        <div key={h.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            {i < history.length - 1 && <div className="flex-1 w-px bg-border my-1" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{h.previous_status || "NUEVO"}</Badge>
                              <span className="text-muted-foreground">→</span>
                              <Badge>{h.new_status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(h.created_at).toLocaleString("es-AR")}
                            </p>
                            <p className="text-sm">
                              Por: {h.profiles?.full_name} ({h.profiles?.role})
                            </p>
                            {h.change_reason && <p className="text-sm text-muted-foreground mt-1">{h.change_reason}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Sin historial</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">{order.customers.commercial_name}</p>
                    <p className="text-muted-foreground">{order.customers.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Código: {order.customers.code}</p>
                    <p className="text-muted-foreground">Tipo: {order.customers.customer_type}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p>
                        {order.customers.street} {order.customers.street_number}
                      </p>
                      <p className="text-muted-foreground">
                        {order.customers.locality}, {order.customers.province}
                      </p>
                      {order.customers.zones && (
                        <p className="text-xs text-muted-foreground mt-1">Zona: {order.customers.zones.name}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tel: {order.customers.phone}</p>
                    {order.customers.email && <p className="text-muted-foreground">Email: {order.customers.email}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Created By */}
              {order.created_profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Creado Por</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{order.created_profile.full_name}</p>
                    <p className="text-muted-foreground capitalize">{order.created_profile.role}</p>
                    <p className="text-xs text-muted-foreground">{order.created_profile.email}</p>
                  </CardContent>
                </Card>
              )}

              {/* Assembled By */}
              {order.assembled_profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Armado Por</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{order.assembled_profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">{order.assembled_profile.email}</p>
                    {order.assembly_completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Completado: {new Date(order.assembly_completed_at).toLocaleString("es-AR")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Route Info */}
              {routeOrder && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Truck className="h-4 w-4" />
                      Ruta Asignada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>
                      <p className="font-medium">{routeOrder.routes.route_code}</p>
                      <Badge variant="outline" className="mt-1">
                        {routeOrder.routes.status}
                      </Badge>
                    </div>
                    {routeOrder.routes.profiles && (
                      <div>
                        <p className="text-muted-foreground text-xs">Repartidor:</p>
                        <p className="font-medium">{routeOrder.routes.profiles.full_name}</p>
                      </div>
                    )}
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/admin/routes/${routeOrder.routes.id}`}>Ver Ruta Completa</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Delivered By */}
              {order.delivered_profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="h-4 w-4" />
                      Entregado Por
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{order.delivered_profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">{order.delivered_profile.email}</p>
                    {order.delivered_at && (
                      <p className="text-xs text-muted-foreground">
                        Entregado: {new Date(order.delivered_at).toLocaleString("es-AR")}
                      </p>
                    )}
                    {order.payment_collected && (
                      <p className="text-xs">Cobrado: ${order.payment_amount?.toFixed(2) || order.total.toFixed(2)}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Rating */}
              {rating && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Star className="h-4 w-4" />
                      Calificaciones del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {/* Order Rating */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Calificación del Pedido:</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= rating.rating ? "text-yellow-500" : "text-gray-300"}
                          >
                            ★
                          </span>
                        ))}
                        <span className="ml-2 font-medium">{rating.rating}/5</span>
                      </div>
                      {rating.comments && (
                        <div className="bg-muted p-2 rounded text-sm mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Comentarios sobre el pedido:</p>
                          <p>{rating.comments}</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3"></div>

                    {/* Driver Rating */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Calificación del Repartidor:</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= rating.driver_rating ? "text-blue-500" : "text-gray-300"}
                          >
                            ★
                          </span>
                        ))}
                        <span className="ml-2 font-medium">{rating.driver_rating}/5</span>
                      </div>
                      {rating.driver_comments && (
                        <div className="bg-muted p-2 rounded text-sm mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Comentarios sobre el repartidor:</p>
                          <p>{rating.driver_comments}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t">
                      <p className="font-medium text-center">
                        Promedio General: {((rating.rating + rating.driver_rating) / 2).toFixed(1)} ⭐
                      </p>
                    </div>
                    
                    <div className="pt-2 text-xs text-muted-foreground text-center">
                      Calificado el {new Date(rating.created_at).toLocaleDateString("es-AR")} a las{" "}
                      {new Date(rating.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


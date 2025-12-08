import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MapPin, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { ReceiptButton } from "@/components/repartidor/receipt-button"
import { ShareButtons } from "@/components/repartidor/share-buttons"

export default async function RepartidorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "repartidor") {
    redirect("/auth/login")
  }

  // Get order details through route_orders using the specific route_order_id
  const { data: routeOrder } = await supabase
    .from("route_orders")
    .select(
      `
      *,
      routes!inner (
        id,
        driver_id,
        scheduled_date,
        status
      ),
      orders!inner (
        *,
        customers (
          *
        ),
        order_items (
          *,
          products:product_id (
            *
          )
        )
      )
    `,
    )
    .eq("id", id)
    .eq("routes.driver_id", user.id)
    .single()

  if (!routeOrder) {
    redirect("/repartidor/dashboard")
  }

  const order = routeOrder.orders
  const backLink = `/repartidor/routes/${routeOrder.route_id}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Detalle del Pedido</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href={backLink}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            
            
            <div className="flex gap-2">
              <ShareButtons 
                order={order} 
                phone={order.customers?.phone} 
                email={order.customers?.email}
              />
              <ReceiptButton 
                order={{
                  ...order,
                  was_collected: routeOrder.was_collected,
                  collected_amount: routeOrder.collected_amount
                }} 
                directDownload={true}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{order.order_number}</CardTitle>
                <div className="flex gap-2">
                  {order.status === "ENTREGADO" && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Entregado
                    </Badge>
                  )}
                  {order.no_delivery_reason && (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      No Entregado
                    </Badge>
                  )}
                  {order.status === "PENDIENTE_ENTREGA" && !order.no_delivery_reason && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      Pendiente
                    </Badge>
                  )}
                  {order.status === "EN_REPARTICION" && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                      <Clock className="mr-1 h-3 w-3" />
                      En Reparto
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>Información del pedido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{order.customers.commercial_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customers.street} {order.customers.street_number}
                    {order.customers.floor_apt && `, ${order.customers.floor_apt}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.customers.locality}, {order.customers.province}
                  </p>
                  {order.customers.phone && (
                    <p className="text-sm text-muted-foreground">Tel: {order.customers.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Orden de entrega</span>
                  <p className="font-semibold text-lg">#{routeOrder.delivery_order}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Estado de cobro</span>
                  <div className="flex items-center gap-2">
                    {routeOrder.was_collected ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Cobrado</Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </div>
                </div>
                {routeOrder.was_collected && (
                  <div className="col-span-2">
                    <span className="text-sm font-medium text-muted-foreground">Monto cobrado</span>
                    <p className="font-semibold text-lg">${routeOrder.collected_amount?.toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Llegada estimada</span>
                  <p>{routeOrder.estimated_arrival_time ? new Date(routeOrder.estimated_arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Llegada real</span>
                  <p>{routeOrder.actual_arrival_time ? new Date(routeOrder.actual_arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</p>
                </div>
              </div>

              {order.observations && (
                <div className="bg-muted p-3 rounded-md">
                  <span className="font-medium text-sm">Observaciones:</span>
                  <p className="text-sm text-muted-foreground mt-1">{order.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Producto</th>
                      <th className="text-right p-3 text-sm font-medium">Cantidad</th>
                      <th className="text-right p-3 text-sm font-medium">Precio</th>
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
                            {item.is_shortage && (
                              <Badge variant="outline" className="mt-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                                Faltante parcial
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">{item.quantity_assembled || item.quantity_requested}</td>
                        <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/50">
                    <tr>
                      <td colSpan={2} className="p-3 text-right font-bold">
                        Total:
                      </td>
                      <td className="p-3 text-right font-bold">${order.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

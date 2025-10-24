import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Truck, Package, CheckCircle, Clock } from "lucide-react"
import { OrderRatingForm } from "@/components/cliente/order-rating-form"

export default async function ClienteOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "cliente") {
    redirect("/auth/login")
  }

  const { data: customer } = await supabase.from("customers").select("*").eq("email", profile.email).single()

  if (!customer) {
    redirect("/cliente/dashboard")
  }

  // Get order with all details
  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        *,
        products:product_id (
          *
        )
      )
    `,
    )
    .eq("id", id)
    .eq("customer_id", customer.id)
    .single()

  if (!order) {
    redirect("/cliente/orders")
  }

  // Check if order has rating
  const { data: rating } = await supabase.from("order_ratings").select("*").eq("order_id", order.id).single()

  const statusLabels = {
    BORRADOR: "Borrador",
    PENDIENTE_ARMADO: "Pendiente de Armado",
    EN_ARMADO: "En Armado",
    PENDIENTE_ENTREGA: "Listo para Entrega",
    EN_REPARTICION: "En Camino",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
    ESPERANDO_STOCK: "Esperando Stock",
  } as const

  const statusColors = {
    BORRADOR: "secondary",
    PENDIENTE_ARMADO: "secondary",
    EN_ARMADO: "default",
    PENDIENTE_ENTREGA: "default",
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
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Detalle del Pedido</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/cliente/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
          </div>

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
                  <span className="font-medium">Fecha de Entrega:</span>
                  <p className="text-muted-foreground">{new Date(order.delivery_date).toLocaleDateString("es-AR")}</p>
                </div>
                <div>
                  <span className="font-medium">Prioridad:</span>
                  <p className="text-muted-foreground capitalize">{order.priority}</p>
                </div>
                <div>
                  <span className="font-medium">Tipo de Pedido:</span>
                  <p className="text-muted-foreground capitalize">{order.order_type}</p>
                </div>
                {order.delivered_at && (
                  <div>
                    <span className="font-medium">Entregado el:</span>
                    <p className="text-muted-foreground">
                      {new Date(order.delivered_at).toLocaleDateString("es-AR")}{" "}
                      {new Date(order.delivered_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {order.status === "EN_REPARTICION" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Tu pedido está en camino</p>
                    <p className="text-sm text-blue-700">El repartidor está realizando las entregas de hoy</p>
                  </div>
                </div>
              )}

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

          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Detalle de los productos del pedido</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Producto</th>
                      <th className="text-right p-3 text-sm font-medium">Cantidad</th>
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
                            {item.is_shortage && (
                              <Badge variant="outline" className="mt-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                                Faltante: {item.quantity_requested - (item.quantity_assembled || 0)} unidades
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {item.quantity_assembled || item.quantity_requested}
                          {item.is_shortage && (
                            <span className="text-muted-foreground text-sm"> / {item.quantity_requested}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">${item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/50">
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-medium">
                        Subtotal:
                      </td>
                      <td className="p-3 text-right font-medium">${order.subtotal.toFixed(2)}</td>
                    </tr>
                    {order.general_discount > 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-medium">
                          Descuento:
                        </td>
                        <td className="p-3 text-right font-medium text-destructive">
                          -${order.general_discount.toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t">
                      <td colSpan={3} className="p-3 text-right font-bold text-lg">
                        Total:
                      </td>
                      <td className="p-3 text-right font-bold text-lg">${order.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {order.status === "ENTREGADO" && (
            <Card>
              <CardHeader>
                <CardTitle>Calificación del Pedido</CardTitle>
                <CardDescription>Ayúdanos a mejorar calificando tu experiencia</CardDescription>
              </CardHeader>
              <CardContent>
                {rating ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Tu calificación:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= rating.rating ? "text-yellow-500" : "text-gray-300"}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {rating.comments && (
                      <div>
                        <span className="font-medium">Comentarios:</span>
                        <p className="text-muted-foreground mt-1">{rating.comments}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <OrderRatingForm orderId={order.id} customerId={customer.id} />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

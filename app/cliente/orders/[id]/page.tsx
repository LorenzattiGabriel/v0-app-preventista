import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Truck, Package, CheckCircle, Clock } from "lucide-react"
import { OrderRatingForm } from "@/components/cliente/order-rating-form"
import { WhatsAppSupportButton } from "@/components/cliente/whatsapp-support-button"
import { Separator } from "@/components/ui/separator"

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
            <WhatsAppSupportButton orderNumber={order.order_number} />
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

              {/* 🆕 Show delivery evidence (photo + name) after delivery */}
              {order.status === "ENTREGADO" && order.delivery_photo_url && order.received_by_name && (
                <div className="bg-green-50 dark:bg-green-950 border-2 border-green-400 dark:border-green-600 rounded-lg p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-bold text-green-900 dark:text-green-100 text-lg">
                          📸 Evidencia de Entrega
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Tu pedido fue entregado exitosamente
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-green-300 dark:border-green-700">
                      <div className="space-y-4">
                        {/* Delivery Photo */}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Foto de entrega:</p>
                          <img
                            src={order.delivery_photo_url}
                            alt="Evidencia de entrega"
                            className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300 dark:border-gray-600"
                          />
                        </div>
                        
                        {/* Received By Name */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-300 dark:border-gray-700">
                          <p className="text-sm font-medium text-muted-foreground">Recibido por:</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {order.received_by_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                <div className="bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-bold text-yellow-900 dark:text-yellow-100 text-lg">
                        ⚠️ Este pedido tiene productos faltantes
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Algunos productos no estaban disponibles al momento del armado. Los productos faltantes están marcados
                        en la tabla de abajo y <strong>NO serán incluidos en tu entrega</strong>.
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                        💰 El total del pedido se ajustará automáticamente y solo pagarás por los productos que recibas.
                      </p>
                    </div>
                  </div>
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
                      <tr key={item.id} className={`border-t ${item.is_shortage ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                        <td className="p-3">
                          <div>
                            <p className={`font-medium ${item.is_shortage ? 'text-red-900 dark:text-red-100' : ''}`}>
                              {item.products.name} {item.products.brand && `- ${item.products.brand}`}
                            </p>
                            {item.is_shortage && (
                              <div className="mt-2 space-y-1">
                                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200">
                                  ❌ PRODUCTO NO DISPONIBLE
                                </Badge>
                                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                  Faltante: {item.quantity_requested - (item.quantity_assembled || 0)} de {item.quantity_requested} unidades
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className={item.is_shortage ? 'text-red-700 dark:text-red-300 font-bold' : ''}>
                              {item.quantity_assembled || item.quantity_requested}
                            </span>
                            {item.is_shortage && (
                              <span className="text-muted-foreground text-sm line-through">
                                {item.quantity_requested} solicitadas
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">
                          ${item.subtotal.toFixed(2)}
                          {item.is_shortage && item.quantity_requested > 0 && (
                            <div className="text-xs text-muted-foreground line-through">
                              ${(item.unit_price * item.quantity_requested).toFixed(2)}
                            </div>
                          )}
                        </td>
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
                  <div className="space-y-4">
                    {/* Order Rating */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Calificación del Pedido</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= rating.rating ? "text-yellow-500 text-2xl" : "text-gray-300 text-2xl"}>
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-muted-foreground">({rating.rating}/5)</span>
                      </div>
                      {rating.comments && (
                        <div>
                          <span className="text-sm font-medium">Tus comentarios:</span>
                          <p className="text-muted-foreground mt-1">{rating.comments}</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Driver Rating */}
                    {rating.driver_rating && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Calificación del Repartidor</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={star <= rating.driver_rating ? "text-blue-500 text-2xl" : "text-gray-300 text-2xl"}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-muted-foreground">({rating.driver_rating}/5)</span>
                        </div>
                        {rating.driver_comments && (
                          <div>
                            <span className="text-sm font-medium">Tus comentarios:</span>
                            <p className="text-muted-foreground mt-1">{rating.driver_comments}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">¡Gracias por tu calificación!</p>
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

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MapPin, Camera, User, Calendar, CreditCard, CheckCircle2 } from "lucide-react"

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

  // Get order with all details
  // Primero verificar si el pedido está en una ruta asignada al repartidor
  const { data: routeOrder } = await supabase
    .from("route_orders")
    .select(`
      order_id,
      routes!inner (
        id,
        driver_id
      )
    `)
    .eq("order_id", id)
    .eq("routes.driver_id", user.id)
    .single()

  // Si no está en una ruta del repartidor, verificar si es delivered_by
  const { data: order } = await supabase
    .from("orders")
    .select(
      `
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
    `,
    )
    .eq("id", id)
    .single()

  // Verificar acceso: debe estar en una ruta del repartidor O ser delivered_by
  if (!order || (!routeOrder && order.delivered_by !== user.id)) {
    redirect("/repartidor/dashboard")
  }

  // Los datos de pago ahora están directamente en el pedido (normalizado)
  // Ya no necesitamos consultar route_orders para esto

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
              <Link href="/repartidor/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{order.order_number}</CardTitle>
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

          {/* Comprobante de Entrega - Solo si está entregado */}
          {order.status === "ENTREGADO" && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Comprobante de Entrega
                </CardTitle>
                <CardDescription>Evidencia de la entrega realizada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Foto de entrega */}
                {order.delivery_photo_url && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Camera className="h-4 w-4" />
                      Foto de Entrega
                    </div>
                    <div className="relative">
                      <img
                        src={order.delivery_photo_url}
                        alt="Foto de entrega"
                        className="w-full max-w-md mx-auto rounded-lg border-2 border-green-300 shadow-md"
                      />
                    </div>
                  </div>
                )}

                {/* Información de entrega */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recibido por */}
                  {order.received_by_name && (
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <User className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Recibido por</p>
                        <p className="font-medium">{order.received_by_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Fecha y hora */}
                  {order.delivered_at && (
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Calendar className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha de Entrega</p>
                        <p className="font-medium">
                          {new Date(order.delivered_at).toLocaleDateString("es-AR", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.delivered_at).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Información de cobro (datos ahora desde order, normalizados) */}
                {order.status === "ENTREGADO" && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      Información de Cobro
                    </div>
                    
                    {order.was_collected_on_delivery ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Monto Cobrado</p>
                          <p className="text-xl font-bold text-green-600">
                            ${order.amount_paid?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Método de Pago</p>
                          <Badge variant="outline" className="mt-1">
                            {order.payment_method === "Efectivo" && "💵 Efectivo"}
                            {order.payment_method === "Transferencia" && "🏦 Transferencia"}
                            {order.payment_method === "Tarjeta de Crédito" && "💳 Tarjeta de Crédito"}
                            {order.payment_method === "Tarjeta de Débito" && "💳 Tarjeta de Débito"}
                            {!["Efectivo", "Transferencia", "Tarjeta de Crédito", "Tarjeta de Débito"].includes(order.payment_method) && order.payment_method}
                          </Badge>
                        </div>
                        {/* Mostrar comprobante de transferencia si existe */}
                        {order.payment_method === "Transferencia" && order.transfer_proof_url && (
                          <div className="col-span-2 space-y-2">
                            <p className="text-muted-foreground font-medium">🧾 Comprobante de Transferencia</p>
                            <div className="relative">
                              <a 
                                href={order.transfer_proof_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={order.transfer_proof_url}
                                  alt="Comprobante de transferencia"
                                  className="w-full max-w-sm mx-auto rounded-lg border-2 border-blue-300 shadow-md hover:opacity-90 transition-opacity cursor-pointer"
                                />
                              </a>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                              Click en la imagen para ver en tamaño completo
                            </p>
                          </div>
                        )}
                        {(order.amount_paid || 0) < order.total && (
                          <div className="col-span-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              ⚠️ Deuda generada: <strong>${(order.total - (order.amount_paid || 0)).toFixed(2)}</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          ⚠️ No se realizó cobro - Deuda total: <strong>${order.total.toFixed(2)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notas de entrega */}
                {order.delivery_notes && (
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Notas de Entrega</p>
                    <p className="text-sm">{order.delivery_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Motivo de no entrega - Si aplica */}
          {order.no_delivery_reason && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-700 dark:text-red-400">
                  ❌ No se pudo entregar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Motivo</p>
                  <p className="font-medium">{order.no_delivery_reason}</p>
                </div>
                {order.no_delivery_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notas adicionales</p>
                    <p className="text-sm">{order.no_delivery_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

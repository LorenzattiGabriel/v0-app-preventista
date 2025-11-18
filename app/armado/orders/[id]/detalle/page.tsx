import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react"

export default async function Detalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      customers(*),
      order_items(
        *,
        products:product_id(*)
      )
    `)
    .eq("id", id)
    .single()

  if (!order) {
    return <p className="text-center text-red-500 mt-10">Pedido no encontrado.</p>
  }

  const isIncomplete = order.has_shortages === true
  const hasShortages = isIncomplete || order.order_items.some((item: any) => item.is_shortage)

  const calculateTotals = () => {
    const originalSubtotal = order.order_items.reduce((sum: number, item: any) => {
      return sum + item.quantity_requested * item.unit_price - item.discount
    }, 0)

    const assembledSubtotal = order.order_items.reduce((sum: number, item: any) => {
      const assembledQty = item.quantity_assembled ?? item.quantity_requested
      return sum + assembledQty * item.unit_price - item.discount
    }, 0)

    const originalTotal = originalSubtotal - order.general_discount
    const newTotal = assembledSubtotal - order.general_discount
    const difference = originalTotal - newTotal

    return { originalTotal, newTotal, difference }
  }

  const { originalTotal, newTotal, difference } = calculateTotals()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* ---- Botón Volver ---- */}
      <Button variant="outline" asChild>
        <Link href="/armado/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Link>
      </Button>

      {/* ---- Información del Pedido ---- */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Pedido {order.order_number}</CardTitle>
              <CardDescription>
                Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")}
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary">{order.status}</Badge>
              <Badge variant={order.priority === "alta" || order.priority === "urgente" ? "destructive" : "default"}>
                {order.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="text-sm space-y-3">
          <p>
            <span className="font-medium">Cliente:</span> {order.customers.commercial_name}
          </p>

          <p>
            <span className="font-medium">Localidad:</span> {order.customers.locality}
          </p>
        </CardContent>
      </Card>

      {/* ---- Productos ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Detalle de productos incluidos en el armado</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {order.order_items.map((item: any) => (
            <div key={item.id} className="border rounded-md p-4 space-y-2 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{item.products.name}</h4>
                  {item.products.brand && (
                    <p className="text-sm text-muted-foreground">{item.products.brand}</p>
                  )}
                </div>

                {item.is_shortage && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Faltante
                  </Badge>
                )}
              </div>

              <p className="text-sm">Solicitado: {item.quantity_requested}</p>
              <p className="text-sm">Armado: {item.quantity_assembled}</p>
              <p className="text-sm">Precio unitario: ${item.unit_price.toFixed(2)}</p>

              {item.is_shortage && (
                <div className="text-sm p-3 bg-destructive/10 rounded-md space-y-1">
                  <p><span className="font-medium">Motivo:</span> {item.shortage_reason}</p>
                  {item.shortage_notes && <p><span className="font-medium">Notas:</span> {item.shortage_notes}</p>}
                </div>
              )}

              {item.is_substituted && item.substituted_product_id && (
                <p className="text-sm text-blue-600">
                  Sustituido por: {item.substituted_product_id}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---- Notas ---- */}
      {order.assembly_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas del Armado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{order.assembly_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ---- Totales ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Totales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total original:</span>
            <span className="font-medium">${originalTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Total armado:</span>
            <span className="font-medium">${newTotal.toFixed(2)}</span>
          </div>

          {difference > 0 && (
            <div className="flex justify-between">
              <span>Diferencia:</span>
              <span className="text-destructive font-medium">-${difference.toFixed(2)}</span>
            </div>
          )}

          {hasShortages && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md mt-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Este pedido tiene productos faltantes</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

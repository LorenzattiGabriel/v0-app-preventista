import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"

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
    .eq("delivered_by", user.id)
    .single()

  if (!order) {
    redirect("/repartidor/dashboard")
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
        </div>
      </main>
    </div>
  )
}

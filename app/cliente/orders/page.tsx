import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ClienteOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const params = await searchParams
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

  // Build query
  let query = supabase.from("orders").select("*").eq("customer_id", customer.id)

  if (params.status) {
    query = query.eq("status", params.status)
  }

  if (params.search) {
    query = query.ilike("order_number", `%${params.search}%`)
  }

  const { data: orders } = await query.order("created_at", { ascending: false })

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Todos los Pedidos</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/cliente/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Pedidos</CardTitle>
              <CardDescription>Todos tus pedidos ordenados por fecha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input placeholder="Buscar por número de pedido..." className="max-w-sm" />
                  <Button variant="outline">Filtrar por Estado</Button>
                </div>

                {orders && orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{order.order_number}</span>
                            <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                              {statusLabels[order.status as keyof typeof statusLabels]}
                            </Badge>
                            {order.has_shortages && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Con Faltantes
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Fecha: {new Date(order.order_date).toLocaleDateString("es-AR")} | Entrega:{" "}
                            {new Date(order.delivery_date).toLocaleDateString("es-AR")}
                          </p>
                          <p className="text-sm font-medium">Total: ${order.total.toFixed(2)}</p>
                        </div>
                        <Button asChild variant="outline">
                          <Link href={`/cliente/orders/${order.id}`}>Ver Detalle</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No se encontraron pedidos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Clock, CheckCircle, Truck } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"

export default async function ClienteDashboardPage() {
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

  // Get customer record
  const { data: customer } = await supabase.from("customers").select("*").eq("email", profile.email).single()

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Cliente no encontrado</CardTitle>
            <CardDescription>No se encontró un registro de cliente asociado a su cuenta.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Get order statistics
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)

  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .in("status", ["PENDIENTE_ARMADO", "EN_ARMADO", "PENDIENTE_ENTREGA"])

  const { count: inTransitOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .eq("status", "EN_REPARTICION")

  const { count: deliveredOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .eq("status", "ENTREGADO")

  // Get recent orders
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(5)

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
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Mis Pedidos</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{customer.commercial_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bienvenido, {customer.contact_name}</h2>
            <p className="text-muted-foreground">Gestiona y rastrea tus pedidos</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Todos tus pedidos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Preparándose</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Camino</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inTransitOrders || 0}</div>
                <p className="text-xs text-muted-foreground">En repartición</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Completados</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pedidos Recientes</CardTitle>
                  <CardDescription>Tus últimos 5 pedidos</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href="/cliente/orders">Ver Todos</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                <p className="text-center text-muted-foreground py-8">No tienes pedidos registrados</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

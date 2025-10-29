import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Package, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"

export default async function ArmadoDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "encargado_armado") {
    redirect("/auth/login")
  }

  // Get statistics
  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDIENTE_ARMADO")

  const { count: inProgressOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "EN_ARMADO")

  const { count: waitingStockOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "ESPERANDO_STOCK")

  const { count: completedToday } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("assembled_by", user.id)
    .gte("assembly_completed_at", new Date().toISOString().split("T")[0])

  // Get pending orders with customer info
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      *,
      customers (
        commercial_name,
        locality
      )
    `,
    )
    .in("status", ["PENDIENTE_ARMADO", "EN_ARMADO", "ESPERANDO_STOCK"])
    .order("priority", { ascending: false })
    .order("delivery_date", { ascending: true })
    .limit(10)

  const priorityColors = {
    urgente: "destructive",
    alta: "destructive",
    media: "default",
    normal: "secondary",
    baja: "secondary",
  } as const

  const statusLabels = {
    PENDIENTE_ARMADO: "Pendiente",
    EN_ARMADO: "En Proceso",
    ESPERANDO_STOCK: "Esperando Stock",
  } as const

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sistema de Gestión - Armado</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Panel de Armado</h2>
            <p className="text-muted-foreground">Gestiona el armado de pedidos</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Por armar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Armando ahora</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Esperando Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{waitingStockOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Sin stock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completados Hoy</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedToday || 0}</div>
                <p className="text-xs text-muted-foreground">Armados por ti</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos por Armar</CardTitle>
              <CardDescription>Ordenados por prioridad y fecha de entrega</CardDescription>
            </CardHeader>
            <CardContent>
              {orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{order.order_number}</span>
                          <Badge variant={priorityColors[order.priority as keyof typeof priorityColors]}>
                            {order.priority}
                          </Badge>
                          <Badge variant="outline">{statusLabels[order.status as keyof typeof statusLabels]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customers?.commercial_name} - {order.customers?.locality}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")} | Total: $
                          {order.total.toFixed(2)}
                        </p>
                      </div>
                      <Button asChild>
                        <Link href={`/armado/orders/${order.id}`}>
                          {order.status === "EN_ARMADO" ? "Continuar" : "Armar"}
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay pedidos pendientes de armado</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

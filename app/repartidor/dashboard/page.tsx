import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Truck, MapPin, CheckCircle, Clock, Package } from "lucide-react"

export default async function RepartidorDashboardPage() {
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

  // Get today's date
  const today = new Date().toISOString().split("T")[0]

  // Get statistics
  const { count: todayRoutes } = await supabase
    .from("routes")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", user.id)
    .eq("scheduled_date", today)

  const { count: inProgressRoutes } = await supabase
    .from("routes")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", user.id)
    .eq("status", "EN_CURSO")

  const { count: completedToday } = await supabase
    .from("routes")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", user.id)
    .eq("scheduled_date", today)
    .eq("status", "COMPLETADO")

  // Get delivered orders today
  const { count: deliveredOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("delivered_by", user.id)
    .gte("delivered_at", today)

  // Get today's routes with order counts
  const { data: routes } = await supabase
    .from("routes")
    .select(
      `
      *,
      zones (
        name
      ),
      route_orders (
        id,
        orders (
          id,
          status
        )
      )
    `,
    )
    .eq("driver_id", user.id)
    .eq("scheduled_date", today)
    .order("scheduled_start_time", { ascending: true })

  const statusLabels = {
    PLANIFICADO: "Planificado",
    EN_CURSO: "En Curso",
    COMPLETADO: "Completado",
    CANCELADO: "Cancelado",
  } as const

  const statusColors = {
    PLANIFICADO: "secondary",
    EN_CURSO: "default",
    COMPLETADO: "default",
    CANCELADO: "destructive",
  } as const

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sistema de Gestión - Repartidor</h1>
          </div>
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
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Panel de Entregas</h2>
            <p className="text-muted-foreground">Gestiona tus rutas y entregas del día</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rutas de Hoy</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayRoutes || 0}</div>
                <p className="text-xs text-muted-foreground">Asignadas para hoy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Curso</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressRoutes || 0}</div>
                <p className="text-xs text-muted-foreground">Rutas activas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedToday || 0}</div>
                <p className="text-xs text-muted-foreground">Rutas finalizadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregas Hoy</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Pedidos entregados</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mis Rutas de Hoy</CardTitle>
              <CardDescription>{new Date().toLocaleDateString("es-AR", { dateStyle: "full" })}</CardDescription>
            </CardHeader>
            <CardContent>
              {routes && routes.length > 0 ? (
                <div className="space-y-4">
                  {routes.map((route) => {
                    const totalOrders = route.route_orders?.length || 0
                    const deliveredOrders =
                      route.route_orders?.filter((ro: any) => ro.orders?.status === "ENTREGADO").length || 0

                    return (
                      <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{route.route_code}</span>
                            <Badge variant={statusColors[route.status as keyof typeof statusColors]}>
                              {statusLabels[route.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{route.zones?.name || "Sin zona"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              <span>
                                {deliveredOrders}/{totalOrders} entregas
                              </span>
                            </div>
                            {route.scheduled_start_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Inicio: {route.scheduled_start_time.slice(0, 5)}</span>
                              </div>
                            )}
                          </div>
                          {route.total_distance && (
                            <p className="text-xs text-muted-foreground">
                              Distancia: {route.total_distance.toFixed(1)} km | Duración estimada:{" "}
                              {Math.floor((route.estimated_duration || 0) / 60)}h {(route.estimated_duration || 0) % 60}
                              min
                            </p>
                          )}
                        </div>
                        <Button asChild>
                          <Link href={`/repartidor/routes/${route.id}`}>
                            {route.status === "EN_CURSO" ? "Continuar" : "Ver Ruta"}
                          </Link>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No tienes rutas asignadas para hoy</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

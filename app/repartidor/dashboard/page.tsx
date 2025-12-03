import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Truck, MapPin, CheckCircle, Clock, Package, DollarSign, Target, CircleDollarSign, Calendar } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RepartidorRoutesFilter } from "@/components/repartidor/repartidor-routes-filter"

interface SearchParams {
  selected_date?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function RepartidorDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
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
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  // const today = new Date().toISOString().split("T")[0]

  // Get statistics
  // const { count: todayRoutes } = await supabase

  const selectedDate = params.selected_date || today
  const { data: inProgressRoute } = await supabase    
.from("routes")
    .select("*, zones (name), route_orders(id, orders(status))")
    .eq("driver_id", user.id)
    .eq("status", "EN_CURSO")
    .maybeSingle()

  // --- NEW METRICS CALCULATIONS ---


  // Get all routes that are part of the current workload.
  // This includes:
  // 1. Any route that is currently "EN_CURSO".
  // 2. Any route that is "PLANIFICADO" for today or any past day.
  const { data: todaysRoutes, error } = await supabase
    .from("routes")
    .select(
      `*, zones (name), route_orders (id, orders (id, status, total), was_collected, collected_amount)`
    )
    .eq("driver_id", user.id)
    .or(`status.eq.EN_CURSO,and(status.eq.PLANIFICADO,scheduled_date.lte.${today})`)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_start_time", { ascending: true })

  // Get delivered orders today
  const { count: deliveredOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("delivered_by", user.id)
    .gte("delivered_at", today)

  // Get future routes count
  const { count: futureRoutes } = await supabase
    .from("routes")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", user.id)
    .gt("scheduled_date", today)



  // Calculate total money collected today
  const { data: collectedData } = await supabase
    .from("routes")
    .select("route_orders (collected_amount, was_collected)")
    .eq("routes.driver_id", user.id)
    .eq("routes.status", "COMPLETADO")
    .gte("routes.actual_end_time", today)

  const collectedToday =
    collectedData?.flatMap((r) => r.route_orders).reduce((sum, ro) => sum + (ro.was_collected ? ro.collected_amount || 0 : 0), 0) || 0

  // Calculate delivery progress for today's routes
  const totalOrdersToday = todaysRoutes?.reduce((sum, route) => sum + (route.route_orders?.length || 0), 0);
  const completedOrdersToday = todaysRoutes?.reduce((sum, route) => 
    sum + (route.route_orders?.filter((ro: any) => ro.orders?.status === "ENTREGADO").length || 0), 0);

  // Calculate route progress for today
  const { count: completedRoutesToday } = await supabase
    .from("routes")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", user.id) // This counts routes completed today
    .gte("actual_end_time", today)
    .eq("status", "COMPLETADO") // and whose end time is today


  // ---

  // // Also get any in-progress routes (regardless of date)
  // const { data: inProgressRoutesOtherDays } = await supabase
  //   .from("routes")
  //   .select(
  //     `
  //     *,
  //     zones (
  //       name
  //     ),
  //     route_orders (
  //       id,
  //       orders (
  //         id,
  //         status
  //       )
  //     )
  //   `,
  //   )
  //   .eq("driver_id", user.id)
  //   .eq("status", "EN_CURSO") //TODO: Le faltan los estado PENDIENTE(asignado pero no iniciados)
  //   .neq("scheduled_date", today)
  //   .order("scheduled_date", { ascending: false })


  // TODO: fechas anteriores a la seleccionada.
  // Get routes for selected date (if different from today)
  const { data: routesSelectedDate, error: routesSelectedDateError } = selectedDate !== today ? await supabase
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
    .eq("scheduled_date", selectedDate)
    .order("scheduled_start_time", { ascending: true })
    : { data: [], error: null }

  // Debug logging
  console.log('🔍 Debug Repartidor Dashboard:', {
    userId: user.id,
    today,
    selectedDate,
    routesSelectedDateCount: routesSelectedDate?.length || 0,
    routesSelectedDateError,
    routesSelectedDate: routesSelectedDate?.map(r => ({
      id: r.id,
      route_code: r.route_code,
      driver_id: r.driver_id,
      scheduled_date: r.scheduled_date,
      status: r.status
    }))
  })

  // TODO
  // Combine routes (in-progress first, then today's)
  // const routes = [...(inProgressRoutesOtherDays || []), ...(routesToday || [])]


  const statusLabels = {
    PLANIFICADO: "Planificado",
    EN_CURSO: "En Curso",
    COMPLETADO: "Completado",
    CANCELADO: "Cancelado",
  } as const

  const statusColors = {
    PLANIFICADO: "secondary",
    EN_CURSO: "default",
    COMPLETADO: "outline",
    CANCELADO: "destructive",
  } as const

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 md:h-6 md:w-6" />
            <h1 className="text-lg md:text-xl font-semibold truncate">
              <span className="hidden sm:inline">Sistema de Gestión - </span>Repartidor
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline truncate max-w-[120px] md:max-w-none">{profile.full_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-3 sm:p-4 md:p-6">
        <div className="container mx-auto space-y-4 md:space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Entregas</h2>
            <p className="text-sm md:text-base text-muted-foreground">Gestiona tus rutas y entregas del día</p>
          </div>


          {/* --- NEW METRICS SECTION --- */}
          {/* TODO: decide metrics style. */}
           {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"> */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dinero Recaudado Hoy</CardTitle>
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${collectedToday.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Total cobrado en entregas completadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregas de Hoy</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedOrdersToday} / {totalOrdersToday}</div>
                <p className="text-xs text-muted-foreground">Pedidos completados en rutas de hoy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progreso de Rutas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedRoutesToday || 0} / {todaysRoutes?.length}</div>
                <p className="text-xs text-muted-foreground">Rutas de hoy completadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rutas Futuras</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{futureRoutes || 0}</div>
                <p className="text-xs text-muted-foreground">Planificadas</p>
              </CardContent>
            </Card>
          </div>
          {/* --- END NEW METRICS SECTION --- */}


          {/* In-Progress Route Card */}
          {inProgressRoute && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-primary">Ruta en Curso</CardTitle>
                <CardDescription>
                  Tienes una ruta activa que debes completar antes de iniciar otra.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/50 rounded-lg gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{inProgressRoute.route_code}</span>
                      <Badge>{statusLabels[inProgressRoute.status as keyof typeof statusLabels]}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{inProgressRoute.zones?.name || "Sin zona"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>
                          {inProgressRoute.route_orders.filter((ro: any) => ro.orders?.status === "ENTREGADO").length}/
                          {inProgressRoute.route_orders.length} entregas
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button asChild size="lg" className="w-full sm:w-auto h-14 text-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                    <Link href={`/repartidor/routes/${inProgressRoute.id}`}>Continuar Ruta</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          

          <Tabs defaultValue="today" className="w-full">
            <TabsList>
              <TabsTrigger value="today" className="cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:text-white hover:shadow-md hover:scale-[1.02]">Rutas de Hoy</TabsTrigger>
              <TabsTrigger value="planned" className="cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:text-white hover:shadow-md hover:scale-[1.02]">Rutas Planificadas</TabsTrigger>
            </TabsList>

            {/* Today's Routes Tab */}
            <TabsContent value="today" className="mt-6">
               {/* --- NEW UNIFIED QUEUE --- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rutas Pendientes</CardTitle>
                    <CardDescription>Tus rutas pendientes, ordenadas por prioridad.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {todaysRoutes && todaysRoutes.length > 0 ? (
                      <div className="space-y-4">
                        {todaysRoutes.map((route) => {
                          const totalOrders = route.route_orders?.length || 0
                          const deliveredOrders =
                            route.route_orders?.filter((ro: any) => ro.orders?.status === "ENTREGADO").length || 0
                          const isDelayed = route.status === 'PLANIFICADO' && new Date(route.scheduled_date + "T00:00:00") < new Date(today);

                          return (
                            <div key={route.id} className={`flex items-center justify-between p-4 border rounded-lg ${isDelayed ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{route.route_code}</span>
                                  {isDelayed && (
                                    <Badge variant="outline" className="border-amber-600 text-amber-700">
                                      <Clock className="mr-1 h-3 w-3" />
                                      Atrasada
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{route.zones?.name || "Sin zona"}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-medium">
                                    <Package className="h-4 w-4" />
                                    <span>
                                      {deliveredOrders}/{totalOrders} entregas
                                    </span>
                                  </div>
                                  {/* TODO: ver card anterior */}
                                  {/* <div className="flex items-center gap-1 font-semibold">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                      {new Date(route.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}
                                      {route.scheduled_start_time && ` - ${route.scheduled_start_time.slice(0, 5)}hs`}
                                    </span>
                                  </div> */}
                                  {route.scheduled_start_time && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          <span>Inicio: {route.scheduled_start_time.slice(0, 5)}</span>
                                        </div>
                                  )}
                                  {route.total_distance && (
                                      <p className="text-xs text-muted-foreground">
                                        Distancia: {route.total_distance.toFixed(1)} km | Duración estimada:{" "}
                                        {Math.floor((route.estimated_duration || 0) / 60)}h {(route.estimated_duration || 0) % 60}
                                        min
                                      </p>
                                    )}

                                </div>
                              </div>
                              <Button 
                                asChild 
                                disabled={!!inProgressRoute} 
                                className="cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:shadow-md hover:scale-[1.02]"
                              >
                                <Link href={`/repartidor/routes/${route.id}`}>Ver Ruta</Link>
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No tienes rutas pendientes.</p>
                    )}
                  </CardContent>
                </Card>
                {/* --- END NEW UNIFIED QUEUE --- */}
            </TabsContent>

            {/* Planned Routes Tab */}
            <TabsContent value="planned" className="mt-6 space-y-6">
              <RepartidorRoutesFilter selectedDate={selectedDate} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Rutas Planificadas</CardTitle>
                  <CardDescription>
                    Fecha seleccionada: {selectedDate === today ? "Hoy" : new Date(selectedDate + 'T00:00:00').toLocaleDateString("es-AR", { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {routesSelectedDate && routesSelectedDate.length > 0 ? (
                    <div className="space-y-4">
                      {routesSelectedDate.map((route) => {
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
                            <Button asChild className="cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:shadow-md hover:scale-[1.02]">
                              <Link href={`/repartidor/routes/${route.id}`}>Ver Ruta</Link>
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No tienes rutas planificadas para esta fecha
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  )
}
     
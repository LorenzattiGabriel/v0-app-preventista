import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Truck, MapPin, CheckCircle, Clock, Package, DollarSign, Target, CircleDollarSign, Calendar, CalendarDays, ArrowRight } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RepartidorRoutesFilter } from "@/components/repartidor/repartidor-routes-filter"
import { RouteCard } from "@/components/repartidor/route-card"

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
  const selectedDate = params.selected_date || today

  // Prepare all data fetching promises
  const inProgressRoutePromise = supabase
    .from("routes")
    .select("*, zones (name), route_orders(id, orders(status, no_delivery_reason))")
    .eq("driver_id", user.id)
    .eq("status", "EN_CURSO")
    .maybeSingle()


  // Get all routes that are part of the current workload.
  // This includes:
  // 1. Any route that is currently "EN_CURSO".
  // 2. Any route that is "PLANIFICADO" for today or any past day.
  // 3. Any route that is "COMPLETADO" and was finished today.
  const todaysRoutesPromise = supabase
    .from("routes")
    .select(
      `*, zones (name), route_orders (id, orders (id, status, total), was_collected, collected_amount)`
    )
    .eq("driver_id", user.id)
    .or(`status.eq.EN_CURSO,and(status.eq.PLANIFICADO,scheduled_date.lte.${today}),and(status.eq.COMPLETADO,actual_end_time.gte.${today}T00:00:00)`)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_start_time", { ascending: true })

  const futureRoutesPromise = supabase
    .from("routes")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", user.id)
    .gt("scheduled_date", today)

  const routesSelectedDatePromise = selectedDate >= today 
    ? supabase
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
        .gte("scheduled_date", today)
        .lte("scheduled_date", selectedDate)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_start_time", { ascending: true })
    : Promise.resolve({ data: [], error: null })

  // Execute all fetches in parallel
  const [
    { data: inProgressRoute },
    { data: todaysRoutes, error },
    { count: futureRoutes },
    { data: routesSelectedDate, error: routesSelectedDateError }
  ] = await Promise.all([
    inProgressRoutePromise,
    todaysRoutesPromise,
    futureRoutesPromise,
    routesSelectedDatePromise
  ])

  // Calculate derived metrics
  const allRoutesForStats = todaysRoutes || []

  const collectedToday = allRoutesForStats.flatMap((r) => r.route_orders)
    .reduce((sum, ro) => sum + (ro.was_collected ? ro.collected_amount || 0 : 0), 0) || 0
console.log("collectedToday", collectedToday)
  const completedRoutesToday = allRoutesForStats.filter(r => r.status === "COMPLETADO").length

  // Calculate delivery progress for today's routes
  const totalOrdersToday = allRoutesForStats.reduce((sum, route) => sum + (route.route_orders?.length || 0), 0);
  const completedOrdersToday = allRoutesForStats.reduce((sum, route) => 
    sum + (route.route_orders?.filter((ro: any) => ro.orders?.status === "ENTREGADO").length || 0), 0);

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
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Money Card */}
            <Card className="col-span-2 sm:col-span-1 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recaudado Hoy</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${collectedToday.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground font-medium">Total cobrado</p>
              </CardContent>
            </Card>

            {/* Orders Progress */}
            <Card className="shadow-sm transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregas</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedOrdersToday} <span className="text-sm text-muted-foreground font-normal">/ {totalOrdersToday}</span></div>
                <p className="text-xs text-muted-foreground font-medium">Pedidos completados</p>
              </CardContent>
            </Card>

            {/* Routes Progress */}
            <Card className="shadow-sm transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rutas</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedRoutesToday} <span className="text-sm text-muted-foreground font-normal">/ {todaysRoutes?.length}</span></div>
                <p className="text-xs text-muted-foreground font-medium">Rutas finalizadas</p>
              </CardContent>
            </Card>

            {/* Future Routes */}
            <Card className="shadow-sm transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Futuras</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{futureRoutes || 0}</div>
                <p className="text-xs text-muted-foreground font-medium">Rutas planificadas</p>
              </CardContent>
            </Card>
          </div>
          {/* --- END NEW METRICS SECTION --- */}


          {/* In-Progress Route Card */}
          {inProgressRoute && (
            <Card className="border-2 border-primary/10 bg-primary/5 shadow-lg overflow-hidden relative">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <CardHeader className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-primary" />
                      Ruta en Curso
                    </CardTitle>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">{inProgressRoute.route_code}</h3>
                  </div>
                  <Badge variant="outline" className="text-sm px-3 py-1 font-semibold shadow-sm border-primary/20 text-primary bg-primary/5">
                    {statusLabels[inProgressRoute.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10 space-y-5">
                {/* Progress Section */}
                <div>
                  {(() => {
                    const totalOrders = inProgressRoute.route_orders.length
                    const deliveredOrders = inProgressRoute.route_orders.filter((ro: any) => ro.orders?.status === "ENTREGADO").length
                    const notDeliveredOrders = inProgressRoute.route_orders.filter((ro: any) => ro.orders?.status !== "ENTREGADO" && ro.orders?.no_delivery_reason).length
                    const pendingOrders = totalOrders - deliveredOrders - notDeliveredOrders
                    
                    // Progress is based on managed orders (delivered + not delivered)
                    const managedOrders = deliveredOrders + notDeliveredOrders
                    const progressPercentage = totalOrders > 0 ? Math.round((managedOrders / totalOrders) * 100) : 0

                    return (
                      <>
                        <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                          <span className="font-medium">Progreso de entregas</span>
                          <span className="font-bold text-foreground">
                            {progressPercentage}%
                          </span>
                        </div>
                        {/* Custom Progress Bar */}
                        <div className="relative w-full h-3">
                          <div className="absolute inset-0 w-full bg-muted rounded-full flex overflow-hidden">
                            {/* Delivered Segment (Black/Primary) */}
                            <div
                              className="bg-primary h-full transition-all duration-500"
                              style={{ width: `${totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0}%` }}
                            />
                            {/* Not Delivered Segment (Red) */}
                            <div
                              className="bg-red-500 h-full transition-all duration-500"
                              style={{ width: `${totalOrders > 0 ? (notDeliveredOrders / totalOrders) * 100 : 0}%` }}
                            />
                          </div>
                          
                          {/* Circle Indicator */}
                          {managedOrders > 0 && (
                              <div 
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 border-primary rounded-full shadow-sm z-10 transition-all duration-500"
                                style={{ left: `calc(${totalOrders > 0 ? (managedOrders / totalOrders) * 100 : 0}% - 8px)` }}
                              />
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                           <div className="flex gap-3">
                              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> {deliveredOrders} Entregados</span>
                              {notDeliveredOrders > 0 && (
                                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> {notDeliveredOrders} No Entregados</span>
                              )}
                           </div>
                           <span>{totalOrders} Total</span>
                        </div>
                        
                        {pendingOrders > 0 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            ⏳ Quedan <strong className="text-foreground">{pendingOrders}</strong> pedido{pendingOrders !== 1 ? 's' : ''} por gestionar
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>


                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background p-2.5 rounded-lg border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                      <MapPin className="h-3 w-3 text-primary" /> ZONA
                    </div>
                    <div className="font-bold text-base truncate leading-tight text-foreground">
                      {inProgressRoute.zones?.name || "Sin zona"}
                    </div>
                  </div>
                  <div className="bg-background p-2.5 rounded-lg border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                      <Clock className="h-3 w-3 text-primary" /> INICIO
                    </div>
                    <div className="font-bold text-base truncate leading-tight text-foreground">
                      {inProgressRoute.actual_start_time ? new Date(inProgressRoute.actual_start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </div>
                  </div>
                </div>

                <Button asChild size="lg" className="w-full h-12 text-lg font-bold shadow-md hover:scale-[1.01] transition-all duration-200 group">
                  <Link href={`/repartidor/routes/${inProgressRoute.id}`} className="flex items-center justify-center gap-2">
                    Continuar Ruta 
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          

          <Tabs defaultValue="today" className="w-full">
            <TabsList>
              <TabsTrigger value="today" className="cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:text-white hover:shadow-md hover:scale-[1.02]">Rutas de Hoy</TabsTrigger>
              <TabsTrigger value="completed" className="cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:text-white hover:shadow-md hover:scale-[1.02]">Completadas hoy</TabsTrigger>
              <TabsTrigger value="planned" className="cursor-pointer transition-all duration-300 hover:bg-primary/90 hover:text-white hover:shadow-md hover:scale-[1.02]">Rutas Planificadas</TabsTrigger>
            </TabsList>

            {/* Today's Routes Tab (Pending/In Progress) */}
            <TabsContent value="today" className="mt-6">
               {/* --- NEW UNIFIED QUEUE --- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rutas Pendientes</CardTitle>
                    <CardDescription>Tus rutas pendientes, ordenadas por prioridad.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {todaysRoutes && todaysRoutes.filter(r => r.status !== 'COMPLETADO' && r.status !== 'EN_CURSO').length > 0 ? (
                      <div className="space-y-4">
                        {todaysRoutes
                          .filter(r => r.status !== 'COMPLETADO' && r.status !== 'EN_CURSO')
                          .map((route) => {
                          const isDelayed = route.status === 'PLANIFICADO' && new Date(route.scheduled_date + "T00:00:00") < new Date(today);
                          return (
                            <RouteCard 
                              key={route.id} 
                              route={route} 
                              isDelayed={isDelayed} 
                              inProgressRouteId={inProgressRoute?.id} 
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No tienes rutas pendientes para hoy.</p>
                    )}
                  </CardContent>
                </Card>
            </TabsContent>

            {/* Completed Today Tab */}
            <TabsContent value="completed" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Rutas Completadas</CardTitle>
                    <CardDescription>Rutas finalizadas en el día de hoy.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {todaysRoutes && todaysRoutes.filter(r => r.status === 'COMPLETADO').length > 0 ? (
                      <div className="space-y-4">
                        {todaysRoutes
                          .filter(r => r.status === 'COMPLETADO')
                          .map((route) => (
                            <RouteCard 
                              key={route.id} 
                              route={route} 
                              showMoneyCollected={true} 
                            />
                          ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No has completado ninguna ruta hoy.</p>
                    )}
                  </CardContent>
                </Card>
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
                      {routesSelectedDate.map((route) => (
                        <RouteCard 
                          key={route.id} 
                          route={route} 
                          showStatusBadge={true} 
                        />
                      ))}
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
     
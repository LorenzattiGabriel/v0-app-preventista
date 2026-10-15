import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, MapPin, ChevronLeft, ChevronRight, Clock, Truck } from "lucide-react"
import { RoutesFilterBar } from "@/components/admin/routes-filter-bar"
import { Suspense } from "react"

const PAGE_SIZE = 12

const STATUS_LABELS: Record<string, string> = {
  PLANIFICADO: "Planificado",
  EN_CURSO: "En Curso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PLANIFICADO: "secondary",
  EN_CURSO: "default",
  COMPLETADO: "outline",
  CANCELADO: "destructive",
}

interface SearchParams {
  status?: string
  search?: string
  date?: string
  page?: string
}

export default async function RoutesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const page = Math.max(1, parseInt(params.page ?? "1"))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Build query with filters
  let query = supabase
    .from("routes")
    .select(
      `
      id, route_code, status, scheduled_date, scheduled_start_time, scheduled_end_time,
      total_distance, estimated_duration, created_at,
      driver:profiles!routes_driver_id_fkey ( full_name ),
      route_orders ( id, orders ( total, status ) )
    `,
      { count: "exact" }
    )
    .order("scheduled_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (params.status) {
    query = query.eq("status", params.status)
  }

  if (params.date) {
    query = query.eq("scheduled_date", params.date)
  }

  if (params.search) {
    query = query.or(
      `route_code.ilike.%${params.search}%`
    )
  }

  const { data: routes, count } = await query.range(from, to)

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Cierres de caja de las rutas de esta página: aportan lo efectivamente
  // cobrado, que no se puede deducir de los pedidos.
  const routeIds = (routes || []).map((r: any) => r.id)
  const { data: closures } = routeIds.length
    ? await supabase
        .from("route_cash_closures")
        .select("route_id, route_collected, total_collected, debt_collected")
        .in("route_id", routeIds)
    : { data: [] }

  const closureByRoute = new Map(
    (closures || []).map((c: any) => [
      c.route_id,
      {
        // route_collected no existe en los cierres anteriores a la migración
        // add_debt_collection_to_cash_closure: ahí todo lo cobrado fue de la ruta.
        collected: Number(c.route_collected ?? c.total_collected ?? 0),
        debtCollected: Number(c.debt_collected ?? 0),
      },
    ]),
  )

  /** Monto de una ruta: lo despachado, lo entregado y lo cobrado. */
  function routeAmounts(route: any) {
    let dispatched = 0
    let delivered = 0
    for (const ro of route.route_orders || []) {
      const total = Number(ro.orders?.total) || 0
      dispatched += total
      if (ro.orders?.status === "ENTREGADO") delivered += total
    }
    const closure = closureByRoute.get(route.id)
    return {
      dispatched,
      delivered,
      collected: closure?.collected ?? 0,
      debtCollected: closure?.debtCollected ?? 0,
      hasClosure: Boolean(closure),
    }
  }

  // Subtotales por día: la mitad de los días tiene más de una ruta, y el admin
  // necesita el total del día, no el de cada reparto por separado.
  //
  // ⚠️ Se recalcula con TODAS las rutas de esas fechas, no con las de la página:
  // con 12 por página un día puede quedar partido entre dos páginas y el
  // subtotal saldría incompleto sin ninguna señal de que falta algo.
  const visibleDates = [...new Set((routes || []).map((r: any) => r.scheduled_date))]

  const { data: routesOfVisibleDates } = visibleDates.length
    ? await supabase
        .from("routes")
        .select("id, scheduled_date, route_orders ( id, orders ( total, status ) )")
        .in("scheduled_date", visibleDates)
    : { data: [] }

  const dayRouteIds = (routesOfVisibleDates || []).map((r: any) => r.id)
  const { data: dayClosures } = dayRouteIds.length
    ? await supabase
        .from("route_cash_closures")
        .select("route_id, route_collected, total_collected")
        .in("route_id", dayRouteIds)
    : { data: [] }

  const dayCollectedByRoute = new Map(
    (dayClosures || []).map((c: any) => [
      c.route_id,
      Number(c.route_collected ?? c.total_collected ?? 0),
    ]),
  )

  const dayTotals = new Map<
    string,
    { routes: number; stops: number; dispatched: number; delivered: number; collected: number }
  >()

  for (const route of (routesOfVisibleDates || []) as any[]) {
    let dispatched = 0
    let delivered = 0
    for (const ro of (route.route_orders || []) as any[]) {
      const total = Number(ro.orders?.total) || 0
      dispatched += total
      if (ro.orders?.status === "ENTREGADO") delivered += total
    }

    const current = dayTotals.get(route.scheduled_date) ?? {
      routes: 0,
      stops: 0,
      dispatched: 0,
      delivered: 0,
      collected: 0,
    }
    current.routes += 1
    current.stops += route.route_orders?.length ?? 0
    current.dispatched += dispatched
    current.delivered += delivered
    current.collected += dayCollectedByRoute.get(route.id) ?? 0
    dayTotals.set(route.scheduled_date, current)
  }

  const money = (n: number) =>
    `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams()
    if (params.status) sp.set("status", params.status)
    if (params.search) sp.set("search", params.search)
    if (params.date) sp.set("date", params.date)
    if (p > 1) sp.set("page", String(p))
    const qs = sp.toString()
    return `/admin/routes${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Rutas</h1>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/routes/generate-smart">+ Nueva Ruta</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-4 md:p-6">
        <div className="container mx-auto max-w-5xl space-y-4">

          {/* Filtros */}
          <div className="bg-background rounded-xl border p-4 shadow-sm">
            <Suspense>
              <RoutesFilterBar totalCount={totalCount} />
            </Suspense>
          </div>

          {/* Lista */}
          {routes && routes.length > 0 ? (
            <div className="space-y-2">
              {routes.map((route, index) => {
                const ordersCount = route.route_orders?.length ?? 0
                const status = route.status as string
                const amounts = routeAmounts(route)

                // Las rutas vienen ordenadas por fecha, así que el encabezado
                // del día se dibuja al cambiar de fecha respecto de la anterior.
                const previousDate = index > 0 ? routes[index - 1].scheduled_date : null
                const isNewDay = route.scheduled_date !== previousDate
                const day = dayTotals.get(route.scheduled_date)

                return (
                  <div key={route.id} className="space-y-2">
                  {isNewDay && day && (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 pt-4 first:pt-0">
                      <h2 className="text-sm font-semibold">
                        {new Date(route.scheduled_date + "T00:00:00").toLocaleDateString("es-AR", {
                          weekday: "long", day: "numeric", month: "long",
                        })}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {day.routes} {day.routes === 1 ? "ruta" : "rutas"} · {day.stops}{" "}
                          {day.stops === 1 ? "parada" : "paradas"}
                        </span>
                      </h2>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Total del día: </span>
                        <span className="font-bold">{money(day.dispatched)}</span>
                        {day.collected > 0 && (
                          <span className="text-muted-foreground">
                            {" "}· cobrado{" "}
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {money(day.collected)}
                            </span>
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  <div
                    className="bg-background rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    {/* Left: status indicator */}
                    <div className={`w-1.5 self-stretch rounded-full shrink-0 hidden sm:block ${
                      status === "EN_CURSO" ? "bg-primary" :
                      status === "COMPLETADO" ? "bg-green-500" :
                      status === "CANCELADO" ? "bg-destructive" :
                      "bg-muted-foreground/30"
                    }`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{route.route_code}</span>
                        <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
                          {STATUS_LABELS[status] ?? status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5" />
                          {route.driver?.full_name ?? "Sin repartidor"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {ordersCount} {ordersCount === 1 ? "parada" : "paradas"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(route.scheduled_date + "T00:00:00").toLocaleDateString("es-AR", {
                            weekday: "short", day: "numeric", month: "short"
                          })}
                          {route.scheduled_start_time && ` · ${route.scheduled_start_time.slice(0, 5)}`}
                        </span>
                        {route.total_distance && (
                          <span>{route.total_distance.toFixed(1)} km</span>
                        )}
                        {route.estimated_duration && (
                          <span>{Math.round(route.estimated_duration)} min</span>
                        )}
                      </div>
                    </div>

                    {/* Monto de la ruta */}
                    <div className="sm:text-right shrink-0">
                      <p className="font-bold">{money(amounts.dispatched)}</p>
                      {amounts.hasClosure ? (
                        <p className="text-xs text-muted-foreground">
                          cobrado{" "}
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {money(amounts.collected)}
                          </span>
                          {amounts.debtCollected > 0 && (
                            <> · deuda {money(amounts.debtCollected)}</>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">sin cierre de caja</p>
                      )}
                    </div>

                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link href={`/admin/routes/${route.id}`}>Ver detalle</Link>
                    </Button>
                  </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-background rounded-xl border flex flex-col items-center justify-center py-16 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No hay rutas con esos filtros</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Probá cambiando el estado o la fecha
              </p>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                asChild={page > 1}
                disabled={page <= 1}
              >
                {page > 1 ? (
                  <Link href={buildPageUrl(page - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Link>
                ) : (
                  <span>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </span>
                )}
              </Button>

              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                asChild={page < totalPages}
                disabled={page >= totalPages}
              >
                {page < totalPages ? (
                  <Link href={buildPageUrl(page + 1)}>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                ) : (
                  <span>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

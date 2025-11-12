import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"

export default async function RoutesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/auth/login")
  }

  // Get routes from database
  const { data: routes, error: routesError } = await supabase
    .from("routes")
    .select(
      `
      *,
      driver:profiles!routes_driver_id_fkey (
        full_name
      ),
      zone:zones (
        name
      ),
      route_orders (
        order:orders (
          id,
          order_number,
          customers (
            commercial_name
          )
        )
      )
    `,
    )
    .order("created_at", { ascending: false })

  // Debug logging
  console.log('📊 Rutas cargadas:', {
    count: routes?.length || 0,
    error: routesError,
    routes: routes?.slice(0, 2) // Solo las primeras 2 para no saturar logs
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Historial de Rutas</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/routes/generate-smart">Generar Nueva Ruta</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Rutas</CardTitle>
              <CardDescription>
                {routes?.length || 0} rutas registradas en la base de datos
                {routesError && <span className="text-destructive"> - Error: {routesError.message}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {routes && routes.length > 0 ? (
                <div className="space-y-4">
                  {routes.map((route) => (
                    <Card key={route.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{route.route_code}</h3>
                              <Badge
                                variant={
                                  route.status === "PLANIFICADO"
                                    ? "secondary"
                                    : route.status === "EN_CURSO"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {route.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Repartidor:</span> {route.driver?.full_name || "No asignado"}
                              </div>
                              <div>
                                <span className="font-medium">Zona:</span> {route.zone?.name || "Sin zona"}
                              </div>
                              <div>
                                <span className="font-medium">Fecha:</span>{" "}
                                {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
                              </div>
                              <div>
                                <span className="font-medium">Pedidos:</span> {route.route_orders?.length || 0}
                              </div>
                              {route.total_distance && (
                                <div>
                                  <span className="font-medium">Distancia:</span> {route.total_distance.toFixed(2)} km
                                </div>
                              )}
                              {route.estimated_duration && (
                                <div>
                                  <span className="font-medium">Duración:</span> {Math.round(route.estimated_duration)} min
                                </div>
                              )}
                            </div>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/routes/${route.id}`}>Ver Detalles</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay rutas creadas</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comienza generando tu primera ruta inteligente
                  </p>
                  <Button asChild>
                    <Link href="/admin/routes/generate-smart">Generar Ruta</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

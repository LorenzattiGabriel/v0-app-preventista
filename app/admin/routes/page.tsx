import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MapPin, Package, Truck } from "lucide-react"

export default async function AdminRoutesPage() {
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

  // Get all routes
  const { data: routes } = await supabase
    .from("routes")
    .select(
      `
      *,
      zones (
        name
      ),
      profiles!routes_driver_id_fkey (
        full_name
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
    .order("scheduled_date", { ascending: false })
    .order("scheduled_start_time", { ascending: true })
    .limit(50)

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
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Gestión de Rutas</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/routes/generate">Generar Nuevas Rutas</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Todas las Rutas</CardTitle>
              <CardDescription>Historial completo de rutas generadas</CardDescription>
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
                              <Truck className="h-4 w-4" />
                              <span>{route.profiles?.full_name || "Sin asignar"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              <span>
                                {deliveredOrders}/{totalOrders} entregas
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Fecha: {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
                            {route.scheduled_start_time && ` | Inicio: ${route.scheduled_start_time.slice(0, 5)}`}
                          </p>
                        </div>
                        <Button asChild variant="outline">
                          <Link href={`/admin/routes/${route.id}`}>Ver Detalle</Link>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay rutas registradas</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

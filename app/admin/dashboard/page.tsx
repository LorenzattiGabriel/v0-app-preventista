import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BarChart3, MapPin, Package, Truck, Users, FileText } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { RatingsMetrics } from "@/components/admin/ratings-metrics"
import { RatingsDateFilter } from "@/components/admin/ratings-date-filter"
import { Suspense } from "react"

interface SearchParams {
  start_date?: string
  end_date?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}



export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
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

  // Get statistics
  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

  const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true })

  const { count: pendingDelivery } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDIENTE_ENTREGA")

  const { count: tomorrowOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDIENTE_ENTREGA")
    .eq("delivery_date", tomorrow)

  const { count: todayRoutes } = await supabase
    .from("routes")
    .select("*", { count: "exact", head: true })
    .eq("scheduled_date", today)

  const { count: totalCustomers } = await supabase.from("customers").select("*", { count: "exact", head: true })

  const { count: activeDrivers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "repartidor")
    .eq("is_active", true)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sistema de Gestión - Administrativo</h1>
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
            <h2 className="text-3xl font-bold tracking-tight">Panel Administrativo</h2>
            <p className="text-muted-foreground">Gestión completa del sistema</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">En el sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes Entrega</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingDelivery || 0}</div>
                <p className="text-xs text-muted-foreground">Listos para repartir</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregas Mañana</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tomorrowOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Para {new Date(tomorrow).toLocaleDateString("es-AR")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rutas Hoy</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayRoutes || 0}</div>
                <p className="text-xs text-muted-foreground">Rutas activas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers || 0}</div>
                <p className="text-xs text-muted-foreground">Registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repartidores</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeDrivers || 0}</div>
                <p className="text-xs text-muted-foreground">Activos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Rutas</CardTitle>
                <CardDescription>Genera y administra rutas de entrega optimizadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full" size="lg">
                  <Link href="/admin/routes/generate-smart">Generar Rutas Inteligentes</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/routes">Ver Todas las Rutas</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gestión de Pedidos</CardTitle>
                <CardDescription>Administra todos los pedidos del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/orders">Ver Todos los Pedidos</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/orders?status=PENDIENTE_ENTREGA">Pedidos Pendientes</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reportes y Estadísticas</CardTitle>
                <CardDescription>Análisis y métricas del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/reports">
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Reportes
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Productos</CardTitle>
                <CardDescription>Administra productos e inventario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/products">
                    <Package className="mr-2 h-4 w-4" />
                    Ver Productos
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>Administra usuarios y permisos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/users">Ver Usuarios</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/admin/customers">Ver Clientes</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Customer Satisfaction Metrics */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Satisfacción del Cliente</h3>
              <p className="text-muted-foreground">Métricas de calificaciones y experiencia del cliente</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <RatingsDateFilter />
              </div>
              <div className="lg:col-span-3">
                <Suspense 
                  key={`${params.start_date}-${params.end_date}`}
                  fallback={<div className="text-center py-8 text-muted-foreground">Cargando métricas...</div>}
                >
                  <RatingsMetrics 
                    startDate={params.start_date} 
                    endDate={params.end_date}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

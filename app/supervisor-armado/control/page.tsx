import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ClipboardList, Package } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { OrdersFilters } from "@/components/admin/orders-filters"
import { OrdersList } from "@/components/admin/orders-list"
import { OrdersPagination } from "@/components/admin/orders-pagination"
import { createOrdersService } from "@/lib/services/ordersService"

interface SearchParams {
  status?: string
  priority?: string
  search?: string
  page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export const dynamic = "force-dynamic"

/**
 * Supervisor de Armado - Tablero de Control de Pedidos
 *
 * Vista read-only del estado e historial de pedidos relevantes al depósito.
 * Mismos filtros y paginación que la página de admin, pero sin acciones
 * sensibles (no facturas, no edición de pedidos).
 */
export default async function SupervisorArmadoControlPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "supervisor_armado") {
    redirect("/auth/login")
  }

  const ordersService = createOrdersService(supabase)
  const { orders, totalCount, totalPages, currentPage } = await ordersService.getOrders({
    status: params.status,
    priority: params.priority,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
  })

  const statusCounts = await ordersService.getOrderStats()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sistema de Gestión - Supervisor de Armado</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <Button variant="outline" asChild>
            <Link href="/supervisor-armado/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Panel
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Tablero de Control</h1>
              <p className="text-muted-foreground">
                Estado e historial de pedidos. Filtrá por estado, prioridad o búsqueda.
              </p>
            </div>
          </div>

          {/* Stats por estado relevantes al depósito */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            <StatsCard title="Total" value={totalCount} />
            <StatsCard title="Pendientes Armado" value={statusCounts?.PENDIENTE_ARMADO || 0} />
            <StatsCard title="En Armado" value={statusCounts?.EN_ARMADO || 0} />
            <StatsCard title="Listos Entrega" value={statusCounts?.PENDIENTE_ENTREGA || 0} />
            <StatsCard title="Esperando Stock" value={statusCounts?.ESPERANDO_STOCK || 0} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
              <CardDescription>
                {totalCount > 0
                  ? `${totalCount} pedido${totalCount === 1 ? "" : "s"} encontrado${totalCount === 1 ? "" : "s"}`
                  : "Sin pedidos para los filtros actuales"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <OrdersFilters basePath="/supervisor-armado/control" />
                {/* Para ver detalle del pedido reutilizamos la vista read-only
                    de armadores (/armado/orders/<id>/detalle), evitando el
                    auto-lock que dispara la página de armado. */}
                <OrdersList
                  orders={orders}
                  detailsBasePath="/armado/orders"
                  detailsSuffix="/detalle"
                />
                <OrdersPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  basePath="/supervisor-armado/control"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function StatsCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

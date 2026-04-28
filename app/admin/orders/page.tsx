import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Package, AlertTriangle, Receipt } from 'lucide-react'
import { createDelayedOrdersService } from '@/lib/services/delayedOrdersService'
import { OrdersFilters } from '@/components/admin/orders-filters'
import { OrdersList } from '@/components/admin/orders-list'
import { OrdersPagination } from '@/components/admin/orders-pagination'
import { createOrdersService } from '@/lib/services/ordersService'

interface SearchParams {
  status?: string
  priority?: string
  search?: string
  page?: string
  requires_invoice?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

/**
 * Admin Orders Page
 * Displays and manages all orders with filtering and pagination
 */
export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  
  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Authorization check
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'administrativo') {
    redirect('/auth/login')
  }

  // Fetch orders using service
  const ordersService = createOrdersService(supabase)
  const { orders, totalCount, totalPages, currentPage } = await ordersService.getOrders({
    status: params.status,
    priority: params.priority,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
    requires_invoice: params.requires_invoice === 'true' ? true : undefined,
  })

  // Fetch statistics
  const statusCounts = await ordersService.getOrderStats()

  // Fetch delayed orders count
  const delayedService = createDelayedOrdersService(supabase)
  const delayedCount = await delayedService.getDelayedOrdersCount()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Gestión de Pedidos</h1>
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
          {/* Back Button & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
            
            {delayedCount > 0 && (
              <Button variant="destructive" asChild>
                <Link href="/admin/orders/delayed">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Pedidos Retrasados ({delayedCount})
                </Link>
              </Button>
            )}
          </div>

          {/* Billing filter banner */}
          {params.requires_invoice === 'true' && (
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700">
              <Receipt className="h-5 w-5 text-orange-600 shrink-0" />
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-200">
                  Pendientes de Facturación
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Mostrando pedidos entregados que requieren factura ({totalCount})
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="ml-auto shrink-0">
                <Link href="/admin/orders">Ver todos</Link>
              </Button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <StatsCard
              title="Total Pedidos"
              value={totalCount}
            />
            <StatsCard
              title="Pendientes Armado"
              value={statusCounts?.PENDIENTE_ARMADO || 0}
            />
            <StatsCard
              title="Listos Entrega"
              value={statusCounts?.PENDIENTE_ENTREGA || 0}
            />
            <StatsCard
              title="Entregados"
              value={statusCounts?.ENTREGADO || 0}
            />
            <Link href="/admin/orders/delayed">
              <Card className={delayedCount > 0 ? "border-red-300 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium flex items-center gap-1 ${delayedCount > 0 ? "text-red-700" : ""}`}>
                    <AlertTriangle className="h-4 w-4" />
                    Retrasados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${delayedCount > 0 ? "text-red-700" : ""}`}>
                    {delayedCount}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Orders List with Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Todos los Pedidos</CardTitle>
              <CardDescription>
                Gestiona y visualiza todos los pedidos del sistema
                {totalCount > 0 && ` - ${totalCount} pedidos encontrados`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <OrdersFilters />

                {/* Orders List */}
                <OrdersList orders={orders} />

                {/* Pagination */}
                <OrdersPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

/**
 * Stats Card Component
 */
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

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Package, Search } from "lucide-react"

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; priority?: string }>
}) {
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

  // Build query
  let query = supabase
    .from("orders")
    .select(
      `
      *,
      customers (
        commercial_name,
        locality,
        email
      ),
      profiles:created_by (
        full_name
      )
    `,
    )

  if (params.status) {
    query = query.eq("status", params.status)
  }

  if (params.priority) {
    query = query.eq("priority", params.priority)
  }

  if (params.search) {
    query = query.or(`order_number.ilike.%${params.search}%,customers.commercial_name.ilike.%${params.search}%`)
  }

  const { data: orders } = await query.order("created_at", { ascending: false }).limit(100)

  const statusLabels = {
    BORRADOR: "Borrador",
    PENDIENTE_ARMADO: "Pendiente de Armado",
    EN_ARMADO: "En Armado",
    PENDIENTE_ENTREGA: "Listo para Entrega",
    EN_RUTA: "En Ruta",
    EN_REPARTICION: "En Reparto",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
    ESPERANDO_STOCK: "Esperando Stock",
  } as const

  const statusColors = {
    BORRADOR: "secondary",
    PENDIENTE_ARMADO: "secondary",
    EN_ARMADO: "default",
    PENDIENTE_ENTREGA: "default",
    EN_RUTA: "default",
    EN_REPARTICION: "default",
    ENTREGADO: "default",
    CANCELADO: "destructive",
    ESPERANDO_STOCK: "destructive",
  } as const

  const priorityLabels = {
    normal: "Normal",
    alta: "Alta",
    urgente: "Urgente",
  } as const

  const priorityColors = {
    normal: "secondary",
    alta: "default",
    urgente: "destructive",
  } as const

  // Count by status for stats
  const statusCounts = orders?.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

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
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pendientes Armado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts?.PENDIENTE_ARMADO || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Listos Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts?.PENDIENTE_ENTREGA || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Entregados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts?.ENTREGADO || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and List */}
          <Card>
            <CardHeader>
              <CardTitle>Todos los Pedidos</CardTitle>
              <CardDescription>
                Gestiona y visualiza todos los pedidos del sistema
                {params.status && ` - Filtrando por: ${statusLabels[params.status as keyof typeof statusLabels]}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <form className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="search"
                      placeholder="Buscar por número de pedido o cliente..."
                      className="pl-10"
                      defaultValue={params.search}
                    />
                  </div>
                  <Select name="status" defaultValue={params.status || "all"}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="BORRADOR">Borrador</SelectItem>
                      <SelectItem value="PENDIENTE_ARMADO">Pendiente Armado</SelectItem>
                      <SelectItem value="EN_ARMADO">En Armado</SelectItem>
                      <SelectItem value="PENDIENTE_ENTREGA">Pendiente Entrega</SelectItem>
                      <SelectItem value="EN_RUTA">En Ruta</SelectItem>
                      <SelectItem value="EN_REPARTICION">En Reparto</SelectItem>
                      <SelectItem value="ENTREGADO">Entregado</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      <SelectItem value="ESPERANDO_STOCK">Esperando Stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select name="priority" defaultValue={params.priority || "all"}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit">
                    <Search className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                </form>

                {/* Orders List */}
                {orders && orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-lg">{order.order_number}</span>
                            <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                              {statusLabels[order.status as keyof typeof statusLabels]}
                            </Badge>
                            <Badge variant={priorityColors[order.priority as keyof typeof priorityColors]}>
                              {priorityLabels[order.priority as keyof typeof priorityLabels]}
                            </Badge>
                            {order.has_shortages && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Con Faltantes
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              Cliente: <span className="text-foreground">{order.customers?.commercial_name}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Ubicación: {order.customers?.locality}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Pedido: {new Date(order.order_date).toLocaleDateString("es-AR")}</span>
                              <span>Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")}</span>
                              <span className="font-medium">Total: ${order.total.toFixed(2)}</span>
                            </div>
                            {order.profiles && (
                              <p className="text-xs text-muted-foreground">
                                Creado por: {order.profiles.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button asChild variant="outline">
                          <Link href={`/admin/orders/${order.id}`}>Ver Detalles</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No se encontraron pedidos</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {params.status || params.search
                        ? "Intenta cambiar los filtros de búsqueda"
                        : "No hay pedidos en el sistema"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}


import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Clock, CheckCircle } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { PaginatedOrdersList } from "@/components/armado/paginated-orders-list"

export default async function ArmadoDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "encargado_armado") {
    redirect("/auth/login")
  }

  // Get pending orders with customer info
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      *,
      customers (
        commercial_name,
        locality
      )
    `,
    )
    .in("status", ["PENDIENTE_ARMADO", "EN_ARMADO", "PENDIENTE_ENTREGA"])
    .order("priority", { ascending: false })
    .order("delivery_date", { ascending: true })
    .limit(100)

  const safeOrders = orders || [];
  const today = new Date().toISOString().split("T")[0];

  const finishedToday = safeOrders.filter(o =>
    o.status === "PENDIENTE_ENTREGA" &&
    o.assembly_completed_at?.startsWith(today)
  );

  const pending = safeOrders.filter(o => o.status === "PENDIENTE_ARMADO");
  const inProgress = safeOrders.filter(o => o.status === "EN_ARMADO");

  const priorityColors = {
    urgente: "destructive",
    alta: "destructive",
    media: "default",
    normal: "secondary",
    baja: "secondary",
  } as const

  const statusLabels = {
    PENDIENTE_ARMADO: "Pendiente",
    EN_ARMADO: "En Proceso",
    ESPERANDO_STOCK: "Esperando Stock",
  } as const


  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sistema de Gestión - Armado</h1>
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
            <h2 className="text-3xl font-bold tracking-tight">Panel de Armado</h2>
            <p className="text-muted-foreground">Gestiona el armado de pedidos</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{pending.length}</div>
                <p className="text-xs text-muted-foreground">Por armar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{inProgress.length}</div>
                <p className="text-xs text-muted-foreground">Armando ahora</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completados Hoy</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{finishedToday.length}</div>
                <p className="text-xs text-muted-foreground">Finalizados hoy</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos por Armar</CardTitle>
              <CardDescription>Ordenados por prioridad y fecha de entrega</CardDescription>
            </CardHeader>
            <CardContent>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pendientes - con paginación */}
                <PaginatedOrdersList
                  orders={pending}
                  userId={user.id}
                  itemsPerPage={10}
                  title="Pendientes"
                  emptyMessage="No hay pedidos pendientes"
                  variant="pending"
                />

                {/* En Proceso - con paginación */}
                <PaginatedOrdersList
                  orders={inProgress}
                  userId={user.id}
                  itemsPerPage={10}
                  title="En Proceso"
                  emptyMessage="No hay pedidos en proceso"
                  variant="inProgress"
                />

                {/* Terminados Hoy - con paginación */}
                <PaginatedOrdersList
                  orders={finishedToday}
                  userId={user.id}
                  itemsPerPage={10}
                  title="Terminados Hoy"
                  emptyMessage="Ningún pedido terminado hoy"
                  variant="finished"
                />
              </div>


            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, FileText, Clock, Calendar } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"

export default async function PreventistaDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "preventista") {
    redirect("/auth/login")
  }

  // Get statistics
  // Calcular inicio de la semana (lunes)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Si es domingo (0), retroceder 6 días
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() + diff)
  startOfWeek.setHours(0, 0, 0, 0)

  const { count: weekOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id)
    .gte("created_at", startOfWeek.toISOString())

  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id)

  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id)
    .eq("status", "PENDIENTE_ARMADO")

  const { count: draftOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id)
    .eq("status", "BORRADOR")

  return (
    <div className="flex min-h-screen flex-col">


      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
            <p className="text-muted-foreground">Bienvenido, {profile.full_name}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{weekOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Pedidos desde el lunes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Todos tus pedidos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders || 0}</div>
                <p className="text-xs text-muted-foreground">En espera de armado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Borradores</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{draftOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Pedidos sin confirmar</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>Gestiona pedidos y clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full" size="lg">
                  <Link href="/preventista/orders/new">Crear Nuevo Pedido</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/preventista/customers/new">Registrar Nuevo Cliente</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/preventista/orders">Ver Mis Pedidos</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/preventista/customers">Ver Clientes</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Borradores Recientes</CardTitle>
                <CardDescription>Pedidos sin confirmar</CardDescription>
              </CardHeader>
              <CardContent>
                {draftOrders && draftOrders > 0 ? (
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href="/preventista/orders/drafts">Ver Borradores ({draftOrders})</Link>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay borradores pendientes</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

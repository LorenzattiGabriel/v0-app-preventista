import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Users, FileText, Clock } from "lucide-react"

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

  const { count: totalCustomers } = await supabase.from("customers").select("*", { count: "exact", head: true })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sistema de Gestión - Preventista</h1>
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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
            <p className="text-muted-foreground">Bienvenido, {profile.full_name}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Pedidos creados por ti</p>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers || 0}</div>
                <p className="text-xs text-muted-foreground">Clientes registrados</p>
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
                    <Link href="/preventista/orders?status=BORRADOR">Ver Borradores ({draftOrders})</Link>
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

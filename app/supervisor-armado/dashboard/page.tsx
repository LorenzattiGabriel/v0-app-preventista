import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { ClipboardList, UserCheck, Package, ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SupervisorArmadoDashboardPage() {
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

  // Stats rápidas para el dashboard
  const [{ count: pendingCount }, { count: inProgressCount }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDIENTE_ARMADO"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "EN_ARMADO"),
  ])

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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Panel del Supervisor</h2>
            <p className="text-muted-foreground">
              Asigná pedidos, controlá el estado del depósito y armá pedidos como un armador más.
            </p>
          </div>

          {/* Resumen */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pendientes</CardDescription>
                <CardTitle className="text-3xl">{pendingCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>En armado</CardDescription>
                <CardTitle className="text-3xl">{inProgressCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Accesos */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Asignar pedidos</CardTitle>
                </div>
                <CardDescription>
                  Distribuí los pedidos pendientes entre los armadores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/supervisor-armado/asignar">
                    Ir a asignación <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Tablero de control</CardTitle>
                </div>
                <CardDescription>
                  Estado e historial de pedidos con filtros y paginación.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/supervisor-armado/control">
                    Ver tablero <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Armar pedidos</CardTitle>
                </div>
                <CardDescription>
                  Autoasignate un pedido y armalo como un armador más.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/armado/dashboard">
                    Ir a armado <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

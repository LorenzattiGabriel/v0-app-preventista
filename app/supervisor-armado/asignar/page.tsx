import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserCheck, Package } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { AssignOrdersClient } from "@/components/admin/assign-orders-client"

export const dynamic = "force-dynamic"

export default async function SupervisorArmadoAssignPage() {
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

  // Pedidos PENDIENTE_ARMADO (mismo data fetch que admin/orders/assign)
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      delivery_date,
      priority,
      total,
      assembled_by,
      early_assembly_allowed,
      customer:customers (
        commercial_name,
        locality
      )
    `
    )
    .eq("status", "PENDIENTE_ARMADO")
    .order("priority", { ascending: false })
    .order("delivery_date", { ascending: true })

  // Lista de armadores disponibles. Incluimos también a los supervisores de
  // armado para que un supervisor pueda asignarse pedidos a sí mismo o a otros
  // supervisores cuando hace falta refuerzo.
  const { data: armadores } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("role", ["encargado_armado", "supervisor_armado"])
    .order("full_name")

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
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/supervisor-armado/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
              </Link>
            </Button>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Asignar Pedidos a Armadores</h1>
              <p className="text-muted-foreground">
                Distribuí los pedidos pendientes entre los armadores para que tengan su cola lista
              </p>
            </div>
          </div>

          <AssignOrdersClient orders={orders || []} armadores={armadores || []} />
        </div>
      </main>
    </div>
  )
}

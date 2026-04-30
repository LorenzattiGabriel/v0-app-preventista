import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { DashboardTabs } from "@/components/armado/dashboard-tabs"
import { MergeableOrdersBanner } from "@/components/armado/mergeable-orders-banner"
import { findMergeableGroups } from "@/lib/utils/mergeable-orders"

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

  // Pendientes: solo los visibles para este armador
  // - Asignados a mí
  // - Sin asignar (cualquier armador puede tomarlos)
  // Excluye los asignados a OTROS armadores
  const allPending = safeOrders.filter(o => o.status === "PENDIENTE_ARMADO");
  const assignedToMe = allPending.filter(o => o.assembled_by === user.id);
  const unassigned = allPending.filter(o => !o.assembled_by);
  const pending = [...assignedToMe, ...unassigned]; // visible total

  const inProgress = safeOrders.filter(o => o.status === "EN_ARMADO" && o.assembled_by === user.id);

  // Detectar pedidos fusionables del mismo cliente (solo entre los visibles)
  const mergeableGroups = findMergeableGroups(pending);

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

          {/* Banner de pedidos fusionables */}
          <MergeableOrdersBanner groups={mergeableGroups} />

          <Card>
            <CardHeader>
              <CardTitle>Pedidos por Armar</CardTitle>
              <CardDescription>
                Tocá una pestaña para filtrar la vista. Cada lista tiene búsqueda por
                número, cliente o localidad.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardTabs
                assignedToMe={assignedToMe}
                unassigned={unassigned}
                inProgress={inProgress}
                finished={finishedToday}
                userId={user.id}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

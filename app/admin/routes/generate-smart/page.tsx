import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SmartRouteGenerator } from "@/components/admin/smart-route-generator"

export default async function GenerateSmartRoutesPage() {
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

  // Get active drivers
  const { data: drivers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "repartidor")
    .eq("is_active", true)
    .order("full_name")

  // Get all pending orders (filter will be done in the component)
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (*),
      customers (
        *,
        zones (
          name
        )
      )
    `,
    )
    .eq("status", "PENDIENTE_ENTREGA")
    .order("delivery_date", { ascending: true })

  // Pedidos ya asignados a rutas activas (PLANIFICADO/EN_CURSO).
  // Why: evitar que el admin los seleccione y reciba error recién al crear la ruta;
  // los mostramos deshabilitados con badge del route_code.
  const { data: assignedRouteOrders } = await supabase
    .from("route_orders")
    .select("order_id, routes!inner(route_code, status)")
    .in("routes.status", ["PLANIFICADO", "EN_CURSO"])

  const activeRouteAssignments: Record<string, string> = {}
  for (const row of assignedRouteOrders || []) {
    const code = (row.routes as any)?.route_code
    if (row.order_id && code) activeRouteAssignments[row.order_id] = code
  }

  // Get active depot configuration
  const { data: depot } = await supabase
    .from("depot_configuration")
    .select("*")
    .eq("is_active", true)
    .single()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Generar Rutas Inteligentes</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-4xl">
          <SmartRouteGenerator
            drivers={drivers || []}
            pendingOrders={pendingOrders || []}
            userId={user.id}
            depot={depot}
            activeRouteAssignments={activeRouteAssignments}
          />
        </div>
      </main>
    </div>
  )
}




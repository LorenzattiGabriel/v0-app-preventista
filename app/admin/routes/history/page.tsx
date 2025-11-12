import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RouteHistoryDashboard } from "@/components/admin/route-history-dashboard"

export default async function RouteHistoryPage() {
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

  // Get all routes from local database with related data
  const { data: localRoutes } = await supabase
    .from("routes")
    .select(`
      *,
      driver:profiles!routes_driver_id_fkey (
        id,
        full_name,
        email
      ),
      zone:zones (
        id,
        name
      ),
      route_orders (
        id,
        order_id,
        delivery_order,
        orders (
          id,
          order_number,
          total_amount,
          customers (
            commercial_name,
            name
          )
        )
      )
    `)
    .order("scheduled_date", { ascending: false })

  // Get all drivers for filter
  const { data: drivers } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "repartidor")
    .eq("is_active", true)
    .order("full_name")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Historial de Rutas</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto">
          <RouteHistoryDashboard
            localRoutes={localRoutes || []}
            drivers={drivers || []}
          />
        </div>
      </main>
    </div>
  )
}


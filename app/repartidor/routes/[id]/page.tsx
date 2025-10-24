import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DeliveryRouteView } from "@/components/repartidor/delivery-route-view"

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "repartidor") {
    redirect("/auth/login")
  }

  // Get route with all details
  const { data: route } = await supabase
    .from("routes")
    .select(
      `
      *,
      zones (
        name
      ),
      route_orders (
        *,
        orders (
          *,
          customers (
            *
          ),
          order_items (
            *,
            products:product_id (
              *
            )
          )
        )
      )
    `,
    )
    .eq("id", id)
    .eq("driver_id", user.id)
    .single()

  if (!route) {
    redirect("/repartidor/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Ruta - {route.route_code}</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-5xl">
          <DeliveryRouteView route={route} userId={user.id} />
        </div>
      </main>
    </div>
  )
}

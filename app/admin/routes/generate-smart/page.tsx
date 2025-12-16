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
          />
        </div>
      </main>
    </div>
  )
}




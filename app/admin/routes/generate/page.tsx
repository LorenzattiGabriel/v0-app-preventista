import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RouteGeneratorForm } from "@/components/admin/route-generator-form"

export default async function GenerateRoutesPage() {
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

  // Get zones
  const { data: zones } = await supabase.from("zones").select("*").eq("is_active", true).order("name")

  // Get active drivers
  const { data: drivers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "repartidor")
    .eq("is_active", true)
    .order("full_name")

  // Get tomorrow's date as default
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

  // Get pending orders for tomorrow
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select(
      `
      *,
      customers (
        *,
        zones (
          name
        )
      )
    `,
    )
    .eq("status", "PENDIENTE_ENTREGA")
    .eq("delivery_date", tomorrow)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Generar Rutas Automáticas</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-6xl">
          <RouteGeneratorForm
            zones={zones || []}
            drivers={drivers || []}
            pendingOrders={pendingOrders || []}
            userId={user.id}
          />
        </div>
      </main>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserCheck } from "lucide-react"
import Link from "next/link"
import { AssignOrdersClient } from "@/components/admin/assign-orders-client"

export const dynamic = "force-dynamic"

export default async function AssignOrdersPage() {
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

  if (!profile || profile.role !== "administrativo") {
    redirect("/auth/login")
  }

  // Pedidos PENDIENTE_ARMADO
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
      customer:customers (
        commercial_name,
        locality
      )
    `
    )
    .eq("status", "PENDIENTE_ARMADO")
    .order("priority", { ascending: false })
    .order("delivery_date", { ascending: true })

  // Armadores disponibles
  const { data: armadores } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "encargado_armado")
    .order("full_name")

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
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
  )
}

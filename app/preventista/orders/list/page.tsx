import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OrdersTable } from "./orders-table"
import { Package } from "lucide-react"

export default async function OrdersListPage() {
  const supabase = await createClient()

  // ---  OBTENER USUARIO  ---
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // ---  PERFIL DEL USUARIO  ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "preventista") {
    redirect("/auth/login")
  }

  // Traemos todos los pedidos asociados a este preventista
  // Traemos todos los pedidos asociados a este preventista
const { data: pedidos, error } = await supabase
  .from("orders")
  .select(`
    id,
    order_number,
    order_date,
    delivery_date,
    priority,
    order_type,
    status,
    subtotal,
    total,
    requires_invoice,
    has_shortages,
    created_by,
    customer:customers (
      id,
      commercial_name
    )
  `)
  .eq("created_by", profile.id)
  .order("created_at", { ascending: false })

  if (error) {
    console.error("Error al cargar pedidos:", error)
  }

  return (
    <div className="container mx-auto p-6">

      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Sistema de Gestión - Preventista</h1>
          </div>
        </div>
      </header>

      <main>
      <OrdersTable pedidos={pedidos || []} />
      </main>
    </div>
  )
}

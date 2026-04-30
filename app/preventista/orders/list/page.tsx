import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OrdersTable } from "./orders-table"
import { Package, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
    general_discount,
    total,
    requires_invoice,
    invoice_type,
    has_shortages,
    observations,
    payment_method,
    payment_status,
    has_time_restriction,
    delivery_window_start,
    delivery_window_end,
    time_restriction_notes,
    created_at,
    created_by,
    customer:customers (
      id,
      commercial_name,
      legal_name,
      phone,
      street,
      street_number,
      floor_apt,
      address_notes,
      locality,
      province,
      customer_type
    ),
    items:order_items (
      id,
      quantity_requested,
      unit_price,
      discount,
      subtotal,
      product:products (
        id,
        code,
        name,
        brand,
        unit_of_measure
      )
    )
  `)
  .eq("created_by", profile.id)
  .order("created_at", { ascending: false })

  if (error) {
    console.error("Error al cargar pedidos:", error)
  }

  return (
    <div className="container mx-auto p-6">

      <header className="border-b bg-background mb-6">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/preventista/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Mis Pedidos</h1>
            </div>
          </div>
        </div>
      </header>

      <main>
      <OrdersTable pedidos={pedidos || []} />
      </main>
    </div>
  )
}

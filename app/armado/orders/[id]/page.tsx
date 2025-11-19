import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AssemblyForm } from "@/components/armado/assembly-form"

export default async function AssemblyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // Get order with all details
  const { data: order } = await supabase
    .from("orders")
    .select(
      `
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
    `,
    )
    .eq("id", id)
    .single()

  if (!order) {
    redirect("/armado/dashboard")
  }

  const isLocked =
    order.status === "EN_ARMADO" &&
    order.assembled_by &&
    order.assembled_by !== user.id;

  // Get all products for substitution
  const { data: products } = await supabase.from("products").select("*").eq("is_active", true).order("name")


  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Armar Pedido - {order.order_number}</h1>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-5xl">
          <AssemblyForm
            order={order}
            products={products || []}
            userId={user.id}
            isLocked={isLocked}
          />
        </div>
      </main>
    </div>
  )
}

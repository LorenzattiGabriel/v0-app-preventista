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

  // 🆕 Bloquear armado anticipado: solo permite armar si delivery_date <= mañana
  // o si el admin lo habilitó manualmente con early_assembly_allowed = true.
  // Solo bloqueamos si está PENDIENTE_ARMADO (si ya está EN_ARMADO, ya pasó el control).
  if (order.status === "PENDIENTE_ARMADO" && !order.early_assembly_allowed) {
    const todayStr = new Date().toISOString().split("T")[0]
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0]
    const deliveryDate = order.delivery_date
    if (deliveryDate && deliveryDate > tomorrowStr) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-blue-50 border border-blue-300 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Armado anticipado bloqueado
            </h2>
            <p className="text-sm text-blue-800 mb-2">
              Este pedido tiene fecha de entrega <strong>{new Date(deliveryDate).toLocaleDateString("es-AR")}</strong>.
              Solo se puede armar pedidos con entrega hasta <strong>{new Date(tomorrowStr).toLocaleDateString("es-AR")}</strong>.
            </p>
            <p className="text-xs text-blue-700">
              Si necesitás armarlo antes, pedile al administrador que lo habilite manualmente.
            </p>
            <a
              href="/armado/dashboard"
              className="inline-block mt-4 px-4 py-2 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
            >
              Volver al dashboard
            </a>
          </div>
        </div>
      )
    }
  }

  // 🆕 Bloquear acceso si está PRE-ASIGNADO a otro armador
  // (PENDIENTE_ARMADO + assembled_by != current_user)
  if (
    order.status === "PENDIENTE_ARMADO" &&
    order.assembled_by &&
    order.assembled_by !== user.id
  ) {
    const { data: assignedUser } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.assembled_by)
      .single()
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Pedido asignado a otro armador
          </h2>
          <p className="text-sm text-yellow-800">
            Este pedido fue asignado a <strong>{assignedUser?.full_name || "otro armador"}</strong>.
            Solo el administrador puede reasignarlo.
          </p>
          <a
            href="/armado/dashboard"
            className="inline-block mt-4 px-4 py-2 bg-yellow-700 text-white rounded-md text-sm hover:bg-yellow-800"
          >
            Volver al dashboard
          </a>
        </div>
      </div>
    )
  }

  // 🆕 CRITICAL-1: Auto-lock order when opened
  // If order is PENDIENTE_ARMADO (sin asignar O asignado a mí mismo), change to EN_ARMADO
  if (order.status === "PENDIENTE_ARMADO") {
    const { error: lockError } = await supabase
      .from("orders")
      .update({
        status: "EN_ARMADO",
        assembled_by: user.id,
        assembly_started_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (lockError) {
      console.error("Error locking order:", lockError)
    } else {
      // Create history entry
      await supabase.from("order_history").insert({
        order_id: order.id,
        previous_status: "PENDIENTE_ARMADO",
        new_status: "EN_ARMADO",
        changed_by: user.id,
        change_reason: "Pedido tomado para armado",
      })

      // Update local order object
      order.status = "EN_ARMADO"
      order.assembled_by = user.id
      order.assembly_started_at = new Date().toISOString()
    }
  }

  // Check if order is locked by another user
  const isLocked = order.status === "EN_ARMADO" && order.assembled_by && order.assembled_by !== user.id

  // Get assembler info if locked
  let lockedByUser = null
  if (isLocked && order.assembled_by) {
    const { data: assembler } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", order.assembled_by)
      .single()
    lockedByUser = assembler
  }

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
            lockedByUser={lockedByUser}
          />
        </div>
      </main>
    </div>
  )
}

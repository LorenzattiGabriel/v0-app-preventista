import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { NewOrderForm } from "@/components/preventista/new-order-form"
import { Button } from "@/components/ui/button"
import { buildOrderTemplate } from "@/lib/utils/order-template"
import { getLocalTomorrowDateString } from "@/lib/utils/dates"
import { toNum } from "@/lib/utils/cart-calculations"

interface NewOrderFromExistingPageProps {
  params: {
    id: string
  }
}

/**
 * Crea un pedido NUEVO precargado con los datos de uno existente.
 *
 * Igual que el flujo de editar borrador, pero sin pasarle `orderId` al form:
 * eso es lo que hace que `saveOrder` genere un número nuevo e inserte en vez
 * de actualizar. El pedido original queda intacto.
 */
export default async function NewOrderFromExistingPage({ params }: NewOrderFromExistingPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "preventista") {
    redirect("/auth/login")
  }

  // Pedido origen: cualquier estado y cualquier autor. El preventista puede
  // basarse en cualquier pedido del cliente, no sólo en los que cargó él.
  const { data: sourceOrder, error: sourceOrderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      order_date,
      customer_id,
      priority,
      order_type,
      requires_invoice,
      invoice_type,
      payment_method,
      observations,
      general_discount,
      has_time_restriction,
      delivery_window_start,
      delivery_window_end,
      time_restriction_notes,
      order_items (
        product_id,
        quantity_requested,
        unit_price,
        discount,
        subtotal,
        sale_unit
      )
    `,
    )
    .eq("id", id)
    .single()

  if (sourceOrderError || !sourceOrder) {
    console.error("Error fetching source order:", sourceOrderError)
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 bg-muted/40 p-6">
          <div className="container mx-auto max-w-3xl space-y-4 text-center">
            <p className="text-destructive">
              No se pudo cargar el pedido de referencia. Puede que no exista o que no tengas acceso.
            </p>
            <Button asChild variant="outline">
              <Link href="/preventista/orders/new">Crear un pedido desde cero</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("commercial_name")

  const { data: products } = await supabase.from("products").select("*").eq("is_active", true).order("name")

  const selectedCustomer = customers?.find((c) => c.id === sourceOrder.customer_id) || null

  const warnings: string[] = []
  if (!selectedCustomer) {
    warnings.push("El cliente del pedido original ya no está activo. Seleccioná otro cliente antes de continuar.")
  }

  const template = buildOrderTemplate(sourceOrder.order_items || [], products || [], selectedCustomer)

  const initialOrderData = {
    orderNumber: sourceOrder.order_number,
    selectedCustomer,
    // La fecha del pedido original ya pasó en la mayoría de los casos y el input
    // tiene `min` = hoy, así que arrancamos siempre en mañana.
    deliveryDate: getLocalTomorrowDateString(),
    priority: sourceOrder.priority,
    orderType: sourceOrder.order_type,
    requiresInvoice: sourceOrder.requires_invoice,
    invoiceType: sourceOrder.invoice_type,
    observations: sourceOrder.observations || "",
    // orders.general_discount se persiste como monto en pesos → discountType "fixed".
    generalDiscount: toNum(sourceOrder.general_discount),
    discountType: "fixed" as const,
    paymentMethod: sourceOrder.payment_method,
    orderItems: template.items,
    hasTimeRestriction: sourceOrder.has_time_restriction,
    deliveryWindowStart: sourceOrder.delivery_window_start,
    deliveryWindowEnd: sourceOrder.delivery_window_end,
    timeRestrictionNotes: sourceOrder.time_restriction_notes,
  }

  return (
    <div className="flex min-h-screen flex-col">
      <section className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-5xl">
          <NewOrderForm
            customers={customers || []}
            products={products || []}
            userId={user.id}
            initialOrderData={initialOrderData}
            mode="from-order"
            sourceOrder={{ orderNumber: sourceOrder.order_number, date: sourceOrder.order_date }}
            templateWarnings={[...warnings, ...template.warnings]}
          />
        </div>
      </section>
    </div>
  )
}

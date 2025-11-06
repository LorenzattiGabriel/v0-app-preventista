
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewOrderForm } from "@/components/preventista/new-order-form"

interface DraftOrderPageProps {
  params: {
    id: string
  }
}

export default async function DraftOrderPage({ params }: DraftOrderPageProps) {
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

  // Fetch the draft order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        id,
        product_id,
        quantity_requested,
        unit_price,
        discount,
        subtotal,
        products:products!order_items_product_id_fkey (
          name,
          brand
        )
      )
    `
    )
    .eq("id", id)
    .eq("created_by", user.id)
    .eq("status", "BORRADOR")
    .single()

  if (orderError || !order) {
    console.error("Error fetching draft order:", orderError)
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 bg-muted/40 p-6">
          <div className="container mx-auto max-w-3xl">
            <p className="text-center text-red-500">Error loading draft order. It may not exist or you do not have access to it.</p>
          </div>
        </main>
      </div>
    )
  }

  // Fetch customers and products
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("commercial_name")

  const { data: products } = await supabase.from("products").select("*").eq("is_active", true).order("name")

  // Prepare initial form data from the draft order
  const initialOrderData = {
    selectedCustomer: customers?.find((c) => c.id === order.customer_id) || null,
    deliveryDate: order.delivery_date,
    priority: order.priority,
    orderType: order.order_type,
    requiresInvoice: order.requires_invoice,
    observations: order.observations,
    generalDiscount: order.general_discount,
    orderItems: order.order_items.map((item: any) => ({
      productId: item.product_id,      productName: `${item.products?.name} ${item.products?.brand ? `- ${item.products?.brand}` : ""}`,
      quantity: item.quantity_requested,
      unitPrice: item.unit_price,
      discount: item.discount,
      subtotal: item.subtotal,
    })),
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
            // isEditingDraft={true}
            // draftId={params.id}
          />
        </div>
      </section>
    </div>
  )
}

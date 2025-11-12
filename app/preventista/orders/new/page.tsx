import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewOrderForm } from "@/components/preventista/new-order-form"

export default async function NewOrderPage() {
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

  // Fetch customers and products
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("commercial_name")

  const { data: products } = await supabase.from("products").select("*").eq("is_active", true).order("name")

  return (
    <div className="flex min-h-screen flex-col">
      <section className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-5xl">
          <NewOrderForm customers={customers || []} products={products || []} userId={user.id} />
        </div>
      </section>
    </div>
  )
}

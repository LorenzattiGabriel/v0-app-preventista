import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DirectSaleForm } from "@/components/venta-directa/direct-sale-form"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function NuevaVentaDirectaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase.from("customers").select("*").eq("is_active", true).order("commercial_name"),
    supabase.from("products").select("*").eq("is_active", true).order("name"),
  ])

  return (
    <div className="container mx-auto max-w-5xl">
      <DirectSaleForm
        customers={customers || []}
        products={products || []}
      />
    </div>
  )
}

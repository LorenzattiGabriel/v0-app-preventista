import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StockHistoryView } from "@/components/admin/stock-history-view"

export default async function StockHistoryPage() {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Role check
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/")
  }

  // Get users for filter dropdown
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["administrativo", "encargado_armado"])
    .order("full_name")

  // Get products for filter dropdown
  const { data: products } = await supabase
    .from("products")
    .select("id, code, name")
    .eq("is_active", true)
    .order("name")
    .limit(500)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <StockHistoryView 
        users={users || []} 
        products={products || []} 
      />
    </div>
  )
}


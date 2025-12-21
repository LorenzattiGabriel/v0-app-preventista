import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StockCSVImport } from "@/components/admin/stock-csv-import"

export default async function ImportStockPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verificar que sea admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "administrativo") {
    redirect("/")
  }

  return (
    <div className="container mx-auto p-6">
      <StockCSVImport userId={user.id} />
    </div>
  )
}


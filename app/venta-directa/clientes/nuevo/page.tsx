import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewCustomerForm } from "@/components/preventista/new-customer-form"

// Reusa el mismo form de alta cliente del preventista para que los datos
// queden completos (dirección, CUIT, condición IVA) y la próxima vez que
// el cliente pida por preventista ya esté todo cargado.

export const dynamic = "force-dynamic"

export default async function NuevoClienteVentaDirectaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("is_active", true)
    .order("name")

  return (
    <main className="flex-1 bg-muted/40 p-6">
      <div className="container mx-auto max-w-3xl">
        <NewCustomerForm zones={zones || []} userId={user.id} />
      </div>
    </main>
  )
}

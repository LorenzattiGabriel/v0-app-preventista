import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditCustomerForm } from "@/components/shared/edit-customer-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditCustomerPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Profile check
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/auth/login")
  }

  // Get customer
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single()

  if (customerError || !customer) {
    redirect("/admin/customers")
  }

  // Get zones
  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("is_active", true)
    .order("name")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Editar Cliente</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-4 sm:p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <EditCustomerForm 
            customer={customer} 
            zones={zones || []} 
            returnUrl={`/admin/customers/${id}`}
          />
        </div>
      </main>
    </div>
  )
}



import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewCustomerForm } from "@/components/preventista/new-customer-form"

export default async function NewCustomerPage() {
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

  const { data: zones } = await supabase.from("zones").select("*").eq("is_active", true).order("name")

  return (
    <div className="flex min-h-screen flex-col">
      {/* <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-semibold">Registrar Nuevo Cliente</h1>
        </div>
      </header> */}

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-3xl">
          <NewCustomerForm zones={zones || []} userId={user.id} />
        </div>
      </main>
    </div>
  )
}

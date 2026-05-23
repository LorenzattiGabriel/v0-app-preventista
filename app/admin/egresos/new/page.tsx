import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createExpenseCategoriesService } from "@/lib/services/expenseCategoriesService"
import { createSuppliersService } from "@/lib/services/suppliersService"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ExpenseForm } from "@/components/admin/expenses/expense-form"

export default async function NewExpensePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/")

  const catService = createExpenseCategoriesService(supabase)
  const supService = createSuppliersService(supabase)
  const [categories, suppliers] = await Promise.all([
    catService.getActiveCategories(),
    supService.getActiveSuppliers(),
  ])

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/egresos"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold">Nuevo Egreso</h1>
      </div>
      <ExpenseForm categories={categories} suppliers={suppliers} />
    </div>
  )
}

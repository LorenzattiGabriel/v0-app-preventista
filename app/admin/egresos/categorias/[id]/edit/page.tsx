import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createExpenseCategoriesService } from "@/lib/services/expenseCategoriesService"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ExpenseCategoryForm } from "@/components/admin/expenses/expense-category-form"

export default async function EditExpenseCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/")

  const service = createExpenseCategoriesService(supabase)
  const category = await service.getCategoryById(id)
  if (!category) notFound()

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/egresos/categorias"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold">Editar Categoría</h1>
      </div>
      <ExpenseCategoryForm category={category} />
    </div>
  )
}

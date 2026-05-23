import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  createExpenseCategoriesService,
  EXPENSE_CATEGORIES_PER_PAGE,
} from "@/lib/services/expenseCategoriesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ArrowLeft, Tags, CheckCircle2 } from "lucide-react"
import { ExpenseCategoriesFilters } from "@/components/admin/expenses/expense-categories-filters"
import { ExpenseCategoriesList } from "@/components/admin/expenses/expense-categories-list"
import { ExpensesPagination } from "@/components/admin/expenses/expenses-pagination"

export default async function ExpenseCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; expense_type?: string; is_active?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/")

  const service = createExpenseCategoriesService(supabase)
  const page = parseInt(params.page || "1")

  const [{ categories, total, totalPages }, stats] = await Promise.all([
    service.getCategories(
      {
        search: params.search,
        expense_type: params.expense_type as any,
        is_active: params.is_active,
      },
      page,
    ),
    service.getStats(),
  ])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/egresos"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Categorías de Egreso</h1>
            <p className="text-muted-foreground">Crea y administra categorías para clasificar tus egresos</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/egresos/categorias/new">
            <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.active}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fijos</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{stats.fijo}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Variables</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-600">{stats.variable}</div></CardContent>
        </Card>
      </div>

      <ExpenseCategoriesFilters />
      <ExpenseCategoriesList categories={categories} />
      <ExpensesPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        perPage={EXPENSE_CATEGORIES_PER_PAGE}
        itemLabel="categorías"
      />
    </div>
  )
}

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createExpensesService, EXPENSES_PER_PAGE } from "@/lib/services/expensesService"
import { createExpenseCategoriesService } from "@/lib/services/expenseCategoriesService"
import { createSuppliersService } from "@/lib/services/suppliersService"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, ArrowLeft, Tags, Users2 } from "lucide-react"
import { ExpensesFilters } from "@/components/admin/expenses/expenses-filters"
import { ExpensesList } from "@/components/admin/expenses/expenses-list"
import { ExpensesStats } from "@/components/admin/expenses/expenses-stats"
import { ExpensesPagination } from "@/components/admin/expenses/expenses-pagination"
import { startOfMonth, endOfMonth } from "date-fns"
import { formatDateLocal } from "@/lib/utils/dates"

export default async function ExpensesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    category_id?: string
    supplier_id?: string
    payment_method?: string
    expense_type?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/")

  const today = new Date()
  const defaultFrom = formatDateLocal(startOfMonth(today))
  const defaultTo = formatDateLocal(endOfMonth(today))
  const from = params.from || defaultFrom
  const to = params.to || defaultTo

  const expensesService = createExpensesService(supabase)
  const categoriesService = createExpenseCategoriesService(supabase)
  const suppliersService = createSuppliersService(supabase)

  const page = parseInt(params.page || "1")

  const [{ expenses, total, totalPages, totalAmount }, stats, activeCats, activeSups] = await Promise.all([
    expensesService.getExpenses(
      {
        search: params.search,
        category_id: params.category_id,
        supplier_id: params.supplier_id,
        payment_method: params.payment_method as any,
        expense_type: params.expense_type as any,
        from,
        to,
      },
      page,
    ),
    expensesService.getStats(from, to),
    categoriesService.getActiveCategories(),
    suppliersService.getActiveSuppliers(),
  ])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Egresos</h1>
            <p className="text-muted-foreground">Gestión de egresos de la distribuidora</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/egresos/categorias">
              <Tags className="mr-2 h-4 w-4" /> Categorías
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/egresos/proveedores">
              <Users2 className="mr-2 h-4 w-4" /> Proveedores
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/egresos/new">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Egreso
            </Link>
          </Button>
        </div>
      </div>

      <ExpensesStats stats={stats} />

      <ExpensesFilters categories={activeCats} suppliers={activeSups} />

      {/* Total del filtro actual */}
      <Card>
        <CardContent className="py-3 px-4 flex items-center justify-between bg-muted/30">
          <span className="text-sm font-medium">Total filtrado:</span>
          <span className="text-lg font-bold font-mono">
            ${totalAmount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </CardContent>
      </Card>

      <ExpensesList expenses={expenses} />
      <ExpensesPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        perPage={EXPENSES_PER_PAGE}
        itemLabel="egresos"
      />
    </div>
  )
}

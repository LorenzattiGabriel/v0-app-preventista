import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createSuppliersService } from "@/lib/services/suppliersService"
import { createExpensesService, EXPENSES_PER_PAGE } from "@/lib/services/expensesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Receipt, DollarSign } from "lucide-react"
import { ExpensesList } from "@/components/admin/expenses/expenses-list"
import { ExpensesPagination } from "@/components/admin/expenses/expenses-pagination"

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page: pageStr } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/")

  const supplierService = createSuppliersService(supabase)
  const supplier = await supplierService.getSupplierWithStats(id)
  if (!supplier) notFound()

  const expensesService = createExpensesService(supabase)
  const page = parseInt(pageStr || "1")
  const { expenses, total, totalPages } = await expensesService.getExpenses(
    { supplier_id: id },
    page,
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/egresos/proveedores"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{supplier.name}</h1>
              {!supplier.is_active && <Badge variant="outline" className="border-gray-300 text-gray-500">Inactivo</Badge>}
            </div>
            {supplier.tax_id && <p className="text-muted-foreground">CUIT: {supplier.tax_id}</p>}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/egresos/proveedores/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Egresos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{supplier.expense_count || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Egresado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(supplier.total_amount || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Teléfono</CardTitle></CardHeader>
          <CardContent><div className="text-sm">{supplier.phone || "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Email</CardTitle></CardHeader>
          <CardContent><div className="text-sm truncate">{supplier.email || "—"}</div></CardContent>
        </Card>
      </div>

      {supplier.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-line">{supplier.notes}</p></CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Egresos asociados</h2>
        <ExpensesList expenses={expenses} />
        <ExpensesPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          perPage={EXPENSES_PER_PAGE}
          itemLabel="egresos"
        />
      </div>
    </div>
  )
}

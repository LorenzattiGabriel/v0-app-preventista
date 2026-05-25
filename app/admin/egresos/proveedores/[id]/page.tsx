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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{supplier.name}</h1>
              {supplier.fiscal_condition && (
                <Badge variant="outline" className="font-mono">
                  {supplier.fiscal_condition}
                </Badge>
              )}
              {!supplier.is_active && <Badge variant="outline" className="border-gray-300 text-gray-500">Inactivo</Badge>}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {supplier.tax_id && <span>CUIT: {supplier.tax_id}</span>}
              {supplier.external_id && <span>· ID: {supplier.external_id}</span>}
            </div>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/egresos/proveedores/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Información</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Teléfono fijo" value={supplier.phone} />
            <InfoItem label="Celular" value={supplier.mobile} />
            <InfoItem label="Email" value={supplier.email} />
            <InfoItem label="Domicilio" value={supplier.address} />
            <InfoItem label="Localidad" value={supplier.locality} />
            <InfoItem label="Provincia" value={supplier.province} />
            <InfoItem
              label="Límite cta. corriente"
              value={
                supplier.credit_limit != null
                  ? `$${supplier.credit_limit.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : null
              }
            />
            <InfoItem label="Categoría" value={supplier.category} />
            <InfoItem label="Concepto SIAP" value={supplier.siap_concept} />
          </dl>
        </CardContent>
      </Card>

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

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

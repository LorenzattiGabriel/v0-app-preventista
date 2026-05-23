import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createSuppliersService, SUPPLIERS_PER_PAGE } from "@/lib/services/suppliersService"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import { SuppliersFilters } from "@/components/admin/expenses/suppliers-filters"
import { SuppliersList } from "@/components/admin/expenses/suppliers-list"
import { ExpensesPagination } from "@/components/admin/expenses/expenses-pagination"

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; is_active?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/")

  const service = createSuppliersService(supabase)
  const page = parseInt(params.page || "1")

  const { suppliers, total, totalPages } = await service.getSuppliers(
    {
      search: params.search,
      is_active: params.is_active,
    },
    page,
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/egresos"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Proveedores</h1>
            <p className="text-muted-foreground">Gestiona los proveedores de la distribuidora</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/egresos/proveedores/new">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
          </Link>
        </Button>
      </div>

      <SuppliersFilters />
      <SuppliersList suppliers={suppliers} />
      <ExpensesPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        perPage={SUPPLIERS_PER_PAGE}
        itemLabel="proveedores"
      />
    </div>
  )
}

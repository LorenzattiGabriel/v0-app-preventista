import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createSuppliersService } from "@/lib/services/suppliersService"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { SupplierForm } from "@/components/admin/expenses/supplier-form"

export default async function EditSupplierPage({
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

  const service = createSuppliersService(supabase)
  const supplier = await service.getSupplierById(id)
  if (!supplier) notFound()

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/egresos/proveedores"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-bold">Editar Proveedor</h1>
      </div>
      <SupplierForm supplier={supplier} />
    </div>
  )
}

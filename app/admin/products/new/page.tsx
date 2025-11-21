import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createProductsService } from "@/lib/services/productsService"
import { ProductForm } from "@/components/admin/product-form"

export default async function NewProductPage() {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Role check
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/")
  }

  // Get next product code
  const productsService = createProductsService(supabase)
  const nextCode = await productsService.getNextProductCode()

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nuevo Producto</h1>
        <p className="text-muted-foreground">Agrega un nuevo producto al catálogo</p>
      </div>

      <ProductForm initialCode={nextCode} />
    </div>
  )
}


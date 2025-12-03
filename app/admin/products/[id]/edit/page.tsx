import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createProductsService } from "@/lib/services/productsService"
import { ProductForm } from "@/components/admin/product-form"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // Get product
  const productsService = createProductsService(supabase)
  let product
  try {
    product = await productsService.getProductById(id)
  } catch (error) {
    redirect("/admin/products")
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Editar Producto</h1>
        <p className="text-muted-foreground">Modifica los detalles del producto</p>
      </div>

      <ProductForm product={product} initialCode={product.code} />
    </div>
  )
}


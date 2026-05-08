import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "administrativo") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get("search") || ""
  const brand = searchParams.get("brand") || ""
  const category = searchParams.get("category") || ""
  const isActive = searchParams.get("is_active") || "true"

  let query = supabase
    .from("products")
    .select("id, code, name, brand, category, unit_of_measure, base_price, wholesale_price, retail_price, is_active, current_stock")
    .order("brand", { ascending: true })
    .order("name", { ascending: true })

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,brand.ilike.%${search}%,code.ilike.%${search}%`,
    )
  }
  if (brand) query = query.eq("brand", brand)
  if (category) query = query.eq("category", category)
  if (isActive !== "all") query = query.eq("is_active", isActive === "true")

  const { data: products, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Unique brands and categories from all active products (for filter options)
  const { data: allProducts } = await supabase
    .from("products")
    .select("brand, category")
    .eq("is_active", true)

  const brands = [...new Set((allProducts || []).map((p) => p.brand).filter(Boolean))].sort()
  const categories = [...new Set((allProducts || []).map((p) => p.category).filter(Boolean))].sort()

  return NextResponse.json({ products: products || [], brands, categories })
}

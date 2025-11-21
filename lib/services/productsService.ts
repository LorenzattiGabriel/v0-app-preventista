import { SupabaseClient } from "@supabase/supabase-js"

export interface ProductFilters {
  search?: string
  category?: string
  is_active?: string
  low_stock?: boolean
}

export interface PaginatedProducts {
  products: any[]
  total: number
  page: number
  totalPages: number
}

export interface ProductStats {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalCategories: number
}

class ProductsService {
  constructor(private supabase: SupabaseClient) {}

  async getProducts(
    filters: ProductFilters = {},
    page: number = 1,
    perPage: number = 20,
  ): Promise<PaginatedProducts> {
    let query = this.supabase.from("products").select("*", { count: "exact" })

    // Apply filters
    if (filters.search) {
      query = query.or(
        `code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%,supplier.ilike.%${filters.search}%`,
      )
    }

    if (filters.category) {
      query = query.eq("category", filters.category)
    }

    if (filters.is_active !== undefined && filters.is_active !== "all") {
      query = query.eq("is_active", filters.is_active === "true")
    }

    // For low stock filter, we need to get all products and filter in JavaScript
    // because Supabase doesn't support comparing two columns directly
    if (filters.low_stock) {
      const { data: allProducts, error } = await query.order("name", { ascending: true })

      if (error) {
        console.error("Error fetching products:", error)
        throw error
      }

      // Filter products where current_stock <= min_stock
      const lowStockProducts = (allProducts || []).filter(
        (product) => product.current_stock <= product.min_stock
      )

      // Manual pagination
      const total = lowStockProducts.length
      const totalPages = Math.ceil(total / perPage)
      const from = (page - 1) * perPage
      const to = from + perPage
      const paginatedProducts = lowStockProducts.slice(from, to)

      return {
        products: paginatedProducts,
        total,
        page,
        totalPages,
      }
    }

    // Normal pagination for non-low-stock queries
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data: products, error, count } = await query.range(from, to).order("name", { ascending: true })

    if (error) {
      console.error("Error fetching products:", error)
      throw error
    }

    const totalPages = count ? Math.ceil(count / perPage) : 0

    return {
      products: products || [],
      total: count || 0,
      page,
      totalPages,
    }
  }

  async getProductStats(): Promise<ProductStats> {
    const { data: products, error } = await this.supabase.from("products").select("is_active, current_stock, min_stock, category")

    if (error) {
      console.error("Error fetching product stats:", error)
      return {
        totalProducts: 0,
        activeProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalCategories: 0,
      }
    }

    const totalProducts = products?.length || 0
    const activeProducts = products?.filter((p) => p.is_active).length || 0
    const lowStockProducts = products?.filter((p) => p.current_stock <= p.min_stock && p.current_stock > 0).length || 0
    const outOfStockProducts = products?.filter((p) => p.current_stock === 0).length || 0
    const categories = new Set(products?.map((p) => p.category).filter(Boolean))
    const totalCategories = categories.size

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalCategories,
    }
  }

  async getCategories(): Promise<string[]> {
    const { data: products, error } = await this.supabase.from("products").select("category").not("category", "is", null)

    if (error) {
      console.error("Error fetching categories:", error)
      return []
    }

    const categories = new Set(products?.map((p) => p.category).filter(Boolean))
    return Array.from(categories).sort()
  }

  async getProductById(id: string) {
    const { data: product, error } = await this.supabase.from("products").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching product:", error)
      throw error
    }

    return product
  }

  async getNextProductCode(): Promise<string> {
    const { data: products, error } = await this.supabase
      .from("products")
      .select("code")
      .like("code", "PROD-%")
      .order("code", { ascending: false })
      .limit(1)

    if (error || !products || products.length === 0) {
      return "PROD-0001"
    }

    const lastCode = products[0].code
    const match = lastCode.match(/PROD-(\d+)/)
    if (match) {
      const nextNumber = parseInt(match[1]) + 1
      return `PROD-${nextNumber.toString().padStart(4, "0")}`
    }

    return "PROD-0001"
  }
}

export function createProductsService(supabase: SupabaseClient) {
  return new ProductsService(supabase)
}

export const PRODUCTS_PER_PAGE = 20


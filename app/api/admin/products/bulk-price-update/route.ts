import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { StockMovementsService } from "@/lib/services/stockMovementsService"

/**
 * POST /api/admin/products/bulk-price-update
 * Actualiza precios masivamente por porcentaje.
 * Body: { product_ids: string[], percentage: number }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "administrativo") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { product_ids, percentage } = body

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar al menos un producto" }, { status: 400 })
    }

    if (typeof percentage !== "number" || percentage === 0) {
      return NextResponse.json({ error: "El porcentaje debe ser un número distinto de cero" }, { status: 400 })
    }

    // Fetch products
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, code, name, base_price, wholesale_price, retail_price, current_stock")
      .in("id", product_ids)

    if (fetchError || !products) {
      return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 })
    }

    const multiplier = 1 + percentage / 100
    const round2 = (n: number) => Math.round(n * 100) / 100

    // Build bulk update items
    const items = products.map((p) => ({
      productId: p.id,
      productCode: p.code,
      productName: p.name,
      currentStock: p.current_stock || 0,
      newStock: null,
      currentBasePrice: p.base_price,
      newBasePrice: round2(p.base_price * multiplier),
      currentWholesalePrice: p.wholesale_price,
      newWholesalePrice: p.wholesale_price ? round2(p.wholesale_price * multiplier) : null,
      currentRetailPrice: p.retail_price,
      newRetailPrice: p.retail_price ? round2(p.retail_price * multiplier) : null,
    }))

    const stockService = new StockMovementsService(supabase)
    const result = await stockService.bulkUpdateStock(
      items,
      user.id,
      `Actualización masiva de precios: ${percentage > 0 ? "+" : ""}${percentage}% por ${profile.full_name}`
    )

    return NextResponse.json({
      success: result.success,
      totalProcessed: result.totalProcessed,
      totalUpdated: result.totalUpdated,
      totalSkipped: result.totalSkipped,
      priceChanges: result.priceChanges,
      errors: result.errors,
      batchId: result.batchId,
    })
  } catch (error) {
    console.error("Error in bulk price update:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

import { SupabaseClient } from "@supabase/supabase-js"
import type { StockMovement, StockMovementType, StockMovementWithUser } from "@/lib/types/database"

// =====================================================
// Interfaces
// =====================================================

interface RecordMovementParams {
  productId: string
  productCode: string
  productName: string
  previousStock: number
  newStock: number
  movementType: StockMovementType
  createdBy: string
  notes?: string
  batchId?: string
  referenceId?: string
  referenceType?: string
}

interface BulkUpdateItem {
  productId: string
  productCode: string
  productName: string
  // Stock
  currentStock: number
  newStock: number | null
  // Precios
  currentBasePrice?: number | null
  newBasePrice?: number | null
  currentWholesalePrice?: number | null
  newWholesalePrice?: number | null
  currentRetailPrice?: number | null
  newRetailPrice?: number | null
}

interface BulkUpdateResult {
  success: boolean
  totalProcessed: number
  totalUpdated: number
  totalSkipped: number
  stockChanges: number
  priceChanges: number
  errors: Array<{ code: string; error: string }>
  batchId: string
}

interface HistoryFilters {
  productId?: string
  movementType?: StockMovementType
  userId?: string
  batchId?: string
  fromDate?: string
  toDate?: string
}

interface PaginatedHistory {
  movements: StockMovementWithUser[]
  total: number
  page: number
  totalPages: number
}

// =====================================================
// Service
// =====================================================

export class StockMovementsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Registra un movimiento de stock/precio individual
   */
  async recordMovement(params: RecordMovementParams): Promise<StockMovement> {
    const quantityChanged = params.newStock - params.previousStock

    const { data, error } = await this.supabase
      .from("stock_movements")
      .insert({
        product_id: params.productId,
        product_code: params.productCode,
        product_name: params.productName,
        previous_stock: params.previousStock,
        new_stock: params.newStock,
        quantity_changed: quantityChanged,
        movement_type: params.movementType,
        created_by: params.createdBy,
        notes: params.notes || null,
        batch_id: params.batchId || null,
        reference_id: params.referenceId || null,
        reference_type: params.referenceType || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualiza stock de un producto individual con auditoría
   */
  async updateProductStock(
    productId: string,
    newStock: number,
    userId: string,
    movementType: StockMovementType = "manual_edit",
    notes?: string
  ): Promise<{ product: any; movement: StockMovement }> {
    // 1. Obtener producto actual
    const { data: product, error: fetchError } = await this.supabase
      .from("products")
      .select("id, code, name, current_stock")
      .eq("id", productId)
      .single()

    if (fetchError || !product) {
      throw new Error(`Producto no encontrado: ${productId}`)
    }

    const previousStock = product.current_stock

    // 2. Actualizar stock del producto
    const { error: updateError } = await this.supabase
      .from("products")
      .update({ current_stock: newStock })
      .eq("id", productId)

    if (updateError) throw updateError

    // 3. Registrar movimiento
    const movement = await this.recordMovement({
      productId,
      productCode: product.code,
      productName: product.name,
      previousStock,
      newStock,
      movementType,
      createdBy: userId,
      notes,
    })

    return { product: { ...product, current_stock: newStock }, movement }
  }

  /**
   * Actualización masiva de stock Y precios (para importación CSV)
   */
  async bulkUpdateStock(
    items: BulkUpdateItem[],
    userId: string,
    notes?: string
  ): Promise<BulkUpdateResult> {
    // Generar batch ID único para esta importación
    const batchId = crypto.randomUUID()
    
    const result: BulkUpdateResult = {
      success: true,
      totalProcessed: items.length,
      totalUpdated: 0,
      totalSkipped: 0,
      stockChanges: 0,
      priceChanges: 0,
      errors: [],
      batchId,
    }

    for (const item of items) {
      try {
        // Verificar qué campos cambiaron
        const stockChanged = item.newStock !== null && item.currentStock !== item.newStock
        const basePriceChanged = item.newBasePrice !== null && item.newBasePrice !== undefined && 
                                  item.currentBasePrice !== item.newBasePrice
        const wholesalePriceChanged = item.newWholesalePrice !== null && item.newWholesalePrice !== undefined && 
                                       item.currentWholesalePrice !== item.newWholesalePrice
        const retailPriceChanged = item.newRetailPrice !== null && item.newRetailPrice !== undefined && 
                                    item.currentRetailPrice !== item.newRetailPrice

        const anyChange = stockChanged || basePriceChanged || wholesalePriceChanged || retailPriceChanged

        if (!anyChange) {
          result.totalSkipped++
          continue
        }

        // Preparar objeto de actualización
        const updateData: Record<string, any> = {}
        
        if (stockChanged) {
          updateData.current_stock = item.newStock
        }
        if (basePriceChanged) {
          updateData.base_price = item.newBasePrice
        }
        if (wholesalePriceChanged) {
          updateData.wholesale_price = item.newWholesalePrice
        }
        if (retailPriceChanged) {
          updateData.retail_price = item.newRetailPrice
        }

        // Actualizar producto
        const { error: updateError } = await this.supabase
          .from("products")
          .update(updateData)
          .eq("id", item.productId)

        if (updateError) {
          result.errors.push({ code: item.productCode, error: `Error actualizando: ${updateError.message}` })
          continue
        }

        // Registrar movimiento de stock
        if (stockChanged) {
          try {
            console.log(`[StockService] Registrando cambio stock: ${item.productCode} | ${item.currentStock} → ${item.newStock}`)
            await this.recordMovement({
              productId: item.productId,
              productCode: item.productCode,
              productName: item.productName,
              previousStock: item.currentStock,
              newStock: item.newStock!,
              movementType: "csv_import",
              createdBy: userId,
              notes: notes || `Importación CSV - Lote ${batchId.slice(0, 8)}`,
              batchId,
            })
            result.stockChanges++
            console.log(`[StockService] ✅ Stock registrado para ${item.productCode}`)
          } catch (movementError) {
            console.error(`[StockService] ❌ Error registrando stock para ${item.productCode}:`, movementError)
          }
        }

        // Registrar movimientos de precio (usando el mismo sistema pero con notas descriptivas)
        if (basePriceChanged || wholesalePriceChanged || retailPriceChanged) {
          try {
            const priceChanges: string[] = []
            if (basePriceChanged) priceChanges.push(`Base: $${item.currentBasePrice} → $${item.newBasePrice}`)
            if (wholesalePriceChanged) priceChanges.push(`Mayorista: $${item.currentWholesalePrice} → $${item.newWholesalePrice}`)
            if (retailPriceChanged) priceChanges.push(`Minorista: $${item.currentRetailPrice} → $${item.newRetailPrice}`)
            
            console.log(`[StockService] Registrando cambio precio: ${item.productCode} | ${priceChanges.join(', ')}`)
            
            // Usamos stock 0→0 para indicar que es un cambio de precio (no de stock)
            await this.recordMovement({
              productId: item.productId,
              productCode: item.productCode,
              productName: item.productName,
              previousStock: 0,
              newStock: 0,
              movementType: "manual_edit", // TODO: Agregar 'price_update' al enum
              createdBy: userId,
              notes: `💰 Actualización de precios: ${priceChanges.join(', ')}`,
              batchId,
            })
            result.priceChanges++
            console.log(`[StockService] ✅ Precio registrado para ${item.productCode}`)
          } catch (movementError) {
            console.error(`[StockService] ❌ Error registrando precio para ${item.productCode}:`, movementError)
          }
        }

        result.totalUpdated++
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        result.errors.push({
          code: item.productCode,
          error: errorMessage,
        })
      }
    }

    result.success = result.errors.length === 0

    return result
  }

  /**
   * Obtiene historial de movimientos con filtros y paginación
   */
  async getHistory(
    filters: HistoryFilters = {},
    page: number = 1,
    perPage: number = 20
  ): Promise<PaginatedHistory> {
    let query = this.supabase
      .from("stock_movements_with_user")
      .select("*", { count: "exact" })

    // Aplicar filtros
    if (filters.productId) {
      query = query.eq("product_id", filters.productId)
    }
    if (filters.movementType) {
      query = query.eq("movement_type", filters.movementType)
    }
    if (filters.userId) {
      query = query.eq("created_by", filters.userId)
    }
    if (filters.batchId) {
      query = query.eq("batch_id", filters.batchId)
    }
    if (filters.fromDate) {
      query = query.gte("created_at", filters.fromDate)
    }
    if (filters.toDate) {
      query = query.lte("created_at", filters.toDate)
    }

    // Ordenar y paginar
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    query = query.order("created_at", { ascending: false }).range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      movements: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / perPage),
    }
  }

  /**
   * Obtiene historial de un producto específico
   */
  async getProductHistory(productId: string, limit: number = 50): Promise<StockMovementWithUser[]> {
    const { data, error } = await this.supabase
      .from("stock_movements_with_user")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Obtiene resumen de un lote de importación
   */
  async getBatchSummary(batchId: string): Promise<{
    totalMovements: number
    totalIncrease: number
    totalDecrease: number
    createdAt: string | null
    userName: string | null
  }> {
    const { data, error } = await this.supabase
      .from("stock_movements_with_user")
      .select("quantity_changed, created_at, user_name")
      .eq("batch_id", batchId)

    if (error) throw error

    const movements = data || []
    
    return {
      totalMovements: movements.length,
      totalIncrease: movements
        .filter(m => m.quantity_changed > 0)
        .reduce((sum, m) => sum + m.quantity_changed, 0),
      totalDecrease: Math.abs(
        movements
          .filter(m => m.quantity_changed < 0)
          .reduce((sum, m) => sum + m.quantity_changed, 0)
      ),
      createdAt: movements[0]?.created_at || null,
      userName: movements[0]?.user_name || null,
    }
  }

  /**
   * Exporta historial a formato CSV
   */
  async exportHistoryToCSV(filters: HistoryFilters = {}): Promise<string> {
    const { movements } = await this.getHistory(filters, 1, 10000) // Max 10k registros

    const headers = [
      "Fecha",
      "Código",
      "Producto",
      "Stock Anterior",
      "Stock Nuevo",
      "Cambio",
      "Tipo",
      "Usuario",
      "Notas",
    ]

    const rows = movements.map(m => [
      new Date(m.created_at).toLocaleString("es-AR"),
      m.product_code,
      m.product_name,
      m.previous_stock.toString(),
      m.new_stock.toString(),
      m.quantity_changed > 0 ? `+${m.quantity_changed}` : m.quantity_changed.toString(),
      this.getMovementTypeLabel(m.movement_type),
      m.user_name || "Sistema",
      m.notes || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    return csvContent
  }

  /**
   * Obtiene etiqueta legible para tipo de movimiento
   */
  getMovementTypeLabel(type: StockMovementType): string {
    const labels: Record<StockMovementType, string> = {
      manual_edit: "Edición Manual",
      csv_import: "Importación CSV",
      order_assembly: "Armado de Pedido",
      inventory_adjustment: "Ajuste de Inventario",
      purchase_receipt: "Recepción de Compra",
      return: "Devolución",
      damage: "Baja por Daño",
      expiration: "Baja por Vencimiento",
    }
    return labels[type] || type
  }
}

// =====================================================
// Factory
// =====================================================

export function createStockMovementsService(supabase: SupabaseClient): StockMovementsService {
  return new StockMovementsService(supabase)
}

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
  currentStock: number
  newStock: number
}

interface BulkUpdateResult {
  success: boolean
  totalProcessed: number
  totalUpdated: number
  totalSkipped: number
  errors: Array<{ code: string; error: string }>
  batchId: string
}

interface StockHistoryFilters {
  productId?: string
  movementType?: StockMovementType
  userId?: string
  batchId?: string
  fromDate?: string
  toDate?: string
}

interface PaginatedStockHistory {
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
   * Registra un movimiento de stock individual
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
   * Actualización masiva de stock (para importación CSV)
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
      errors: [],
      batchId,
    }

    for (const item of items) {
      try {
        // Verificar si el stock cambió
        if (item.currentStock === item.newStock) {
          result.totalSkipped++
          continue
        }

        // Actualizar producto
        const { error: updateError } = await this.supabase
          .from("products")
          .update({ current_stock: item.newStock })
          .eq("id", item.productId)

        if (updateError) {
          result.errors.push({ code: item.productCode, error: `Error actualizando: ${updateError.message}` })
          continue
        }

        // Registrar movimiento
        try {
          console.log(`[StockService] Registrando movimiento: ${item.productCode} | ${item.currentStock} → ${item.newStock}`)
          await this.recordMovement({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            previousStock: item.currentStock,
            newStock: item.newStock,
            movementType: "csv_import",
            createdBy: userId,
            notes: notes || `Importación CSV - Lote ${batchId.slice(0, 8)}`,
            batchId,
          })
          console.log(`[StockService] ✅ Movimiento registrado para ${item.productCode}`)
        } catch (movementError) {
          // Si falla el registro de movimiento, loguear pero continuar
          console.error(`[StockService] ❌ Error registrando movimiento para ${item.productCode}:`, movementError)
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
  async getStockHistory(
    filters: StockHistoryFilters = {},
    page: number = 1,
    perPage: number = 20
  ): Promise<PaginatedStockHistory> {
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
  async exportHistoryToCSV(filters: StockHistoryFilters = {}): Promise<string> {
    const { movements } = await this.getStockHistory(filters, 1, 10000) // Max 10k registros

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

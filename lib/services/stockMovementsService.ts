import { SupabaseClient } from "@supabase/supabase-js"
import type { StockMovement, StockMovementType, StockMovementWithUser } from "@/lib/types/database"

interface RecordStockMovementParams {
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

interface BulkStockUpdate {
  productId: string
  productCode: string
  productName: string
  previousStock: number
  newStock: number
}

interface GetMovementsParams {
  productId?: string
  movementType?: StockMovementType
  batchId?: string
  userId?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

export class StockMovementsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Registra un movimiento de stock individual
   */
  async recordMovement(params: RecordStockMovementParams): Promise<StockMovement> {
    const {
      productId,
      productCode,
      productName,
      previousStock,
      newStock,
      movementType,
      createdBy,
      notes,
      batchId,
      referenceId,
      referenceType,
    } = params

    const quantityChanged = newStock - previousStock

    const { data, error } = await this.supabase
      .from("stock_movements")
      .insert({
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        previous_stock: previousStock,
        new_stock: newStock,
        quantity_changed: quantityChanged,
        movement_type: movementType,
        created_by: createdBy,
        notes,
        batch_id: batchId,
        reference_id: referenceId,
        reference_type: referenceType,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualiza stock de un producto y registra el movimiento
   */
  async updateStockWithAudit(
    productId: string,
    newStock: number,
    movementType: StockMovementType,
    userId: string,
    notes?: string
  ): Promise<{ product: any; movement: StockMovement }> {
    // Obtener producto actual
    const { data: product, error: productError } = await this.supabase
      .from("products")
      .select("id, code, name, current_stock")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      throw new Error(`Producto no encontrado: ${productId}`)
    }

    const previousStock = product.current_stock

    // Actualizar stock
    const { error: updateError } = await this.supabase
      .from("products")
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", productId)

    if (updateError) throw updateError

    // Registrar movimiento
    const movement = await this.recordMovement({
      productId: product.id,
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
   * Retorna un resumen de los cambios realizados
   */
  async bulkUpdateStock(
    updates: BulkStockUpdate[],
    userId: string,
    notes?: string
  ): Promise<{
    success: number
    failed: number
    batchId: string
    movements: StockMovement[]
    errors: Array<{ productCode: string; error: string }>
  }> {
    const batchId = crypto.randomUUID()
    const movements: StockMovement[] = []
    const errors: Array<{ productCode: string; error: string }> = []
    let success = 0
    let failed = 0

    for (const update of updates) {
      try {
        // Actualizar stock
        const { error: updateError } = await this.supabase
          .from("products")
          .update({ 
            current_stock: update.newStock, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", update.productId)

        if (updateError) throw updateError

        // Registrar movimiento
        const movement = await this.recordMovement({
          productId: update.productId,
          productCode: update.productCode,
          productName: update.productName,
          previousStock: update.previousStock,
          newStock: update.newStock,
          movementType: "csv_import",
          createdBy: userId,
          notes: notes || "Importación CSV",
          batchId,
        })

        movements.push(movement)
        success++
      } catch (err) {
        failed++
        errors.push({
          productCode: update.productCode,
          error: err instanceof Error ? err.message : "Error desconocido",
        })
      }
    }

    return { success, failed, batchId, movements, errors }
  }

  /**
   * Obtiene movimientos de stock con filtros
   */
  async getMovements(params: GetMovementsParams = {}): Promise<{
    movements: StockMovementWithUser[]
    total: number
  }> {
    const {
      productId,
      movementType,
      batchId,
      userId,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
    } = params

    let query = this.supabase
      .from("stock_movements_with_user")
      .select("*", { count: "exact" })

    if (productId) {
      query = query.eq("product_id", productId)
    }

    if (movementType) {
      query = query.eq("movement_type", movementType)
    }

    if (batchId) {
      query = query.eq("batch_id", batchId)
    }

    if (userId) {
      query = query.eq("created_by", userId)
    }

    if (fromDate) {
      query = query.gte("created_at", fromDate)
    }

    if (toDate) {
      query = query.lte("created_at", toDate)
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      movements: data || [],
      total: count || 0,
    }
  }

  /**
   * Obtiene el historial de un producto específico
   */
  async getProductHistory(productId: string, limit = 50): Promise<StockMovementWithUser[]> {
    const { movements } = await this.getMovements({ productId, limit })
    return movements
  }

  /**
   * Obtiene estadísticas de movimientos
   */
  async getMovementStats(fromDate?: string, toDate?: string): Promise<{
    totalMovements: number
    byType: Record<string, number>
    byUser: Array<{ userId: string; userName: string; count: number }>
  }> {
    let query = this.supabase
      .from("stock_movements_with_user")
      .select("movement_type, created_by, user_name")

    if (fromDate) {
      query = query.gte("created_at", fromDate)
    }

    if (toDate) {
      query = query.lte("created_at", toDate)
    }

    const { data, error } = await query

    if (error) throw error

    const byType: Record<string, number> = {}
    const userCounts: Record<string, { name: string; count: number }> = {}

    for (const movement of data || []) {
      // Contar por tipo
      byType[movement.movement_type] = (byType[movement.movement_type] || 0) + 1

      // Contar por usuario
      if (movement.created_by) {
        if (!userCounts[movement.created_by]) {
          userCounts[movement.created_by] = { name: movement.user_name || "Desconocido", count: 0 }
        }
        userCounts[movement.created_by].count++
      }
    }

    const byUser = Object.entries(userCounts).map(([userId, data]) => ({
      userId,
      userName: data.name,
      count: data.count,
    }))

    return {
      totalMovements: data?.length || 0,
      byType,
      byUser,
    }
  }

  /**
   * Obtiene los movimientos de un batch específico (importación CSV)
   */
  async getBatchMovements(batchId: string): Promise<StockMovementWithUser[]> {
    const { movements } = await this.getMovements({ batchId, limit: 1000 })
    return movements
  }
}

// Factory function
export function createStockMovementsService(supabase: SupabaseClient): StockMovementsService {
  return new StockMovementsService(supabase)
}


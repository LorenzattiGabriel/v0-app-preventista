import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Service for managing product stock operations
 */
class StockService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Restore stock when an order is cancelled after assembly
   * @param orderId - The order ID to restore stock from
   * @returns boolean indicating success
   */
  async restoreStockFromCancelledOrder(orderId: string): Promise<boolean> {
    try {
      // Get order items with assembled quantities
      const { data: orderItems, error: fetchError } = await this.supabase
        .from("order_items")
        .select("product_id, quantity_assembled, is_substituted, substituted_product_id")
        .eq("order_id", orderId)

      if (fetchError || !orderItems) {
        console.error("Error fetching order items for stock restoration:", fetchError)
        return false
      }

      // Restore stock for each item
      for (const item of orderItems) {
        const quantityToRestore = item.quantity_assembled || 0
        
        if (quantityToRestore > 0) {
          // Determine which product's stock to restore
          const productId = item.is_substituted && item.substituted_product_id
            ? item.substituted_product_id
            : item.product_id

          // Get current stock
          const { data: product, error: productError } = await this.supabase
            .from("products")
            .select("current_stock")
            .eq("id", productId)
            .single()

          if (productError || !product) {
            console.error(`Error fetching product ${productId} for stock restoration:`, productError)
            continue
          }

          // Restore stock
          const newStock = (product.current_stock || 0) + quantityToRestore
          const { error: updateError } = await this.supabase
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", productId)

          if (updateError) {
            console.error(`Error restoring stock for product ${productId}:`, updateError)
          }
        }
      }

      return true
    } catch (error) {
      console.error("Error in restoreStockFromCancelledOrder:", error)
      return false
    }
  }

  /**
   * Decrease stock when assembling an order
   * @param orderItems - Array of order items with assembled quantities
   * @returns boolean indicating success
   */
  async decreaseStockFromAssembly(orderItems: Array<{
    productId: string
    quantityAssembled: number
    isSubstituted: boolean
    substitutedProductId?: string
  }>): Promise<boolean> {
    try {
      for (const item of orderItems) {
        if (item.quantityAssembled > 0) {
          const productId = item.isSubstituted && item.substitutedProductId
            ? item.substitutedProductId
            : item.productId

          // Get current stock
          const { data: product, error: productError } = await this.supabase
            .from("products")
            .select("current_stock")
            .eq("id", productId)
            .single()

          if (productError || !product) {
            console.error(`Error fetching product ${productId}:`, productError)
            continue
          }

          // Decrease stock
          const newStock = Math.max(0, (product.current_stock || 0) - item.quantityAssembled)
          const { error: updateError } = await this.supabase
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", productId)

          if (updateError) {
            console.error(`Error decreasing stock for product ${productId}:`, updateError)
          }
        }
      }

      return true
    } catch (error) {
      console.error("Error in decreaseStockFromAssembly:", error)
      return false
    }
  }

  /**
   * Check if there's enough stock for an order
   * @param orderItems - Array of order items with requested quantities
   * @returns Object with stock availability per product
   */
  async checkStockAvailability(orderItems: Array<{
    productId: string
    quantityRequested: number
  }>): Promise<Record<string, { available: number; sufficient: boolean }>> {
    const result: Record<string, { available: number; sufficient: boolean }> = {}

    try {
      for (const item of orderItems) {
        const { data: product, error } = await this.supabase
          .from("products")
          .select("current_stock")
          .eq("id", item.productId)
          .single()

        if (error || !product) {
          result[item.productId] = { available: 0, sufficient: false }
          continue
        }

        result[item.productId] = {
          available: product.current_stock || 0,
          sufficient: (product.current_stock || 0) >= item.quantityRequested,
        }
      }

      return result
    } catch (error) {
      console.error("Error checking stock availability:", error)
      return result
    }
  }
}

export function createStockService(supabase: SupabaseClient) {
  return new StockService(supabase)
}


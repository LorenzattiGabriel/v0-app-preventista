import { SupabaseClient } from '@supabase/supabase-js'
import { ORDERS_PER_PAGE } from '@/lib/constants/order-status'

/**
 * Order Filters Interface
 */
export interface OrderFilters {
  status?: string
  priority?: string
  search?: string
  page?: number
  requires_invoice?: boolean
}

/**
 * Paginated Orders Result
 */
export interface PaginatedOrders {
  orders: any[]
  totalCount: number
  totalPages: number
  currentPage: number
}

/**
 * Orders Service
 * Handles all order-related data operations
 */
export class OrdersService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Fetch orders with filters and pagination
   */
  async getOrders(filters: OrderFilters = {}): Promise<PaginatedOrders> {
    const { status, priority, search, page = 1, requires_invoice } = filters
    const from = (page - 1) * ORDERS_PER_PAGE
    const to = from + ORDERS_PER_PAGE - 1

    // Build base query
    let query = this.supabase
      .from('orders')
      .select(
        `
        *,
        customers (
          commercial_name,
          locality,
          email
        ),
        profiles:created_by (
          full_name
        )
      `,
        { count: 'exact' }
      )

    // Apply filters
    query = this.applyFilters(query, { status, priority, search, requires_invoice })

    // Execute query with pagination
    const { data: orders, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching orders:', error)
      throw error
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / ORDERS_PER_PAGE)

    return {
      orders: orders || [],
      totalCount,
      totalPages,
      currentPage: page,
    }
  }

  /**
   * Get order statistics by status
   */
  async getOrderStats() {
    const { data: orders } = await this.supabase
      .from('orders')
      .select('status')

    if (!orders) return {}

    return orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: any, filters: Omit<OrderFilters, 'page'>) {
    const { status, priority, search, requires_invoice } = filters

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    if (requires_invoice !== undefined) {
      query = query.eq('requires_invoice', requires_invoice)
      // El filtro "pendientes de facturación" sólo lista los aún no facturados
      if (requires_invoice === true) {
        query = query.or('is_invoiced.is.null,is_invoiced.eq.false')
      }
    }

    if (search && search.trim()) {
      // Search in order_number or customer name
      query = query.or(
        `order_number.ilike.%${search}%,customers.commercial_name.ilike.%${search}%`
      )
    }

    return query
  }
}

/**
 * Factory function to create OrdersService instance
 */
export function createOrdersService(supabase: SupabaseClient) {
  return new OrdersService(supabase)
}



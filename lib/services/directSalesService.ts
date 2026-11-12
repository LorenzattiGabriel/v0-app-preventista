// Servicio de ventas directas.
// Encapsula toda la lógica de negocio del rol venta_directa.
// La confirmación de venta delega en la RPC `confirm_direct_sale` (atómica).
// Las consultas devuelven tipos del dominio con DECIMAL ya coerced a Number.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Result } from "@/lib/types/result"
import type {
  DirectSale,
  DirectSaleKPIs,
  ChannelComparison,
} from "@/lib/types/venta-directa"
import type { PaymentMethod } from "@/lib/types/database"
import { toNum, calcAccountReceivable, pickPrimaryPaymentMethod } from "@/lib/utils/cart-calculations"
import type { DirectSaleInput } from "@/lib/schemas/directSale.schema"
import { fetchAllRows } from "@/lib/utils/supabase-pagination"

interface ConfirmSaleResult {
  orderId: string
  orderNumber: string
  duplicated: boolean
}

interface DateRange {
  from: Date
  to: Date
}

export interface SellerRankingRow {
  sellerId: string
  sellerName: string
  sales: number
  revenue: number
  averageTicket: number
}

export interface TopProductRow {
  productId: string
  name: string
  code: string
  quantity: number
  revenue: number
}

export class DirectSalesService {
  constructor(private supabase: SupabaseClient) {}

  // ============================================================
  // ESCRITURA
  // ============================================================

  /**
   * Confirma una venta directa via RPC atómica.
   * El service no decide totales: confía en lo que validó el schema
   * y manda los items con subtotales pre-calculados.
   */
  async confirmSale(input: DirectSaleInput, userId: string): Promise<Result<ConfirmSaleResult>> {
    const primary = pickPrimaryPaymentMethod(input.paymentMethods)
    const accountAmount = calcAccountReceivable(input.paymentMethods)

    const subtotal = input.items.reduce((s, it) => s + toNum(it.subtotal), 0)
    const generalDiscountAmount = input.generalDiscountType === "percentage"
      ? subtotal * (toNum(input.generalDiscount) / 100)
      : toNum(input.generalDiscount)
    const total = Math.max(0, subtotal - generalDiscountAmount)

    const payload = {
      customer_id: input.customerId,
      user_id: userId,
      subtotal,
      general_discount: generalDiscountAmount,
      total,
      observations: input.observations || null,
      payment_method: primary?.method || "Efectivo",
      payment_methods_json: input.paymentMethods.length > 1 ? input.paymentMethods : null,
      account_movement_amount: accountAmount,
      idempotency_key: input.idempotencyKey,
      items: input.items.map((it) => ({
        product_id: it.productId,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount: it.discount,
        subtotal: it.subtotal,
      })),
    }

    const { data, error } = await this.supabase.rpc("confirm_direct_sale", { p: payload })

    if (error) {
      return { success: false, error: error.message }
    }
    if (!data || data.success === false) {
      return { success: false, error: data?.error || "Error desconocido al confirmar venta" }
    }

    return {
      success: true,
      data: {
        orderId: data.order_id,
        orderNumber: data.order_number || "",
        duplicated: !!data.duplicated,
      },
    }
  }

  // ============================================================
  // LECTURA
  // ============================================================

  /**
   * Detalle completo de una venta directa por ID.
   */
  async getSaleById(saleId: string): Promise<DirectSale | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select(`
        *,
        customer:customers ( id, code, commercial_name, contact_name, phone, street, street_number, locality, province ),
        items:order_items (
          *,
          product:products!order_items_product_id_fkey ( id, code, name, brand, unit_of_measure, allows_decimal_quantity, weight )
        )
      `)
      .eq("id", saleId)
      .eq("order_type", "local")
      .single()

    if (error) {
      console.error("[DirectSalesService.getSaleById] error", error)
      return null
    }
    if (!data) return null
    return this.mapSale(data)
  }

  /**
   * Listado de ventas del usuario (rol venta_directa ve solo las propias).
   * Si userId es null/undefined → devuelve todas las locales (uso admin).
   */
  async listSales(opts: {
    userId?: string
    from?: Date
    to?: Date
    limit?: number
  } = {}): Promise<DirectSale[]> {
    let q = this.supabase
      .from("orders")
      .select(`
        *,
        customer:customers ( id, code, commercial_name, contact_name, phone, street, street_number, locality, province ),
        items:order_items (
          *,
          product:products!order_items_product_id_fkey ( id, code, name, brand, unit_of_measure, allows_decimal_quantity, weight )
        )
      `)
      .eq("order_type", "local")
      .order("created_at", { ascending: false })

    if (opts.userId) q = q.eq("created_by", opts.userId)
    if (opts.from) q = q.gte("created_at", opts.from.toISOString())
    if (opts.to) q = q.lte("created_at", opts.to.toISOString())
    if (opts.limit) q = q.limit(opts.limit)

    const { data, error } = await q
    if (error) {
      console.error("[DirectSalesService.listSales] error", error)
      return []
    }
    if (!data) return []
    return data.map((row) => this.mapSale(row))
  }

  /**
   * KPIs del rango pedido (para dashboard del rol y reporte admin).
   * Filtra por canal: 'venta_directa' (order_type=local) o 'preventista'.
   */
  async getKPIs(opts: {
    channel: "venta_directa" | "preventista"
    range: DateRange
    userId?: string
  }): Promise<DirectSaleKPIs> {
    const buildQuery = () => {
      let q = this.supabase
        .from("orders")
        .select("id, total, payment_method, payment_methods_json, was_collected_on_delivery, order_items(quantity_assembled, quantity_requested, quantity_delivered)")
        .gte("created_at", opts.range.from.toISOString())
        .lte("created_at", opts.range.to.toISOString())
        .neq("status", "CANCELADO")

      if (opts.channel === "venta_directa") {
        q = q.eq("order_type", "local")
      } else {
        q = q.neq("order_type", "local")
      }

      if (opts.userId) q = q.eq("created_by", opts.userId)
      return q
    }

    // fetchAllRows: sin paginar, PostgREST corta en 1000 filas y los KPIs del
    // canal quedan subcontados en períodos con mucho volumen.
    let data
    try {
      data = await fetchAllRows(({ from, to }) => buildQuery().range(from, to))
    } catch {
      return this.emptyKPIs()
    }

    return this.aggregateKPIs(data)
  }

  /**
   * Comparativa entre canales con serie diaria.
   */
  async compareChannels(range: DateRange): Promise<ChannelComparison> {
    const [preventista, ventaDirecta] = await Promise.all([
      this.getKPIs({ channel: "preventista", range }),
      this.getKPIs({ channel: "venta_directa", range }),
    ])

    // Serie diaria. fetchAllRows: sin paginar, PostgREST corta en 1000 filas y
    // la evolución diaria queda subcontada en períodos con mucho volumen.
    const rows = await fetchAllRows(({ from, to }) =>
      this.supabase
        .from("orders")
        .select("created_at, total, order_type")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .neq("status", "CANCELADO")
        .range(from, to),
    )

    const seriesMap = new Map<string, { preventista: number; ventaDirecta: number }>()
    for (const row of rows) {
      const day = (row.created_at as string).slice(0, 10)
      const cur = seriesMap.get(day) || { preventista: 0, ventaDirecta: 0 }
      const amount = toNum((row as any).total)
      if ((row as any).order_type === "local") {
        cur.ventaDirecta += amount
      } else {
        cur.preventista += amount
      }
      seriesMap.set(day, cur)
    }

    const series = Array.from(seriesMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return { preventista, ventaDirecta, series }
  }

  /**
   * Ranking de vendedores de venta directa en el rango (para el reporte admin).
   */
  async getSellerRanking(range: DateRange): Promise<SellerRankingRow[]> {
    const rows = await fetchAllRows(({ from, to }) =>
      this.supabase
        .from("orders")
        .select("total, created_by")
        .eq("order_type", "local")
        .neq("status", "CANCELADO")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .range(from, to),
    )

    const sellerIds = Array.from(new Set(rows.map((r: any) => r.created_by).filter(Boolean)))
    if (sellerIds.length === 0) return []

    const { data: profiles } = await this.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", sellerIds)

    const nameById = new Map((profiles || []).map((p) => [p.id, p.full_name]))

    const bySeller = new Map<string, { sales: number; revenue: number }>()
    for (const r of rows as any[]) {
      if (!r.created_by) continue
      const cur = bySeller.get(r.created_by) || { sales: 0, revenue: 0 }
      cur.sales += 1
      cur.revenue += toNum(r.total)
      bySeller.set(r.created_by, cur)
    }

    return Array.from(bySeller.entries())
      .map(([sellerId, v]) => ({
        sellerId,
        sellerName: nameById.get(sellerId) || "Sin nombre",
        sales: v.sales,
        revenue: v.revenue,
        averageTicket: v.sales > 0 ? v.revenue / v.sales : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }

  /**
   * Top productos vendidos por venta directa en el rango (reporte admin, o
   * del vendedor si se pasa sellerId).
   */
  async getTopProducts(range: DateRange, limit = 10, sellerId?: string): Promise<TopProductRow[]> {
    const rows = await fetchAllRows(({ from, to }) => {
      let q = this.supabase
        .from("order_items")
        .select(
          `quantity_requested, quantity_delivered, quantity_assembled, subtotal,
           product:products!order_items_product_id_fkey ( id, name, code ),
           orders!inner ( order_type, status, created_at, created_by )`,
        )
        .eq("orders.order_type", "local")
        .neq("orders.status", "CANCELADO")
        .gte("orders.created_at", range.from.toISOString())
        .lte("orders.created_at", range.to.toISOString())
      if (sellerId) q = q.eq("orders.created_by", sellerId)
      return q.range(from, to)
    })

    const byProduct = new Map<string, { name: string; code: string; quantity: number; revenue: number }>()
    for (const r of rows as any[]) {
      const product = r.product
      if (!product) continue
      const qty = toNum(r.quantity_delivered ?? r.quantity_assembled ?? r.quantity_requested)
      const cur = byProduct.get(product.id) || { name: product.name, code: product.code, quantity: 0, revenue: 0 }
      cur.quantity += qty
      cur.revenue += toNum(r.subtotal)
      byProduct.set(product.id, cur)
    }

    return Array.from(byProduct.entries())
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  }

  /**
   * Tendencia mensual de venta directa (últimos 6 meses terminando en endDate).
   * Si se pasa sellerId, queda acotada a ese vendedor (dashboard del rol).
   */
  async getMonthlyTrend(endDate: Date, sellerId?: string): Promise<Array<{ month: string; sales: number; revenue: number }>> {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const result: Array<{ month: string; sales: number; revenue: number }> = []

    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(endDate)
      monthEnd.setMonth(monthEnd.getMonth() - i)
      monthEnd.setDate(1)
      monthEnd.setHours(0, 0, 0, 0)

      const monthStart = new Date(monthEnd)
      const actualMonthEnd = new Date(monthEnd)
      actualMonthEnd.setMonth(actualMonthEnd.getMonth() + 1)
      actualMonthEnd.setDate(0)
      actualMonthEnd.setHours(23, 59, 59, 999)

      const buildQuery = () => {
        let q = this.supabase
          .from("orders")
          .select("total")
          .eq("order_type", "local")
          .neq("status", "CANCELADO")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", actualMonthEnd.toISOString())
        if (sellerId) q = q.eq("created_by", sellerId)
        return q
      }

      const rows = await fetchAllRows(({ from, to }) => buildQuery().range(from, to))

      result.push({
        month: `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear().toString().slice(-2)}`,
        sales: rows.length,
        revenue: rows.reduce((s, r: any) => s + toNum(r.total), 0),
      })
    }

    return result
  }

  // ============================================================
  // HELPERS PRIVADOS
  // ============================================================

  private mapSale(row: any): DirectSale {
    return {
      ...row,
      subtotal: toNum(row.subtotal),
      general_discount: toNum(row.general_discount),
      total: toNum(row.total),
      amount_paid: row.amount_paid != null ? toNum(row.amount_paid) : undefined,
      items: Array.isArray(row.items)
        ? row.items.map((it: any) => ({
            ...it,
            quantity_requested: toNum(it.quantity_requested),
            quantity_assembled: it.quantity_assembled != null ? toNum(it.quantity_assembled) : undefined,
            quantity_delivered: it.quantity_delivered != null ? toNum(it.quantity_delivered) : undefined,
            unit_price: toNum(it.unit_price),
            discount: toNum(it.discount),
            subtotal: toNum(it.subtotal),
          }))
        : undefined,
    }
  }

  private aggregateKPIs(rows: any[]): DirectSaleKPIs {
    const totalSales = rows.length
    const totalRevenue = rows.reduce((s, r) => s + toNum(r.total), 0)
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    const totalItems = rows.reduce((s, r) => {
      const items = (r.order_items as any[]) || []
      return s + items.reduce((sa, it) => sa + toNum(it.quantity_delivered ?? it.quantity_assembled ?? it.quantity_requested), 0)
    }, 0)

    // Breakdown por método: si hay payment_methods_json úsalo, sino el payment_method principal
    const breakdownMap = new Map<PaymentMethod, { amount: number; count: number }>()
    let accountReceivable = 0

    for (const r of rows) {
      const lines = Array.isArray(r.payment_methods_json) && r.payment_methods_json.length > 0
        ? r.payment_methods_json
        : r.payment_method
          ? [{ method: r.payment_method as PaymentMethod, amount: toNum(r.total) }]
          : []

      for (const line of lines) {
        const method = line.method as PaymentMethod
        const amount = toNum(line.amount)
        const cur = breakdownMap.get(method) || { amount: 0, count: 0 }
        cur.amount += amount
        cur.count += 1
        breakdownMap.set(method, cur)
        if (method === "Cuenta Corriente") accountReceivable += amount
      }
    }

    const paymentBreakdown = Array.from(breakdownMap.entries()).map(([method, v]) => ({
      method,
      amount: v.amount,
      count: v.count,
    }))

    return { totalSales, totalRevenue, averageTicket, totalItems, paymentBreakdown, accountReceivable }
  }

  private emptyKPIs(): DirectSaleKPIs {
    return {
      totalSales: 0,
      totalRevenue: 0,
      averageTicket: 0,
      totalItems: 0,
      paymentBreakdown: [],
      accountReceivable: 0,
    }
  }
}

export function createDirectSalesService(supabase: SupabaseClient): DirectSalesService {
  return new DirectSalesService(supabase)
}

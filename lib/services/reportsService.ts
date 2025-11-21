import { SupabaseClient } from "@supabase/supabase-js"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export interface OrdersReportData {
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  cancelledOrders: number
  inDeliveryOrders: number
  avgOrderValue: number
  totalRevenue: number
  previousPeriodTotal?: number
  previousPeriodAvg?: number
}

export interface OrdersByDay {
  date: string
  orders: number
  completed: number
}

export interface OrdersByStatus {
  status: string
  count: number
  percentage: number
}

export interface FinancialReportData {
  totalRevenue: number
  collected: number
  pending: number
  avgTicket: number
  previousPeriodRevenue?: number
  previousPeriodTicket?: number
}

export interface RevenueByZone {
  zone: string
  revenue: number
}

export interface PaymentMethod {
  method: string
  amount: number
  percentage: number
}

class ReportsService {
  constructor(private supabase: SupabaseClient) {}

  async getOrdersReport(startDate: Date, endDate: Date): Promise<{
    stats: OrdersReportData
    ordersByDay: OrdersByDay[]
    ordersByStatus: OrdersByStatus[]
  }> {
    // Get orders in the date range
    const { data: orders, error } = await this.supabase
      .from("orders")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    if (error) {
      console.error("Error fetching orders:", error)
      throw error
    }

    // Calculate previous period for comparison
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff)
    const previousEndDate = new Date(startDate)

    const { data: previousOrders } = await this.supabase
      .from("orders")
      .select("total")
      .gte("created_at", previousStartDate.toISOString())
      .lt("created_at", previousEndDate.toISOString())

    // Calculate stats
    const totalOrders = orders?.length || 0
    const completedOrders = orders?.filter((o) => o.status === "ENTREGADO").length || 0
    const pendingOrders =
      orders?.filter((o) => o.status === "PENDIENTE" || o.status === "PENDIENTE_ENTREGA").length || 0
    const cancelledOrders = orders?.filter((o) => o.status === "CANCELADO").length || 0
    const inDeliveryOrders = orders?.filter((o) => o.status === "EN_REPARTICION").length || 0

    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const previousPeriodTotal = previousOrders?.length || 0
    const previousPeriodRevenue = previousOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const previousPeriodAvg = previousPeriodTotal > 0 ? previousPeriodRevenue / previousPeriodTotal : 0

    // Orders by day (group by date)
    const ordersByDayMap = new Map<string, { orders: number; completed: number }>()
    orders?.forEach((order) => {
      const dateKey = format(new Date(order.created_at), "yyyy-MM-dd")
      const existing = ordersByDayMap.get(dateKey) || { orders: 0, completed: 0 }
      existing.orders++
      if (order.status === "ENTREGADO") {
        existing.completed++
      }
      ordersByDayMap.set(dateKey, existing)
    })

    const ordersByDay: OrdersByDay[] = Array.from(ordersByDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date: format(new Date(date), "dd/MM"),
        ...data,
      }))
      .slice(-7) // Last 7 days

    // Orders by status
    const ordersByStatus: OrdersByStatus[] = [
      {
        status: "Entregado",
        count: completedOrders,
        percentage: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
      {
        status: "En Reparto",
        count: inDeliveryOrders,
        percentage: totalOrders > 0 ? (inDeliveryOrders / totalOrders) * 100 : 0,
      },
      {
        status: "Pendiente",
        count: pendingOrders,
        percentage: totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0,
      },
      {
        status: "Cancelado",
        count: cancelledOrders,
        percentage: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      },
    ]

    return {
      stats: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        inDeliveryOrders,
        avgOrderValue,
        totalRevenue,
        previousPeriodTotal,
        previousPeriodAvg,
      },
      ordersByDay,
      ordersByStatus,
    }
  }

  async getFinancialReport(startDate: Date, endDate: Date): Promise<{
    stats: FinancialReportData
    revenueByZone: RevenueByZone[]
    paymentMethods: PaymentMethod[]
  }> {
    // Get orders with customer data for zones
    const { data: orders, error } = await this.supabase
      .from("orders")
      .select("*, customers(zone)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    if (error) {
      console.error("Error fetching orders for financial report:", error)
      throw error
    }

    // Calculate previous period
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff)
    const previousEndDate = new Date(startDate)

    const { data: previousOrders } = await this.supabase
      .from("orders")
      .select("total, status")
      .gte("created_at", previousStartDate.toISOString())
      .lt("created_at", previousEndDate.toISOString())

    // Calculate stats
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const collected =
      orders?.filter((o) => o.status === "ENTREGADO").reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const pending = totalRevenue - collected
    const avgTicket = orders && orders.length > 0 ? totalRevenue / orders.length : 0

    const previousPeriodRevenue = previousOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const previousPeriodTicket =
      previousOrders && previousOrders.length > 0 ? previousPeriodRevenue / previousOrders.length : 0

    // Revenue by zone
    const revenueByZoneMap = new Map<string, number>()
    orders?.forEach((order) => {
      const zone = (order.customers as any)?.zone || "Sin zona"
      const current = revenueByZoneMap.get(zone) || 0
      revenueByZoneMap.set(zone, current + (order.total || 0))
    })

    const revenueByZone: RevenueByZone[] = Array.from(revenueByZoneMap.entries())
      .map(([zone, revenue]) => ({ zone, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5) // Top 5 zones

    // Payment methods (simulated - add payment_method column to orders table if needed)
    const paymentMethodsMap = new Map<string, number>()
    orders?.forEach((order) => {
      const method = (order as any).payment_method || "Efectivo"
      const current = paymentMethodsMap.get(method) || 0
      paymentMethodsMap.set(method, current + (order.total || 0))
    })

    const paymentMethods: PaymentMethod[] = Array.from(paymentMethodsMap.entries()).map(([method, amount]) => ({
      method,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
    }))

    return {
      stats: {
        totalRevenue,
        collected,
        pending,
        avgTicket,
        previousPeriodRevenue,
        previousPeriodTicket,
      },
      revenueByZone,
      paymentMethods,
    }
  }
}

export function createReportsService(supabase: SupabaseClient) {
  return new ReportsService(supabase)
}


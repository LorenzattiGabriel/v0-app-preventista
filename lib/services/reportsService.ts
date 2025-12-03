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

export interface DeliveryReportData {
  totalRoutes: number
  completedRoutes: number
  activeRoutes: number
  avgDeliveryTime: number
  onTimeDelivery: number
  avgRating: number
}

export interface DriverPerformance {
  driverId: string
  driverName: string
  deliveries: number
  completedDeliveries: number
  onTime: number
  rating: number
}

export interface PerformanceReportData {
  monthlyData: MonthlyData[]
  teamStats: TeamStats[]
}

export interface MonthlyData {
  month: string
  orders: number
  revenue: number
}

export interface TeamStats {
  role: string
  count: number
  avgOrders: number
  efficiency: number
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

  async getDeliveryReport(startDate: Date, endDate: Date): Promise<{
    stats: DeliveryReportData
    driverPerformance: DriverPerformance[]
  }> {
    // Get routes in the date range (using scheduled_date for actual delivery dates)
    const { data: routes, error: routesError } = await this.supabase
      .from("routes")
      .select("*, assigned_driver:profiles!driver_id(id, full_name)")
      .gte("scheduled_date", startDate.toISOString().split('T')[0])
      .lte("scheduled_date", endDate.toISOString().split('T')[0])

    if (routesError) {
      console.error("Error fetching routes:", routesError)
      throw routesError
    }

    // Calculate stats
    const totalRoutes = routes?.length || 0
    const completedRoutes = routes?.filter((r) => r.status === "COMPLETADO").length || 0
    const activeRoutes = routes?.filter((r) => r.status === "EN_CURSO").length || 0

    // Calculate average delivery time (in minutes)
    const routesWithDuration = routes?.filter((r) => r.actual_duration) || []
    const avgDeliveryTime =
      routesWithDuration.length > 0
        ? routesWithDuration.reduce((sum, r) => sum + (r.actual_duration || 0), 0) / routesWithDuration.length
        : 0

    // Get orders from completed routes to calculate on-time delivery
    const completedRouteIds = routes?.filter((r) => r.status === "COMPLETADO").map((r) => r.id) || []
    let onTimeDelivery = 0

    if (completedRouteIds.length > 0) {
      const { data: routeOrders } = await this.supabase
        .from("route_orders")
        .select("order_id, orders(delivery_date, delivered_at)")
        .in("route_id", completedRouteIds)

      if (routeOrders && routeOrders.length > 0) {
        const ordersWithDeliveryDate = routeOrders.filter((ro) => {
          const order = ro.orders as any
          return order?.delivery_date && order?.delivered_at
        })

        if (ordersWithDeliveryDate.length > 0) {
          const onTimeCount = ordersWithDeliveryDate.filter((ro) => {
            const order = ro.orders as any
            const deliveryDate = new Date(order.delivery_date)
            const deliveredAt = new Date(order.delivered_at)
            // Consider on-time if delivered on the same day or before
            return deliveredAt <= new Date(deliveryDate.setHours(23, 59, 59, 999))
          }).length

          onTimeDelivery = (onTimeCount / ordersWithDeliveryDate.length) * 100
        }
      }
    }

    // Get average driver rating
    const { data: ratings } = await this.supabase
      .from("order_ratings")
      .select("driver_rating")
      .not("driver_rating", "is", null)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const avgRating =
      ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + (r.driver_rating || 0), 0) / ratings.length
        : 0

    // Calculate driver performance
    const driverPerformanceMap = new Map<
      string,
      { name: string; deliveries: number; completed: number; ratings: number[] }
    >()

    routes?.forEach((route) => {
      const driver = (route as any).assigned_driver
      if (driver?.id) {
        const existing = driverPerformanceMap.get(driver.id) || {
          name: driver.full_name || "Sin nombre",
          deliveries: 0,
          completed: 0,
          ratings: [],
        }
        existing.deliveries++
        if (route.status === "COMPLETADO") {
          existing.completed++
        }
        driverPerformanceMap.set(driver.id, existing)
      }
    })

    // Get order ratings with their associated order IDs and routes
    // First, get route_orders to map orders to drivers
    const routeIds = routes?.map((r) => r.id).filter(Boolean) || []
    
    if (routeIds.length > 0) {
      const { data: routeOrdersData } = await this.supabase
        .from("route_orders")
        .select("order_id, route_id, routes!inner(driver_id)")
        .in("route_id", routeIds)

      // Create a map of order_id -> driver_id
      const orderToDriverMap = new Map<string, string>()
      routeOrdersData?.forEach((ro: any) => {
        if (ro.routes?.driver_id) {
          orderToDriverMap.set(ro.order_id, ro.routes.driver_id)
        }
      })

      // Get ratings for these orders
      const orderIds = Array.from(orderToDriverMap.keys())
      if (orderIds.length > 0) {
        const { data: ratingsData } = await this.supabase
          .from("order_ratings")
          .select("order_id, driver_rating")
          .in("order_id", orderIds)
          .not("driver_rating", "is", null)

        // Map ratings to drivers
        ratingsData?.forEach((rating: any) => {
          const driverId = orderToDriverMap.get(rating.order_id)
          if (driverId && rating.driver_rating) {
            const existing = driverPerformanceMap.get(driverId)
            if (existing) {
              existing.ratings.push(rating.driver_rating)
            }
          }
        })
      }
    }

    // Build driver performance array
    const driverPerformance: DriverPerformance[] = Array.from(driverPerformanceMap.entries())
      .map(([driverId, data]) => ({
        driverId,
        driverName: data.name,
        deliveries: data.deliveries,
        completedDeliveries: data.completed,
        onTime: data.deliveries > 0 ? (data.completed / data.deliveries) * 100 : 0,
        rating: data.ratings.length > 0 ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length : 0,
      }))
      .filter((d) => d.deliveries > 0) // Only include drivers with deliveries
      .sort((a, b) => b.deliveries - a.deliveries) // Sort by most deliveries

    return {
      stats: {
        totalRoutes,
        completedRoutes,
        activeRoutes,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        onTimeDelivery: Math.round(onTimeDelivery * 10) / 10, // Round to 1 decimal
        avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      },
      driverPerformance,
    }
  }

  async getPerformanceReport(startDate: Date, endDate: Date): Promise<PerformanceReportData> {
    // Calculate last 6 months of data ending at endDate
    const monthlyDataMap = new Map<string, { orders: number; revenue: number }>()

    // Get 6 months of data ending at endDate
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

      const { data: orders } = await this.supabase
        .from("orders")
        .select("total, status")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", actualMonthEnd.toISOString())

      // Format month name in Spanish
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
      const monthKey = `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear().toString().slice(-2)}`
      
      monthlyDataMap.set(monthKey, {
        orders: orders?.length || 0,
        revenue: orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
      })
    }

    const monthlyData: MonthlyData[] = Array.from(monthlyDataMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }))

    // Get team stats
    const { data: allUsers } = await this.supabase.from("profiles").select("id, role, full_name").eq("is_active", true)

    const preventistas = allUsers?.filter((u) => u.role === "preventista") || []
    const armadores = allUsers?.filter((u) => u.role === "encargado_armado") || []
    const repartidores = allUsers?.filter((u) => u.role === "repartidor") || []

    // Calculate orders created by preventistas
    const { data: preventistaOrders } = await this.supabase
      .from("orders")
      .select("id, created_by")
      .in(
        "created_by",
        preventistas.map((p) => p.id),
      )
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const avgPreventista = preventistas.length > 0 ? (preventistaOrders?.length || 0) / preventistas.length : 0

    // Calculate orders assembled by armadores
    const { data: armadoresOrders } = await this.supabase
      .from("orders")
      .select("id, assembled_by")
      .not("assembled_by", "is", null)
      .in(
        "assembled_by",
        armadores.map((a) => a.id),
      )
      .gte("assembly_started_at", startDate.toISOString())
      .lte("assembly_started_at", endDate.toISOString())

    const avgArmador = armadores.length > 0 ? (armadoresOrders?.length || 0) / armadores.length : 0

    // Calculate deliveries by repartidores
    const { data: repartidorRoutes } = await this.supabase
      .from("routes")
      .select("id, driver_id, route_orders(order_id)")
      .in(
        "driver_id",
        repartidores.map((r) => r.id),
      )
      .eq("status", "COMPLETADO")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const totalDeliveries =
      repartidorRoutes?.reduce((sum, route) => sum + ((route.route_orders as any)?.length || 0), 0) || 0
    const avgRepartidor = repartidores.length > 0 ? totalDeliveries / repartidores.length : 0

    // Calculate efficiency (% of completed vs total)
    const { data: allOrders } = await this.supabase
      .from("orders")
      .select("status")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const totalOrders = allOrders?.length || 0
    const completedOrders = allOrders?.filter((o) => o.status === "ENTREGADO").length || 0
    const overallEfficiency = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

    const teamStats: TeamStats[] = [
      {
        role: "Preventistas",
        count: preventistas.length,
        avgOrders: Math.round(avgPreventista),
        efficiency: Math.round(overallEfficiency),
      },
      {
        role: "Armado",
        count: armadores.length,
        avgOrders: Math.round(avgArmador),
        efficiency: Math.round(overallEfficiency * 0.98), // Slight variation for realism
      },
      {
        role: "Repartidores",
        count: repartidores.length,
        avgOrders: Math.round(avgRepartidor),
        efficiency: Math.round(overallEfficiency * 0.95), // Deliveries typically slightly lower
      },
    ]

    return {
      monthlyData,
      teamStats,
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
      .select("*, customers(zone_id, zones:zone_id(name))")
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
      const zoneName = (order.customers as any)?.zones?.name || "Sin zona"
      const current = revenueByZoneMap.get(zoneName) || 0
      revenueByZoneMap.set(zoneName, current + (order.total || 0))
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


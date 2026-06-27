import { SupabaseClient } from "@supabase/supabase-js"
import { getLocalDateString } from "@/lib/utils/dates"

export const CUSTOMER_STATS_PER_PAGE = 25
export const DEFAULT_INACTIVE_DAYS = 15

export interface CustomerStatRow {
  id: string
  code: string
  commercial_name: string
  contact_name: string | null
  phone: string | null
  customer_type: "mayorista" | "minorista"
  locality: string | null
  zone_id: string | null
  priority: string | null
  current_balance: number
  credit_limit: number
  created_at: string
  last_order_date: string | null
  first_order_date: string | null
  orders_count: number
  delivered_count: number
  total_spent: number
  avg_ticket: number
  days_since_last_order: number | null
  overdue_amount: number
  overdue_count: number
}

export interface CustomerAlerts {
  inactiveCount: number
  neverOrderedCount: number
  debtCount: number
  totalDebt: number
  overdueCount: number
  overdueAmount: number
}

export interface CustomerKpis {
  totalActive: number
  active30: number
  inactiveCount: number
  newThisMonth: number
  totalRevenue: number
  avgTicketGlobal: number
}

export interface CustomerRankings {
  topRevenue: CustomerStatRow[]
  topOrders: CustomerStatRow[]
  topTicket: CustomerStatRow[]
  leastActive: CustomerStatRow[]
}

export interface CustomerComposition {
  mayorista: number
  minorista: number
  active30: number
  inactive: number
  byZone: Array<{ zone: string; count: number }>
}

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const mapRow = (r: any): CustomerStatRow => ({
  ...r,
  current_balance: toNum(r.current_balance),
  credit_limit: toNum(r.credit_limit),
  orders_count: toNum(r.orders_count),
  delivered_count: toNum(r.delivered_count),
  total_spent: toNum(r.total_spent),
  avg_ticket: toNum(r.avg_ticket),
  days_since_last_order: r.days_since_last_order == null ? null : toNum(r.days_since_last_order),
  overdue_amount: toNum(r.overdue_amount),
  overdue_count: toNum(r.overdue_count),
})

class CustomerStatsService {
  constructor(private supabase: SupabaseClient) {}

  /** Carteles del dashboard: inactivos, deuda y deuda vencida. */
  async getAlerts(inactiveDays: number = DEFAULT_INACTIVE_DAYS): Promise<CustomerAlerts> {
    const [inactive, never, debtRows, overdueRows] = await Promise.all([
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .gte("days_since_last_order", inactiveDays),
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .is("last_order_date", null),
      this.supabase.from("customer_stats").select("current_balance").gt("current_balance", 0),
      this.supabase
        .from("customer_stats")
        .select("overdue_amount")
        .gt("overdue_amount", 0),
    ])

    const totalDebt = (debtRows.data || []).reduce((s, r) => s + toNum(r.current_balance), 0)
    const overdueAmount = (overdueRows.data || []).reduce((s, r) => s + toNum(r.overdue_amount), 0)

    return {
      inactiveCount: inactive.count || 0,
      neverOrderedCount: never.count || 0,
      debtCount: (debtRows.data || []).length,
      totalDebt,
      overdueCount: (overdueRows.data || []).length,
      overdueAmount,
    }
  }

  async getKpis(inactiveDays: number = DEFAULT_INACTIVE_DAYS): Promise<CustomerKpis> {
    // Inicio del mes actual (local)
    const today = getLocalDateString()
    const monthStart = `${today.slice(0, 7)}-01`

    const [totalActive, active30, inactive, newMonth, revenueRows] = await Promise.all([
      this.supabase.from("customer_stats").select("id", { count: "exact", head: true }),
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .lte("days_since_last_order", 30),
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .gte("days_since_last_order", inactiveDays),
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${monthStart}T00:00:00`),
      this.supabase.from("customer_stats").select("total_spent, delivered_count"),
    ])

    const rows = revenueRows.data || []
    const totalRevenue = rows.reduce((s, r) => s + toNum(r.total_spent), 0)
    const totalDelivered = rows.reduce((s, r) => s + toNum(r.delivered_count), 0)

    return {
      totalActive: totalActive.count || 0,
      active30: active30.count || 0,
      inactiveCount: inactive.count || 0,
      newThisMonth: newMonth.count || 0,
      totalRevenue,
      avgTicketGlobal: totalDelivered > 0 ? totalRevenue / totalDelivered : 0,
    }
  }

  async getRankings(limit = 10): Promise<CustomerRankings> {
    const [topRevenue, topOrders, topTicket, leastActive] = await Promise.all([
      this.supabase
        .from("customer_stats")
        .select("*")
        .gt("total_spent", 0)
        .order("total_spent", { ascending: false })
        .limit(limit),
      this.supabase
        .from("customer_stats")
        .select("*")
        .gt("orders_count", 0)
        .order("orders_count", { ascending: false })
        .limit(limit),
      // Ticket promedio: pedir mínimo 2 entregas para evitar distorsión de 1 pedido grande
      this.supabase
        .from("customer_stats")
        .select("*")
        .gte("delivered_count", 2)
        .order("avg_ticket", { ascending: false })
        .limit(limit),
      // Los que más hace que no piden (pero alguna vez pidieron)
      this.supabase
        .from("customer_stats")
        .select("*")
        .not("days_since_last_order", "is", null)
        .order("days_since_last_order", { ascending: false })
        .limit(limit),
    ])

    return {
      topRevenue: (topRevenue.data || []).map(mapRow),
      topOrders: (topOrders.data || []).map(mapRow),
      topTicket: (topTicket.data || []).map(mapRow),
      leastActive: (leastActive.data || []).map(mapRow),
    }
  }

  /** Lista paginada de clientes inactivos (>= inactiveDays sin pedir). */
  async getInactiveCustomers(
    inactiveDays: number = DEFAULT_INACTIVE_DAYS,
    page = 1,
    perPage = CUSTOMER_STATS_PER_PAGE,
  ): Promise<{ rows: CustomerStatRow[]; count: number; totalPages: number }> {
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, count } = await this.supabase
      .from("customer_stats")
      .select("*", { count: "exact" })
      .gte("days_since_last_order", inactiveDays)
      .order("days_since_last_order", { ascending: false })
      .range(from, to)

    const total = count || 0
    return {
      rows: (data || []).map(mapRow),
      count: total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    }
  }

  async getComposition(inactiveDays: number = DEFAULT_INACTIVE_DAYS): Promise<CustomerComposition> {
    const [mayorista, minorista, active30, inactive, zoneRows] = await Promise.all([
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .eq("customer_type", "mayorista"),
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .eq("customer_type", "minorista"),
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .lte("days_since_last_order", 30),
      this.supabase
        .from("customer_stats")
        .select("id", { count: "exact", head: true })
        .gte("days_since_last_order", inactiveDays),
      this.supabase.from("customer_stats").select("locality"),
    ])

    const zoneMap: Record<string, number> = {}
    for (const r of zoneRows.data || []) {
      const z = (r as any).locality || "Sin localidad"
      zoneMap[z] = (zoneMap[z] || 0) + 1
    }
    const byZone = Object.entries(zoneMap)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    return {
      mayorista: mayorista.count || 0,
      minorista: minorista.count || 0,
      active30: active30.count || 0,
      inactive: inactive.count || 0,
      byZone,
    }
  }
}

export function createCustomerStatsService(supabase: SupabaseClient) {
  return new CustomerStatsService(supabase)
}

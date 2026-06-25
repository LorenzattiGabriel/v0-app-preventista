import { SupabaseClient } from "@supabase/supabase-js"

export const FINANCIAL_MOVEMENTS_PER_PAGE = 25

export type MovementSource = "cuenta_cliente" | "egreso_proveedor"
export type MovementDirection = "ingreso" | "egreso"
export type MovementChannel = "ruta" | "fuera_ruta" | "proveedor"

export interface FinancialMovementRow {
  id: string
  date: string
  source: MovementSource
  party_type: "cliente" | "proveedor"
  party_id: string | null
  party_name: string | null
  party_code: string | null
  direction: MovementDirection
  channel: MovementChannel
  amount: number
  concept: string | null
  description: string | null
  payment_method: string | null
  order_id: string | null
  order_number: string | null
  route_id: string | null
  route_code: string | null
  notes: string | null
  created_by: string | null
}

export interface FinancialMovementsFilters {
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
  source?: MovementSource | "all"
  direction?: MovementDirection | "all"
  channel?: MovementChannel | "all"
  partyId?: string
  routeId?: string
  paymentMethod?: string | "all"
  search?: string
}

export interface FinancialMovementsTotals {
  ingresos: number // cobros (credit en cuenta)
  cobradoEnRuta: number // ingresos con channel=ruta
  cobradoFueraRuta: number // ingresos con channel=fuera_ruta
  cargosClientes: number // egresos de cuenta (deuda/ajustes, no es plata que sale)
  egresosProveedores: number // egresos a proveedores (plata real que sale)
  neto: number // ingresos - egresosProveedores
  count: number
}

export interface PaginatedFinancialMovements {
  rows: FinancialMovementRow[]
  count: number
  page: number
  totalPages: number
  totals: FinancialMovementsTotals
}

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

class FinancialMovementsService {
  constructor(private supabase: SupabaseClient) {}

  /** Aplica los filtros comunes a un query sobre la vista financial_movements. */
  private applyFilters(query: any, filters: FinancialMovementsFilters) {
    if (filters.dateFrom) query = query.gte("date", `${filters.dateFrom}T00:00:00`)
    if (filters.dateTo) query = query.lte("date", `${filters.dateTo}T23:59:59`)
    if (filters.source && filters.source !== "all") query = query.eq("source", filters.source)
    if (filters.direction && filters.direction !== "all") query = query.eq("direction", filters.direction)
    if (filters.channel && filters.channel !== "all") query = query.eq("channel", filters.channel)
    if (filters.partyId) query = query.eq("party_id", filters.partyId)
    if (filters.routeId) query = query.eq("route_id", filters.routeId)
    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      query = query.eq("payment_method", filters.paymentMethod)
    }
    if (filters.search) {
      const term = filters.search.replace(/[%,]/g, "")
      query = query.or(
        `description.ilike.%${term}%,notes.ilike.%${term}%,order_number.ilike.%${term}%`,
      )
    }
    return query
  }

  async listMovements(
    filters: FinancialMovementsFilters = {},
    page = 1,
    perPage = FINANCIAL_MOVEMENTS_PER_PAGE,
  ): Promise<PaginatedFinancialMovements> {
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Página actual
    let listQuery = this.supabase
      .from("financial_movements")
      .select("*", { count: "exact" })
    listQuery = this.applyFilters(listQuery, filters)

    const { data, count, error } = await listQuery
      .order("date", { ascending: false })
      .range(from, to)

    if (error) {
      console.error("Error fetching financial_movements:", error)
      throw error
    }

    const rows: FinancialMovementRow[] = (data || []).map((r: any) => ({
      ...r,
      amount: toNum(r.amount),
    }))

    const total = count || 0
    const totals = await this.getTotals(filters)

    return {
      rows,
      count: total,
      page,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      totals,
    }
  }

  /** Totales del período filtrado (todas las páginas) para los KPIs. */
  async getTotals(filters: FinancialMovementsFilters = {}): Promise<FinancialMovementsTotals> {
    let q = this.supabase
      .from("financial_movements")
      .select("amount, direction, channel, source")
    q = this.applyFilters(q, filters)

    const { data, error } = await q
    if (error) {
      console.error("Error aggregating financial_movements:", error)
      throw error
    }

    const totals: FinancialMovementsTotals = {
      ingresos: 0,
      cobradoEnRuta: 0,
      cobradoFueraRuta: 0,
      cargosClientes: 0,
      egresosProveedores: 0,
      neto: 0,
      count: 0,
    }

    for (const r of data || []) {
      const amount = toNum((r as any).amount)
      const { direction, channel, source } = r as any
      totals.count++
      if (direction === "ingreso") {
        totals.ingresos += amount
        if (channel === "ruta") totals.cobradoEnRuta += amount
        else totals.cobradoFueraRuta += amount
      } else if (source === "egreso_proveedor") {
        totals.egresosProveedores += amount
      } else {
        totals.cargosClientes += amount
      }
    }

    totals.neto = totals.ingresos - totals.egresosProveedores
    return totals
  }
}

export function createFinancialMovementsService(supabase: SupabaseClient) {
  return new FinancialMovementsService(supabase)
}

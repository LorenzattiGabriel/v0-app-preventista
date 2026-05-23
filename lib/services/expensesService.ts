import { SupabaseClient } from "@supabase/supabase-js"
import type {
  Expense,
  ExpenseWithRelations,
  ExpenseType,
  PaymentMethod,
} from "@/lib/types/database"

export const EXPENSES_PER_PAGE = 20

export interface ExpenseFilters {
  search?: string
  category_id?: string
  supplier_id?: string
  payment_method?: PaymentMethod | "all"
  expense_type?: ExpenseType | "all"
  from?: string // YYYY-MM-DD
  to?: string // YYYY-MM-DD
}

export interface PaginatedExpenses {
  expenses: ExpenseWithRelations[]
  total: number
  page: number
  totalPages: number
  totalAmount: number // total filtrado (todas las páginas)
}

export interface ExpenseStats {
  totalAmount: number
  totalCount: number
  totalFijo: number
  totalVariable: number
  topCategory: { name: string; amount: number } | null
  topSupplier: { name: string; amount: number } | null
  previousPeriodAmount: number
}

export interface ExpensesReportData {
  stats: ExpenseStats
  byCategory: Array<{ category: string; amount: number; count: number; type: ExpenseType }>
  bySupplier: Array<{ supplier: string; amount: number; count: number }>
  byMonth: Array<{ month: string; amount: number }>
}

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

class ExpensesService {
  constructor(private supabase: SupabaseClient) {}

  async getExpenses(
    filters: ExpenseFilters = {},
    page: number = 1,
    perPage: number = EXPENSES_PER_PAGE,
  ): Promise<PaginatedExpenses> {
    let query = this.supabase
      .from("expenses")
      .select(
        `*,
        category:expense_categories(id, name, expense_type),
        supplier:suppliers(id, name)`,
        { count: "exact" },
      )

    if (filters.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
      )
    }
    if (filters.category_id) {
      query = query.eq("category_id", filters.category_id)
    }
    if (filters.supplier_id) {
      query = query.eq("supplier_id", filters.supplier_id)
    }
    if (filters.payment_method && filters.payment_method !== "all") {
      query = query.eq("payment_method", filters.payment_method)
    }
    if (filters.from) {
      query = query.gte("expense_date", filters.from)
    }
    if (filters.to) {
      query = query.lte("expense_date", filters.to)
    }

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, count, error } = await query
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      console.error("Error fetching expenses:", error)
      throw error
    }

    let rows = (data || []) as any[]

    // Filtro por tipo de gasto (fijo/variable) — depende del join → filtrar en memoria
    if (filters.expense_type && filters.expense_type !== "all") {
      rows = rows.filter((r) => r.category?.expense_type === filters.expense_type)
    }

    // Total del período filtrado (sum sobre TODAS las páginas)
    const sumQuery = await this.sumAmount(filters)
    const totalAmount = sumQuery

    const expenses: ExpenseWithRelations[] = rows.map((r) => ({
      ...r,
      amount: toNum(r.amount),
      category_name: r.category?.name,
      category_type: r.category?.expense_type,
      supplier_name: r.supplier?.name || null,
    }))

    const total = count || 0
    return {
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      totalAmount,
    }
  }

  private async sumAmount(filters: ExpenseFilters): Promise<number> {
    let q = this.supabase
      .from("expenses")
      .select("amount, category:expense_categories(expense_type)")

    if (filters.category_id) q = q.eq("category_id", filters.category_id)
    if (filters.supplier_id) q = q.eq("supplier_id", filters.supplier_id)
    if (filters.payment_method && filters.payment_method !== "all") {
      q = q.eq("payment_method", filters.payment_method)
    }
    if (filters.from) q = q.gte("expense_date", filters.from)
    if (filters.to) q = q.lte("expense_date", filters.to)
    if (filters.search) {
      q = q.or(
        `description.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
      )
    }

    const { data } = await q
    let rows = data || []
    if (filters.expense_type && filters.expense_type !== "all") {
      rows = rows.filter((r: any) => r.category?.expense_type === filters.expense_type)
    }
    return rows.reduce((acc: number, r: any) => acc + toNum(r.amount), 0)
  }

  async getExpenseById(id: string): Promise<ExpenseWithRelations | null> {
    const { data, error } = await this.supabase
      .from("expenses")
      .select(
        `*,
        category:expense_categories(id, name, expense_type),
        supplier:suppliers(id, name)`,
      )
      .eq("id", id)
      .single()

    if (error) return null
    const r = data as any
    return {
      ...r,
      amount: toNum(r.amount),
      category_name: r.category?.name,
      category_type: r.category?.expense_type,
      supplier_name: r.supplier?.name || null,
    }
  }

  async create(input: {
    expense_date: string
    description: string
    category_id: string
    supplier_id?: string | null
    amount: number
    payment_method?: PaymentMethod | null
    proof_url?: string | null
    notes?: string | null
    created_by?: string | null
  }): Promise<Expense> {
    const { data, error } = await this.supabase
      .from("expenses")
      .insert({
        expense_date: input.expense_date,
        description: input.description,
        category_id: input.category_id,
        supplier_id: input.supplier_id || null,
        amount: toNum(input.amount),
        payment_method: input.payment_method || null,
        proof_url: input.proof_url || null,
        notes: input.notes || null,
        created_by: input.created_by || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as Expense
  }

  async update(
    id: string,
    input: Partial<{
      expense_date: string
      description: string
      category_id: string
      supplier_id: string | null
      amount: number
      payment_method: PaymentMethod | null
      proof_url: string | null
      notes: string | null
    }>,
  ): Promise<Expense> {
    const payload: any = { ...input }
    if (payload.amount !== undefined) payload.amount = toNum(payload.amount)

    const { data, error } = await this.supabase
      .from("expenses")
      .update(payload)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as Expense
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("expenses").delete().eq("id", id)
    if (error) throw error
  }

  /**
   * Estadísticas resumidas para el dashboard de egresos
   */
  async getStats(from: string, to: string): Promise<ExpenseStats> {
    const { data, error } = await this.supabase
      .from("expenses")
      .select(
        `amount, category_id, supplier_id,
         category:expense_categories(name, expense_type),
         supplier:suppliers(name)`,
      )
      .gte("expense_date", from)
      .lte("expense_date", to)

    if (error) throw error

    const rows = (data || []) as any[]

    const totalAmount = rows.reduce((acc, r) => acc + toNum(r.amount), 0)
    const totalCount = rows.length
    const totalFijo = rows
      .filter((r) => r.category?.expense_type === "fijo")
      .reduce((acc, r) => acc + toNum(r.amount), 0)
    const totalVariable = rows
      .filter((r) => r.category?.expense_type === "variable")
      .reduce((acc, r) => acc + toNum(r.amount), 0)

    const byCategoryMap: Record<string, number> = {}
    const bySupplierMap: Record<string, number> = {}

    for (const r of rows) {
      const catName = r.category?.name || "Sin categoría"
      byCategoryMap[catName] = (byCategoryMap[catName] || 0) + toNum(r.amount)
      if (r.supplier?.name) {
        bySupplierMap[r.supplier.name] =
          (bySupplierMap[r.supplier.name] || 0) + toNum(r.amount)
      }
    }

    const topCategoryEntry = Object.entries(byCategoryMap).sort(
      (a, b) => b[1] - a[1],
    )[0]
    const topSupplierEntry = Object.entries(bySupplierMap).sort(
      (a, b) => b[1] - a[1],
    )[0]

    // Período anterior: misma cantidad de días, terminando justo antes del "from"
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const diff = toDate.getTime() - fromDate.getTime()
    const prevTo = new Date(fromDate.getTime() - 86400000)
    const prevFrom = new Date(prevTo.getTime() - diff)

    const { data: prevData } = await this.supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", prevFrom.toISOString().split("T")[0])
      .lte("expense_date", prevTo.toISOString().split("T")[0])

    const previousPeriodAmount = (prevData || []).reduce(
      (acc, r) => acc + toNum((r as any).amount),
      0,
    )

    return {
      totalAmount,
      totalCount,
      totalFijo,
      totalVariable,
      topCategory: topCategoryEntry
        ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] }
        : null,
      topSupplier: topSupplierEntry
        ? { name: topSupplierEntry[0], amount: topSupplierEntry[1] }
        : null,
      previousPeriodAmount,
    }
  }

  async getExpensesReport(
    startDate: Date,
    endDate: Date,
  ): Promise<ExpensesReportData> {
    const from = startDate.toISOString().split("T")[0]
    const to = endDate.toISOString().split("T")[0]
    const stats = await this.getStats(from, to)

    const { data, error } = await this.supabase
      .from("expenses")
      .select(
        `expense_date, amount,
         category:expense_categories(name, expense_type),
         supplier:suppliers(name)`,
      )
      .gte("expense_date", from)
      .lte("expense_date", to)

    if (error) throw error
    const rows = (data || []) as any[]

    // By category
    const catMap: Record<
      string,
      { amount: number; count: number; type: ExpenseType }
    > = {}
    for (const r of rows) {
      const name = r.category?.name || "Sin categoría"
      const type = (r.category?.expense_type || "variable") as ExpenseType
      if (!catMap[name]) catMap[name] = { amount: 0, count: 0, type }
      catMap[name].amount += toNum(r.amount)
      catMap[name].count += 1
    }
    const byCategory = Object.entries(catMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.amount - a.amount)

    // By supplier
    const supMap: Record<string, { amount: number; count: number }> = {}
    for (const r of rows) {
      if (!r.supplier?.name) continue
      if (!supMap[r.supplier.name])
        supMap[r.supplier.name] = { amount: 0, count: 0 }
      supMap[r.supplier.name].amount += toNum(r.amount)
      supMap[r.supplier.name].count += 1
    }
    const bySupplier = Object.entries(supMap)
      .map(([supplier, v]) => ({ supplier, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // By month (YYYY-MM)
    const monthMap: Record<string, number> = {}
    for (const r of rows) {
      const m = (r.expense_date as string).substring(0, 7)
      monthMap[m] = (monthMap[m] || 0) + toNum(r.amount)
    }
    const byMonth = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }))

    return { stats, byCategory, bySupplier, byMonth }
  }
}

export function createExpensesService(supabase: SupabaseClient) {
  return new ExpensesService(supabase)
}

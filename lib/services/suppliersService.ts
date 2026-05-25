import { SupabaseClient } from "@supabase/supabase-js"
import type { Supplier, FiscalCondition } from "@/lib/types/database"

export const SUPPLIERS_PER_PAGE = 15

export interface SupplierFilters {
  search?: string
  is_active?: string // "true" | "false" | "all"
  province?: string // valor exacto (match canónico de ARGENTINA_PROVINCES)
  locality?: string // ilike parcial
}

export interface PaginatedSuppliers {
  suppliers: SupplierWithStats[]
  total: number
  page: number
  totalPages: number
}

export interface SupplierWithStats extends Supplier {
  expense_count?: number
  total_amount?: number
}

export interface SupplierInput {
  name: string
  tax_id?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  is_active?: boolean
  external_id?: string | null
  fiscal_condition?: FiscalCondition | null
  address?: string | null
  locality?: string | null
  province?: string | null
  mobile?: string | null
  credit_limit?: number | null
  category?: string | null
  siap_concept?: string | null
}

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

class SuppliersService {
  constructor(private supabase: SupabaseClient) {}

  async getSuppliers(
    filters: SupplierFilters = {},
    page: number = 1,
    perPage: number = SUPPLIERS_PER_PAGE,
  ): Promise<PaginatedSuppliers> {
    let query = this.supabase.from("suppliers").select("*", { count: "exact" })

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,external_id.ilike.%${filters.search}%,locality.ilike.%${filters.search}%`,
      )
    }

    if (filters.is_active && filters.is_active !== "all") {
      query = query.eq("is_active", filters.is_active === "true")
    }

    if (filters.province && filters.province !== "all") {
      query = query.eq("province", filters.province)
    }

    if (filters.locality) {
      query = query.ilike("locality", `%${filters.locality}%`)
    }

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, count, error } = await query
      .order("name", { ascending: true })
      .range(from, to)

    if (error) {
      console.error("Error fetching suppliers:", error)
      throw error
    }

    const suppliers = (data || []) as Supplier[]

    // Adjuntar estadísticas (count + total) por proveedor
    const supplierIds = suppliers.map((s) => s.id)
    let statsMap: Record<string, { count: number; total: number }> = {}

    if (supplierIds.length > 0) {
      const { data: expenseData } = await this.supabase
        .from("expenses")
        .select("supplier_id, amount")
        .in("supplier_id", supplierIds)

      for (const row of expenseData || []) {
        const sid = (row as any).supplier_id as string
        if (!sid) continue
        const amt = toNum((row as any).amount)
        if (!statsMap[sid]) statsMap[sid] = { count: 0, total: 0 }
        statsMap[sid].count += 1
        statsMap[sid].total += amt
      }
    }

    const total = count || 0
    return {
      suppliers: suppliers.map((s) => ({
        ...s,
        expense_count: statsMap[s.id]?.count || 0,
        total_amount: statsMap[s.id]?.total || 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    }
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) throw error
    return (data || []) as Supplier[]
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return null
    return data as Supplier
  }

  async getSupplierWithStats(id: string): Promise<SupplierWithStats | null> {
    const supplier = await this.getSupplierById(id)
    if (!supplier) return null

    const { data: expenseData } = await this.supabase
      .from("expenses")
      .select("amount")
      .eq("supplier_id", id)

    const rows = expenseData || []
    return {
      ...supplier,
      expense_count: rows.length,
      total_amount: rows.reduce((acc, r) => acc + toNum((r as any).amount), 0),
    }
  }

  async create(input: SupplierInput): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .insert({
        name: input.name,
        tax_id: input.tax_id || null,
        phone: input.phone || null,
        email: input.email || null,
        notes: input.notes || null,
        is_active: input.is_active ?? true,
        external_id: input.external_id || null,
        fiscal_condition: input.fiscal_condition || null,
        address: input.address || null,
        locality: input.locality || null,
        province: input.province || null,
        mobile: input.mobile || null,
        credit_limit: input.credit_limit ?? null,
        category: input.category || null,
        siap_concept: input.siap_concept || null,
      })
      .select()
      .single()

    if (error) throw error
    return data as Supplier
  }

  async update(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .update(input)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as Supplier
  }

  /**
   * Si el proveedor tiene egresos asociados, soft delete (is_active=false).
   * Sino, delete físico.
   */
  async delete(id: string): Promise<{ softDeleted: boolean }> {
    const { count } = await this.supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", id)

    if ((count || 0) > 0) {
      const { error } = await this.supabase
        .from("suppliers")
        .update({ is_active: false })
        .eq("id", id)
      if (error) throw error
      return { softDeleted: true }
    }

    const { error } = await this.supabase
      .from("suppliers")
      .delete()
      .eq("id", id)
    if (error) throw error
    return { softDeleted: false }
  }
}

export function createSuppliersService(supabase: SupabaseClient) {
  return new SuppliersService(supabase)
}

import { SupabaseClient } from "@supabase/supabase-js"
import type { ExpenseCategory, ExpenseType } from "@/lib/types/database"

export const EXPENSE_CATEGORIES_PER_PAGE = 15

export interface ExpenseCategoryFilters {
  search?: string
  expense_type?: ExpenseType | "all"
  is_active?: string // "true" | "false" | "all"
}

export interface PaginatedExpenseCategories {
  categories: ExpenseCategory[]
  total: number
  page: number
  totalPages: number
}

class ExpenseCategoriesService {
  constructor(private supabase: SupabaseClient) {}

  async getCategories(
    filters: ExpenseCategoryFilters = {},
    page: number = 1,
    perPage: number = EXPENSE_CATEGORIES_PER_PAGE,
  ): Promise<PaginatedExpenseCategories> {
    let query = this.supabase
      .from("expense_categories")
      .select("*", { count: "exact" })

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      )
    }

    if (filters.expense_type && filters.expense_type !== "all") {
      query = query.eq("expense_type", filters.expense_type)
    }

    if (filters.is_active && filters.is_active !== "all") {
      query = query.eq("is_active", filters.is_active === "true")
    }

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, count, error } = await query
      .order("name", { ascending: true })
      .range(from, to)

    if (error) {
      console.error("Error fetching expense categories:", error)
      throw error
    }

    const total = count || 0
    return {
      categories: (data || []) as ExpenseCategory[],
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    }
  }

  async getActiveCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await this.supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) throw error
    return (data || []) as ExpenseCategory[]
  }

  async getCategoryById(id: string): Promise<ExpenseCategory | null> {
    const { data, error } = await this.supabase
      .from("expense_categories")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return null
    return data as ExpenseCategory
  }

  async create(input: {
    name: string
    description?: string
    expense_type: ExpenseType
    is_active?: boolean
  }): Promise<ExpenseCategory> {
    const { data, error } = await this.supabase
      .from("expense_categories")
      .insert({
        name: input.name,
        description: input.description || null,
        expense_type: input.expense_type,
        is_active: input.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return data as ExpenseCategory
  }

  async update(
    id: string,
    input: Partial<{
      name: string
      description: string | null
      expense_type: ExpenseType
      is_active: boolean
    }>,
  ): Promise<ExpenseCategory> {
    const { data, error } = await this.supabase
      .from("expense_categories")
      .update(input)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as ExpenseCategory
  }

  /**
   * Borrado seguro: si la categoría tiene egresos, se hace soft delete
   * (is_active=false). Si no, se elimina físicamente.
   */
  async delete(id: string): Promise<{ softDeleted: boolean }> {
    const { count } = await this.supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)

    if ((count || 0) > 0) {
      const { error } = await this.supabase
        .from("expense_categories")
        .update({ is_active: false })
        .eq("id", id)
      if (error) throw error
      return { softDeleted: true }
    }

    const { error } = await this.supabase
      .from("expense_categories")
      .delete()
      .eq("id", id)
    if (error) throw error
    return { softDeleted: false }
  }

  async getStats(): Promise<{
    total: number
    fijo: number
    variable: number
    active: number
  }> {
    const { data, error } = await this.supabase
      .from("expense_categories")
      .select("expense_type, is_active")

    if (error) throw error

    const rows = data || []
    return {
      total: rows.length,
      fijo: rows.filter((r: any) => r.expense_type === "fijo").length,
      variable: rows.filter((r: any) => r.expense_type === "variable").length,
      active: rows.filter((r: any) => r.is_active).length,
    }
  }
}

export function createExpenseCategoriesService(supabase: SupabaseClient) {
  return new ExpenseCategoriesService(supabase)
}

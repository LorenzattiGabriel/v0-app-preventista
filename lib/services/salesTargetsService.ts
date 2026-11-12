// Objetivos de venta mensuales, por canal (venta_directa | preventista),
// generales o individuales. El admin los administra desde
// /admin/objetivos-venta; cada preventista ve su propio progreso en su
// dashboard. El progreso ("actual") se calcula en caliente a partir de
// orders — no se guarda, para que nunca quede desactualizado.

import type { SupabaseClient } from "@supabase/supabase-js"
import { createDirectSalesService } from "./directSalesService"

export type SalesTargetChannel = "venta_directa" | "preventista"
export type SalesTargetScope = "general" | "individual"

export interface SalesTarget {
  id: string
  period_month: string // 'YYYY-MM-01'
  channel: SalesTargetChannel
  scope: SalesTargetScope
  assigned_to: string | null
  assigned_to_name: string | null
  target_amount: number
  created_at: string
}

export interface SalesTargetProgress extends SalesTarget {
  actual_amount: number
  /** 0-100+, puede superar 100 si ya se cumplió y se siguió vendiendo. */
  percent: number
}

const toNum = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/** Primer día del mes en formato 'YYYY-MM-01', a partir de una fecha o de un 'YYYY-MM'. */
export function monthToPeriod(input: Date | string): string {
  if (typeof input === "string") {
    const [y, m] = input.split("-")
    return `${y}-${m.padStart(2, "0")}-01`
  }
  return `${input.getFullYear()}-${String(input.getMonth() + 1).padStart(2, "0")}-01`
}

/** Rango [from, to] de un mes dado un period_month 'YYYY-MM-01'. */
function monthRange(periodMonth: string): { from: Date; to: Date } {
  const from = new Date(`${periodMonth}T00:00:00`)
  const to = new Date(from)
  to.setMonth(to.getMonth() + 1)
  to.setDate(0)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

export class SalesTargetsService {
  constructor(private supabase: SupabaseClient) {}

  /** Objetivos de un mes (general + individuales), para la pantalla de admin. */
  async listTargets(periodMonth: string): Promise<SalesTarget[]> {
    const { data, error } = await this.supabase
      .from("sales_targets")
      .select("*, assigned:profiles!sales_targets_assigned_to_fkey(full_name)")
      .eq("period_month", periodMonth)
      .order("channel")
      .order("scope")

    if (error) {
      console.error("[salesTargetsService] listTargets error", error)
      return []
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      period_month: r.period_month,
      channel: r.channel,
      scope: r.scope,
      assigned_to: r.assigned_to,
      assigned_to_name: r.assigned?.full_name ?? null,
      target_amount: toNum(r.target_amount),
      created_at: r.created_at,
    }))
  }

  /** Objetivos de un mes con el progreso real (ventas del período) ya calculado. */
  async listTargetsWithProgress(periodMonth: string): Promise<SalesTargetProgress[]> {
    const targets = await this.listTargets(periodMonth)
    const range = monthRange(periodMonth)
    const directSales = createDirectSalesService(this.supabase)

    const withProgress = await Promise.all(
      targets.map(async (t) => {
        const kpis = await directSales.getKPIs({
          channel: t.channel,
          range,
          userId: t.assigned_to || undefined,
        })
        const actual = kpis.totalRevenue
        return {
          ...t,
          actual_amount: actual,
          percent: t.target_amount > 0 ? (actual / t.target_amount) * 100 : 0,
        }
      }),
    )

    return withProgress
  }

  /** Progreso de UN vendedor/preventista puntual contra su objetivo individual
   * del mes (si tiene uno asignado). Para el dashboard del rol. */
  async getIndividualProgress(
    periodMonth: string,
    channel: SalesTargetChannel,
    userId: string,
  ): Promise<SalesTargetProgress | null> {
    const { data, error } = await this.supabase
      .from("sales_targets")
      .select("*")
      .eq("period_month", periodMonth)
      .eq("channel", channel)
      .eq("scope", "individual")
      .eq("assigned_to", userId)
      .maybeSingle()

    if (error || !data) return null

    const range = monthRange(periodMonth)
    const directSales = createDirectSalesService(this.supabase)
    const kpis = await directSales.getKPIs({ channel, range, userId })
    const targetAmount = toNum(data.target_amount)

    return {
      id: data.id,
      period_month: data.period_month,
      channel: data.channel,
      scope: data.scope,
      assigned_to: data.assigned_to,
      assigned_to_name: null,
      target_amount: targetAmount,
      created_at: data.created_at,
      actual_amount: kpis.totalRevenue,
      percent: targetAmount > 0 ? (kpis.totalRevenue / targetAmount) * 100 : 0,
    }
  }

  async createTarget(input: {
    periodMonth: string
    channel: SalesTargetChannel
    scope: SalesTargetScope
    assignedTo?: string | null
    targetAmount: number
    createdBy: string
  }): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.from("sales_targets").insert({
      period_month: input.periodMonth,
      channel: input.channel,
      scope: input.scope,
      assigned_to: input.scope === "individual" ? input.assignedTo : null,
      target_amount: input.targetAmount,
      created_by: input.createdBy,
    })

    if (error) {
      // Violación de los índices únicos parciales: ya existe un objetivo para
      // ese mes/canal/alcance.
      if (error.code === "23505") {
        return { success: false, error: "Ya existe un objetivo para ese mes, canal y vendedor." }
      }
      console.error("[salesTargetsService] createTarget error", error)
      return { success: false, error: "Error al crear el objetivo." }
    }

    return { success: true }
  }

  async updateTargetAmount(id: string, targetAmount: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from("sales_targets")
      .update({ target_amount: targetAmount })
      .eq("id", id)

    if (error) {
      console.error("[salesTargetsService] updateTargetAmount error", error)
      return { success: false, error: "Error al actualizar el objetivo." }
    }
    return { success: true }
  }

  async deleteTarget(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.from("sales_targets").delete().eq("id", id)
    if (error) {
      console.error("[salesTargetsService] deleteTarget error", error)
      return { success: false, error: "Error al eliminar el objetivo." }
    }
    return { success: true }
  }
}

export function createSalesTargetsService(supabase: SupabaseClient) {
  return new SalesTargetsService(supabase)
}

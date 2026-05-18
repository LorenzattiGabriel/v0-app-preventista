// Agregación pura de ventas a KPIs.
// Reutilizable desde cliente (con dataset ya cargado) y desde el service (server).
// No tiene side effects ni dependencias de Supabase.

import type { PaymentMethod, PaymentLine } from "@/lib/types/database"
import type { DirectSale, DirectSaleKPIs } from "@/lib/types/venta-directa"
import { toNum } from "./cart-calculations"

interface DateRange {
  from: Date
  to: Date
}

/**
 * Filtra ventas por rango de fechas usando `created_at`.
 * Si no se pasa rango, devuelve todas las ventas.
 */
export function filterSalesByRange(sales: DirectSale[], range?: DateRange): DirectSale[] {
  if (!range) return sales
  const from = range.from.getTime()
  const to = range.to.getTime()
  return sales.filter((s) => {
    const ts = new Date(s.created_at).getTime()
    return ts >= from && ts <= to
  })
}

/**
 * Agrega ventas a KPIs: total, facturado, ticket promedio, items vendidos,
 * desglose por método de pago y monto a cuenta corriente.
 */
export function aggregateSalesToKpis(sales: DirectSale[]): DirectSaleKPIs {
  const totalSales = sales.length
  const totalRevenue = sales.reduce((s, r) => s + toNum(r.total), 0)
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

  const totalItems = sales.reduce((s, r) => {
    const items = r.items || []
    return (
      s +
      items.reduce(
        (sa, it) =>
          sa +
          toNum(
            (it as any).quantity_delivered ??
              it.quantity_assembled ??
              it.quantity_requested,
          ),
        0,
      )
    )
  }, 0)

  // Desglose por método de pago
  const breakdownMap = new Map<PaymentMethod, { amount: number; count: number }>()
  let accountReceivable = 0

  for (const r of sales) {
    const lines: PaymentLine[] =
      Array.isArray(r.payment_methods_json) && r.payment_methods_json.length > 0
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

  return {
    totalSales,
    totalRevenue,
    averageTicket,
    totalItems,
    paymentBreakdown,
    accountReceivable,
  }
}

/**
 * Helpers para construir rangos de fechas habituales (cliente o server).
 */
export function getRangeForPreset(
  preset: "today" | "week" | "current_month" | "previous_month",
  now: Date = new Date(),
): DateRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  switch (preset) {
    case "today": {
      const from = new Date(y, m, d, 0, 0, 0, 0)
      const to = new Date(y, m, d, 23, 59, 59, 999)
      return { from, to }
    }
    case "week": {
      // Lunes de la semana actual a domingo
      const day = now.getDay() // 0=domingo
      const offsetToMonday = day === 0 ? -6 : 1 - day
      const monday = new Date(y, m, d + offsetToMonday, 0, 0, 0, 0)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      return { from: monday, to: sunday }
    }
    case "current_month": {
      const from = new Date(y, m, 1, 0, 0, 0, 0)
      const to = new Date(y, m + 1, 0, 23, 59, 59, 999)
      return { from, to }
    }
    case "previous_month": {
      const from = new Date(y, m - 1, 1, 0, 0, 0, 0)
      const to = new Date(y, m, 0, 23, 59, 59, 999)
      return { from, to }
    }
  }
}

// Funciones puras para cálculos del carrito.
// Sin side effects, sin DOM, sin Supabase → fáciles de testear y reutilizar
// desde cliente (form) y servidor (validación cruzada).

import type { CartLine, CartTotals } from "@/lib/types/venta-directa"

/**
 * Coerce a Number tolerando strings (Supabase devuelve DECIMAL como string).
 */
export function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Subtotal de una línea: (precio * cantidad) - descuento (en pesos o %).
 */
export function calcLineSubtotal(
  unitPrice: number,
  quantity: number,
  discount: number,
  discountType: "fixed" | "percentage" = "fixed",
): number {
  const gross = toNum(unitPrice) * toNum(quantity)
  const disc = discountType === "percentage"
    ? gross * (toNum(discount) / 100)
    : toNum(discount)
  return Math.max(0, gross - disc)
}

/**
 * Totales del carrito completo, aplicando descuento general (fijo o %).
 */
export function calcCartTotals(
  lines: CartLine[],
  generalDiscount: number,
  generalDiscountType: "fixed" | "percentage" = "fixed",
): CartTotals {
  const subtotal = lines.reduce((s, l) => s + toNum(l.subtotal), 0)
  const generalDiscountAmount = generalDiscountType === "percentage"
    ? subtotal * (toNum(generalDiscount) / 100)
    : toNum(generalDiscount)
  const total = Math.max(0, subtotal - generalDiscountAmount)
  return { subtotal, generalDiscountAmount, total }
}

/**
 * Cuánto se pagó (suma de líneas de pago).
 */
export function calcTotalPaid(paymentLines: Array<{ amount: number }>): number {
  return paymentLines.reduce((s, p) => s + toNum(p.amount), 0)
}

/**
 * Determina el método de pago "principal" para backward compat
 * (campo orders.payment_method) = el de mayor monto.
 */
export function pickPrimaryPaymentMethod<T extends { method: string; amount: number }>(
  lines: T[],
): T | undefined {
  if (lines.length === 0) return undefined
  return [...lines].sort((a, b) => toNum(b.amount) - toNum(a.amount))[0]
}

/**
 * Calcula cuánto del total queda como deuda (pagos en Cuenta Corriente).
 */
export function calcAccountReceivable<T extends { method: string; amount: number }>(
  lines: T[],
): number {
  return lines
    .filter((l) => l.method === "Cuenta Corriente")
    .reduce((s, l) => s + toNum(l.amount), 0)
}

/**
 * Métodos de pago - Constantes y tipos
 * Estos valores deben coincidir con el enum payment_method_enum de la base de datos
 */

export const PAYMENT_METHODS = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA_CREDITO: "Tarjeta de Crédito",
  TARJETA_DEBITO: "Tarjeta de Débito",
  CHEQUE: "Cheque",
  CUENTA_CORRIENTE: "Cuenta Corriente",
  OTRO: "Otro",
} as const

// Tipo derivado de las constantes
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]

// Métodos de pago disponibles para cobro en entrega (subset)
export const DELIVERY_PAYMENT_METHODS = [
  PAYMENT_METHODS.EFECTIVO,
  PAYMENT_METHODS.TRANSFERENCIA,
  PAYMENT_METHODS.TARJETA_CREDITO,
  PAYMENT_METHODS.TARJETA_DEBITO,
] as const

// Métodos de pago que requieren comprobante
export const METHODS_REQUIRING_PROOF = [
  PAYMENT_METHODS.TRANSFERENCIA,
] as const

// Labels con emojis para UI
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.EFECTIVO]: "💵 Efectivo",
  [PAYMENT_METHODS.TRANSFERENCIA]: "🏦 Transferencia",
  [PAYMENT_METHODS.TARJETA_CREDITO]: "💳 Tarjeta de Crédito",
  [PAYMENT_METHODS.TARJETA_DEBITO]: "💳 Tarjeta de Débito",
  [PAYMENT_METHODS.CHEQUE]: "📄 Cheque",
  [PAYMENT_METHODS.CUENTA_CORRIENTE]: "📒 Cuenta Corriente",
  [PAYMENT_METHODS.OTRO]: "📋 Otro",
}

// Helper para verificar si un método requiere comprobante
export function requiresProof(method: PaymentMethod): boolean {
  return METHODS_REQUIRING_PROOF.includes(method as any)
}

// Helper para obtener el label con emoji
export function getPaymentMethodLabel(method: PaymentMethod | string | null | undefined): string {
  if (!method) return "Sin método"
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] || method
}


// Schemas Zod compartidos entre cliente (form) y servidor (server action / RPC).
// Una sola fuente de verdad para validación.

import { z } from "zod"
import { PAYMENT_METHODS } from "@/lib/types/database"

export const paymentLineSchema = z.object({
  method: z.enum(PAYMENT_METHODS as [string, ...string[]]),
  amount: z.number().nonnegative(),
  transferProofUrl: z.string().url().optional(),
})

export const directSaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).default(0),
  // Si se quisiera persistir el tipo de descuento por línea habría que extender el schema de DB.
  // Por ahora resolvemos el cálculo en cliente y mandamos discount ya en pesos al server.
  subtotal: z.number().nonnegative(),
})

export const directSaleInputSchema = z.object({
  customerId: z.string().uuid("Cliente requerido"),
  items: z.array(directSaleItemSchema).min(1, "Debe agregar al menos un producto"),
  paymentMethods: z.array(paymentLineSchema).min(1, "Debe registrar al menos un método de pago"),
  generalDiscount: z.number().min(0).default(0),
  generalDiscountType: z.enum(["fixed", "percentage"]).default("fixed"),
  observations: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid(),
}).refine(
  (data) => {
    // La suma de pagos debe coincidir con el total esperado (calculado en server).
    // Acá solo validamos que haya monto > 0 cuando hay items.
    const totalPaid = data.paymentMethods.reduce((s, p) => s + p.amount, 0)
    return totalPaid > 0
  },
  { message: "El total de pagos debe ser mayor a 0", path: ["paymentMethods"] },
)

export type DirectSaleInput = z.infer<typeof directSaleInputSchema>
export type DirectSaleItemInput = z.infer<typeof directSaleItemSchema>
export type PaymentLineInput = z.infer<typeof paymentLineSchema>

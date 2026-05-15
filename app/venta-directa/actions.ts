"use server"

// Server actions del rol venta_directa.
// Son orquestadoras delgadas: validan auth, parsean con Zod,
// delegan en el service y revalidan los paths afectados.

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { directSaleInputSchema } from "@/lib/schemas/directSale.schema"
import type { Result } from "@/lib/types/result"

interface ConfirmSaleResponse {
  orderId: string
  orderNumber: string
  duplicated: boolean
}

export async function confirmDirectSaleAction(
  input: unknown,
): Promise<Result<ConfirmSaleResponse>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "No autorizado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "venta_directa") {
    return { success: false, error: "Sin permisos para crear ventas directas" }
  }

  const parsed = directSaleInputSchema.safeParse(input)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return {
      success: false,
      error: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Datos inválidos",
    }
  }

  const service = createDirectSalesService(supabase)
  const result = await service.confirmSale(parsed.data, user.id)

  if (result.success) {
    revalidatePath("/venta-directa/dashboard")
    revalidatePath("/venta-directa/ventas")
  }

  return result
}

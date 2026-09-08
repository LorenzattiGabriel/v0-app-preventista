import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"
import { revalidatePath } from "next/cache"

const ALLOWED_ROLES = ["encargado_armado", "supervisor_armado", "administrativo"]

interface ConfirmItem {
  id: string
  productId: string
  quantityAssembled: number
  isShortage: boolean
  shortageReason?: string | null
  shortageNotes?: string | null
  isSubstituted: boolean
  substitutedProductId?: string | null
  assembledWeightKg: number | null
}

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : Number.parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * POST /api/armado/orders/[id]/confirm
 * Confirma el armado de un pedido en UNA sola request server-side.
 *
 * Antes esto eran ~13 requests encadenadas desde el navegador del armador y la
 * deuda de cuenta corriente se registraba al final dentro de un try/catch que
 * tragaba el error: si la conexión se caía a mitad de camino el pedido quedaba
 * armado y entregado PERO sin deuda en la cuenta corriente del cliente, y nadie
 * se enteraba (caso PED-3696).
 *
 * Orden de operaciones pensado para que un fallo no deje datos inconsistentes:
 *   1. Validar que siga EN_ARMADO
 *   2. Guardar items (idempotente: son valores absolutos)
 *   3. Tomar el pedido (update condicional a EN_ARMADO) -> evita doble confirmación
 *   4. Registrar la DEUDA. Si falla, se REVIERTE el paso 3 y se devuelve error.
 *   5. Descontar stock (no idempotente, va después del punto de no retorno)
 *   6. Historial
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos para confirmar armado" }, { status: 403 })
    }

    const body = await request.json()
    const items: ConfirmItem[] = body.items || []
    const assemblyNotes: string = body.assemblyNotes ?? ""
    const newTotal = toNum(body.newTotal)
    const hasShortages = Boolean(body.hasShortages)

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El pedido no tiene items" }, { status: 400 })
    }

    // 1. Validar estado actual
    const { data: order, error: orderFetchError } = await supabase
      .from("orders")
      .select("id, order_number, status, total, assembled_by")
      .eq("id", orderId)
      .single()

    if (orderFetchError || !order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    if (order.status !== "EN_ARMADO") {
      return NextResponse.json(
        { error: "Este pedido ya no está en armado. Actualizá la página antes de confirmar." },
        { status: 409 }
      )
    }

    if (order.assembled_by && order.assembled_by !== user.id) {
      return NextResponse.json(
        { error: "Este pedido lo está armando otro usuario" },
        { status: 409 }
      )
    }

    // 2. Guardar items armados (valores absolutos -> reintentable sin efectos)
    for (const item of items) {
      const { error: itemError } = await supabase
        .from("order_items")
        .update({
          quantity_assembled: item.quantityAssembled,
          is_shortage: item.isShortage,
          shortage_reason: item.shortageReason ?? null,
          shortage_notes: item.shortageNotes ?? null,
          is_substituted: item.isSubstituted,
          substituted_product_id: item.substitutedProductId ?? null,
          assembled_weight_kg: item.assembledWeightKg,
        })
        .eq("id", item.id)
        .eq("order_id", orderId)

      if (itemError) {
        console.error("[confirm-assembly] Error guardando item:", itemError)
        return NextResponse.json(
          { error: "No se pudieron guardar las cantidades armadas. Reintentá." },
          { status: 500 }
        )
      }
    }

    // 3. Tomar el pedido (condicional: sólo si sigue EN_ARMADO)
    const previousTotal = order.total
    const { data: claimedRows, error: claimError } = await supabase
      .from("orders")
      .update({
        status: "PENDIENTE_ENTREGA",
        total: newTotal,
        has_shortages: hasShortages,
        assembled_by: user.id,
        assembly_completed_at: new Date().toISOString(),
        assembly_notes: assemblyNotes,
      })
      .eq("id", orderId)
      .eq("status", "EN_ARMADO")
      .select("id")

    if (claimError) {
      console.error("[confirm-assembly] Error actualizando pedido:", claimError)
      return NextResponse.json({ error: "Error al confirmar el armado" }, { status: 500 })
    }

    if (!claimedRows || claimedRows.length === 0) {
      return NextResponse.json(
        { error: "Este pedido ya fue confirmado. Actualizá la página." },
        { status: 409 }
      )
    }

    // 4. Registrar la deuda en cuenta corriente. Es el paso crítico: si falla,
    //    devolvemos el pedido a EN_ARMADO para que el armador pueda reintentar
    //    en vez de dejar un pedido armado sin deuda.
    try {
      const accountService = createAccountMovementsService(supabase)
      await accountService.recordOrderAssembled(orderId, newTotal, user.id)
    } catch (debtError) {
      console.error("[confirm-assembly] Error registrando deuda:", debtError)

      await supabase
        .from("orders")
        .update({
          status: "EN_ARMADO",
          total: previousTotal,
          assembly_completed_at: null,
        })
        .eq("id", orderId)

      return NextResponse.json(
        {
          error:
            "No se pudo registrar la deuda en la cuenta corriente del cliente. " +
            "El armado NO se confirmó: revisá la conexión y reintentá.",
          debtFailed: true,
        },
        { status: 500 }
      )
    }

    // 5. Descontar stock (best effort: un fallo acá no invalida el armado,
    //    pero lo reportamos al armador para que avise)
    const stockWarnings: string[] = []
    for (const item of items) {
      if (toNum(item.quantityAssembled) <= 0) continue

      const productIdToUpdate =
        item.isSubstituted && item.substitutedProductId ? item.substitutedProductId : item.productId

      const { data: product, error: productFetchError } = await supabase
        .from("products")
        .select("current_stock, name")
        .eq("id", productIdToUpdate)
        .single()

      if (productFetchError || !product) {
        console.error("[confirm-assembly] Error leyendo stock:", productFetchError)
        stockWarnings.push(productIdToUpdate)
        continue
      }

      const newStock = Math.max(0, toNum(product.current_stock) - toNum(item.quantityAssembled))
      const { error: stockError } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", productIdToUpdate)

      if (stockError) {
        console.error("[confirm-assembly] Error actualizando stock:", stockError)
        stockWarnings.push(product.name || productIdToUpdate)
      }
    }

    // 6. Historial
    const { error: historyError } = await supabase.from("order_history").insert({
      order_id: orderId,
      previous_status: "EN_ARMADO",
      new_status: "PENDIENTE_ENTREGA",
      changed_by: user.id,
      change_reason: hasShortages ? "Armado completado con faltantes" : "Armado completado",
    })

    if (historyError) {
      console.error("[confirm-assembly] Error guardando historial:", historyError)
    }

    revalidatePath("/armado/dashboard")

    return NextResponse.json({
      success: true,
      order_number: order.order_number,
      total: newTotal,
      has_shortages: hasShortages,
      warnings: stockWarnings.length
        ? [`No se pudo descontar el stock de: ${stockWarnings.join(", ")}. Avisale al administrador.`]
        : [],
    })
  } catch (error) {
    console.error("[confirm-assembly] Error interno:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

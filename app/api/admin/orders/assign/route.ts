import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const ALLOWED_ROLES = ["administrativo"]

/**
 * POST /api/admin/orders/assign
 * Asigna o desasigna pedidos a un armador.
 * Solo afecta pedidos en PENDIENTE_ARMADO (no toca los EN_ARMADO).
 * Body: { order_ids: string[], armador_id: string | null }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json(
        { error: "Sin permisos para asignar pedidos" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { order_ids, armador_id } = body

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requieren al menos 1 pedido" },
        { status: 400 }
      )
    }

    // Validar que armador_id sea null o un perfil con rol encargado_armado
    let armadorName: string | null = null
    if (armador_id) {
      const { data: armadorProfile } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", armador_id)
        .single()

      if (!armadorProfile) {
        return NextResponse.json(
          { error: "El armador especificado no existe" },
          { status: 400 }
        )
      }
      if (armadorProfile.role !== "encargado_armado") {
        return NextResponse.json(
          { error: "El usuario seleccionado no es un armador" },
          { status: 400 }
        )
      }
      armadorName = armadorProfile.full_name
    }

    // Validar que todos los pedidos estén en PENDIENTE_ARMADO
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, status, assembled_by")
      .in("id", order_ids)

    if (fetchError || !orders) {
      return NextResponse.json(
        { error: "Error al obtener pedidos" },
        { status: 500 }
      )
    }

    const invalidOrders = orders.filter(
      (o) => o.status !== "PENDIENTE_ARMADO"
    )
    if (invalidOrders.length > 0) {
      return NextResponse.json(
        {
          error: `Solo se pueden asignar pedidos en estado PENDIENTE_ARMADO. Pedidos inválidos: ${invalidOrders
            .map((o) => `${o.order_number} (${o.status})`)
            .join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Aplicar la asignación
    const { error: updateError } = await supabase
      .from("orders")
      .update({ assembled_by: armador_id })
      .in("id", order_ids)

    if (updateError) {
      console.error("[assign] Error updating orders:", updateError)
      return NextResponse.json(
        { error: "Error al asignar pedidos" },
        { status: 500 }
      )
    }

    // Loggear cambios en el historial
    const historyEntries = orders.map((o) => ({
      order_id: o.id,
      previous_status: o.status,
      new_status: o.status,
      changed_by: user.id,
      change_reason: armador_id
        ? `Asignado a ${armadorName} por ${profile.full_name}`
        : `Desasignado por ${profile.full_name}`,
    }))
    await supabase.from("order_history").insert(historyEntries)

    revalidatePath("/admin/orders/assign")
    revalidatePath("/armado/dashboard")

    return NextResponse.json({
      success: true,
      assigned_count: orders.length,
      armador_name: armadorName,
    })
  } catch (error) {
    console.error("[assign] Internal error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

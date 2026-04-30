"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function releaseOrderAction(orderId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "No autorizado" }
  }

  // Validar que el armador actual sea el dueño del lock
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, assembled_by")
    .eq("id", orderId)
    .single()

  if (fetchError || !order) {
    return { error: "Pedido no encontrado" }
  }

  if (order.status !== "EN_ARMADO") {
    return { error: "El pedido no está en armado" }
  }

  if (order.assembled_by && order.assembled_by !== user.id) {
    return { error: "Este pedido lo está armando otro usuario" }
  }

  // Liberar: vuelve a PENDIENTE_ARMADO sin asignación
  const { error: releaseError } = await supabase
    .from("orders")
    .update({
      status: "PENDIENTE_ARMADO",
      assembled_by: null,
      assembly_started_at: null,
    })
    .eq("id", orderId)

  if (releaseError) {
    console.error("[releaseOrder] Error:", releaseError)
    return { error: "Error al liberar el pedido" }
  }

  // Historial
  await supabase.from("order_history").insert({
    order_id: orderId,
    previous_status: "EN_ARMADO",
    new_status: "PENDIENTE_ARMADO",
    changed_by: user.id,
    change_reason: "Pedido liberado por el armador",
  })

  revalidatePath("/armado/dashboard")

  // CRITICAL: usar redirect() server-side. Si retornáramos { success } al cliente
  // y luego hiciéramos router.push, Next.js auto-revalida la ruta del action
  // (la página del pedido) ANTES de la navegación → re-ejecuta el server
  // component → el auto-lock vuelve a tomar el pedido (PENDIENTE_ARMADO →
  // EN_ARMADO con assembled_by = user.id). Con redirect, el cliente navega
  // al dashboard sin re-renderizar la página del pedido.
  redirect("/armado/dashboard")
}

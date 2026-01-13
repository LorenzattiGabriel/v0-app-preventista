/**
 * Servicio para gestión de pedidos retrasados
 * Maneja consultas, reprogramaciones e historial de cambios
 */

import { SupabaseClient } from "@supabase/supabase-js"
import type { DelayedOrder, OrderDateChange, DelaySeverity } from "@/lib/types/database"

export interface DelayedOrdersService {
  getDelayedOrders(): Promise<DelayedOrder[]>
  getDelayedOrdersCount(): Promise<number>
  rescheduleOrder(
    orderId: string,
    newDeliveryDate: string,
    reason: string,
    userId: string,
    increasePriority?: boolean
  ): Promise<{ success: boolean; error?: string; data?: any }>
  rescheduleMultipleOrders(
    orderIds: string[],
    newDeliveryDate: string,
    reason: string,
    userId: string,
    increasePriority?: boolean
  ): Promise<{ success: boolean; error?: string; results?: any[] }>
  getOrderRescheduleHistory(orderId: string): Promise<OrderDateChange[]>
}

/**
 * Calcula la severidad del retraso basado en días
 */
function calculateDelaySeverity(daysDelayed: number): DelaySeverity {
  if (daysDelayed > 7) return "critical"
  if (daysDelayed > 3) return "warning"
  return "minor"
}

/**
 * Crea una instancia del servicio de pedidos retrasados
 */
export function createDelayedOrdersService(supabase: SupabaseClient): DelayedOrdersService {
  return {
    /**
     * Obtiene todos los pedidos retrasados
     * Pedidos con fecha de entrega pasada, sin ruta activa asignada
     */
    async getDelayedOrders(): Promise<DelayedOrder[]> {
      const today = new Date().toISOString().split("T")[0]

      // Primero obtener pedidos que están en rutas activas
      const { data: ordersInActiveRoutes } = await supabase
        .from("route_orders")
        .select(`
          order_id,
          routes!inner(status)
        `)
        .in("routes.status", ["PLANIFICADO", "EN_CURSO"])

      const orderIdsInRoutes = new Set(
        ordersInActiveRoutes?.map((ro) => ro.order_id) || []
      )

      // Obtener pedidos retrasados
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers (
            id,
            commercial_name,
            contact_name,
            locality,
            phone,
            latitude,
            longitude
          )
        `)
        .lt("delivery_date", today)
        .eq("status", "PENDIENTE_ENTREGA")
        .order("delivery_date", { ascending: true })

      if (error) {
        console.error("Error fetching delayed orders:", error)
        return []
      }

      // Filtrar los que NO están en rutas activas y mapear
      const delayedOrders: DelayedOrder[] = (orders || [])
        .filter((order) => !orderIdsInRoutes.has(order.id))
        .map((order) => {
          const deliveryDate = new Date(order.delivery_date)
          const todayDate = new Date(today)
          const daysDelayed = Math.floor(
            (todayDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          return {
            ...order,
            days_delayed: daysDelayed,
            delay_severity: calculateDelaySeverity(daysDelayed),
            customer_name: order.customers?.commercial_name || "Sin nombre",
            customer_contact: order.customers?.contact_name,
            customer_locality: order.customers?.locality,
            customer_phone: order.customers?.phone,
            customer_latitude: order.customers?.latitude,
            customer_longitude: order.customers?.longitude,
          }
        })

      return delayedOrders
    },

    /**
     * Obtiene el conteo de pedidos retrasados (para badge en sidebar)
     */
    async getDelayedOrdersCount(): Promise<number> {
      const today = new Date().toISOString().split("T")[0]

      // Obtener pedidos en rutas activas
      const { data: ordersInActiveRoutes } = await supabase
        .from("route_orders")
        .select(`order_id, routes!inner(status)`)
        .in("routes.status", ["PLANIFICADO", "EN_CURSO"])

      const orderIdsInRoutes = new Set(
        ordersInActiveRoutes?.map((ro) => ro.order_id) || []
      )

      // Contar pedidos retrasados
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id")
        .lt("delivery_date", today)
        .eq("status", "PENDIENTE_ENTREGA")

      if (error) {
        console.error("Error counting delayed orders:", error)
        return 0
      }

      // Filtrar los que NO están en rutas activas
      const count = (orders || []).filter(
        (order) => !orderIdsInRoutes.has(order.id)
      ).length

      return count
    },

    /**
     * Reprograma un pedido a una nueva fecha de entrega
     */
    async rescheduleOrder(
      orderId: string,
      newDeliveryDate: string,
      reason: string,
      userId: string,
      increasePriority = false
    ): Promise<{ success: boolean; error?: string; data?: any }> {
      try {
        // Intentar usar la función RPC si existe
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "reschedule_order",
          {
            p_order_id: orderId,
            p_new_delivery_date: newDeliveryDate,
            p_reason: reason,
            p_changed_by: userId,
            p_increase_priority: increasePriority,
          }
        )

        if (!rpcError && rpcResult) {
          return { success: rpcResult.success, data: rpcResult, error: rpcResult.error }
        }

        // Fallback: hacer manualmente si la función RPC no existe
        console.log("RPC not available, using manual approach")

        // Obtener datos actuales del pedido
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("delivery_date, priority, order_number, reschedule_count")
          .eq("id", orderId)
          .single()

        if (orderError || !order) {
          return { success: false, error: "Pedido no encontrado" }
        }

        const oldDate = order.delivery_date
        const oldPriority = order.priority
        let newPriority = oldPriority

        // Calcular nueva prioridad si se solicita
        if (increasePriority) {
          const priorityLevels = ["baja", "normal", "media", "alta", "urgente"]
          const currentIndex = priorityLevels.indexOf(oldPriority)
          if (currentIndex < priorityLevels.length - 1) {
            newPriority = priorityLevels[currentIndex + 1]
          }
        }

        // Actualizar pedido
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            delivery_date: newDeliveryDate,
            priority: newPriority,
            reschedule_count: (order.reschedule_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)

        if (updateError) {
          return { success: false, error: updateError.message }
        }

        // Registrar en historial
        await supabase.from("order_history").insert({
          order_id: orderId,
          change_type: "DELIVERY_DATE_CHANGE",
          previous_delivery_date: oldDate,
          new_delivery_date: newDeliveryDate,
          previous_status: "PENDIENTE_ENTREGA",
          new_status: "PENDIENTE_ENTREGA",
          changed_by: userId,
          change_reason: reason,
        })

        // Si cambió la prioridad, registrar también
        if (newPriority !== oldPriority) {
          await supabase.from("order_history").insert({
            order_id: orderId,
            change_type: "PRIORITY_CHANGE",
            previous_status: "PENDIENTE_ENTREGA",
            new_status: "PENDIENTE_ENTREGA",
            changed_by: userId,
            change_reason: "Aumento automático de prioridad por reprogramación",
          })
        }

        return {
          success: true,
          data: {
            order_number: order.order_number,
            old_date: oldDate,
            new_date: newDeliveryDate,
            old_priority: oldPriority,
            new_priority: newPriority,
          },
        }
      } catch (err) {
        console.error("Error rescheduling order:", err)
        return { success: false, error: "Error interno al reprogramar pedido" }
      }
    },

    /**
     * Reprograma múltiples pedidos a la misma fecha
     */
    async rescheduleMultipleOrders(
      orderIds: string[],
      newDeliveryDate: string,
      reason: string,
      userId: string,
      increasePriority = false
    ): Promise<{ success: boolean; error?: string; results?: any[] }> {
      const results = []
      let hasErrors = false

      for (const orderId of orderIds) {
        const result = await this.rescheduleOrder(
          orderId,
          newDeliveryDate,
          reason,
          userId,
          increasePriority
        )
        results.push({ orderId, ...result })
        if (!result.success) hasErrors = true
      }

      return {
        success: !hasErrors,
        error: hasErrors ? "Algunos pedidos no pudieron ser reprogramados" : undefined,
        results,
      }
    },

    /**
     * Obtiene el historial de cambios de fecha de un pedido
     */
    async getOrderRescheduleHistory(orderId: string): Promise<OrderDateChange[]> {
      const { data, error } = await supabase
        .from("order_history")
        .select(`
          *,
          profiles:changed_by (
            full_name
          )
        `)
        .eq("order_id", orderId)
        .in("change_type", ["DELIVERY_DATE_CHANGE", "PRIORITY_CHANGE"])
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching order history:", error)
        return []
      }

      return (data || []).map((item) => ({
        ...item,
        changed_by_name: item.profiles?.full_name || "Usuario desconocido",
      }))
    },
  }
}



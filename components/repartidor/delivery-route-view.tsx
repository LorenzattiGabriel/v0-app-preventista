"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, MapPin, Package, CheckCircle, Play, Flag, Calendar, Truck, Clock } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeliveryRouteViewProps {
  route: any
  userId: string
  today: string
}

export function DeliveryRouteView({ route, userId, today }: DeliveryRouteViewProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)
  
  // 🆕 MEDIUM-3: Route summary state
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [routeSummary, setRouteSummary] = useState<any>(null)

  // Delivery form state
  const [wasCollected, setWasCollected] = useState(false)
  const [collectedAmount, setCollectedAmount] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  
  // 🆕 New states for delivery evidence and non-delivery
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [receivedByName, setReceivedByName] = useState("")
  const [cannotDeliver, setCannotDeliver] = useState(false)
  const [noDeliveryReason, setNoDeliveryReason] = useState("")
  const [noDeliveryNotes, setNoDeliveryNotes] = useState("")

  const handleStartRoute = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Update route status
      const { error: routeError } = await supabase
        .from("routes")
        .update({
          status: "EN_CURSO",
          actual_start_time: new Date().toISOString(),
        })
        .eq("id", route.id)

      if (routeError) throw routeError

      // Update all orders in route to EN_REPARTICION
      const orderIds = route.route_orders.map((ro: any) => ro.orders.id)

      const { error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "EN_REPARTICION",
          delivery_started_at: new Date().toISOString(),
          delivered_by: userId,
        })
        .in("id", orderIds)

      if (ordersError) throw ordersError

      // Create history entries
      for (const orderId of orderIds) {
        await supabase.from("order_history").insert({
          order_id: orderId,
          previous_status: "PENDIENTE_ENTREGA",
          new_status: "EN_REPARTICION",
          changed_by: userId,
          change_reason: "Inicio de ruta de entrega",
        })
      }

      // 🆕 Usar URL de Google Maps optimizada del microservicio
      let googleMapsUrl = null
      
      // Intentar obtener la URL del optimized_route (generada por microservicio)
      if (route.optimized_route?.googleMapsUrl) {
        googleMapsUrl = route.optimized_route.googleMapsUrl
        console.log('✅ Usando ruta optimizada del microservicio')
      } else {
        // Fallback: Construir URL manualmente con coordenadas de los clientes
        const coordinates = route.route_orders
          .sort((a: any, b: any) => a.delivery_order - b.delivery_order)
          .filter((ro: any) => ro.orders?.customers?.latitude && ro.orders?.customers?.longitude)
          .map((ro: any) => `${ro.orders.customers.latitude},${ro.orders.customers.longitude}`)

        if (coordinates.length > 0) {
          // Punto de partida (primer pedido o depósito default)
          const startPoint = coordinates.length > 0 ? coordinates[0] : '-31.4201,-64.1888'
          
          // Construir URL con todos los puntos
          if (coordinates.length > 1) {
            googleMapsUrl = `https://www.google.com/maps/dir/${coordinates.join('/')}/`
          } else {
            googleMapsUrl = `https://www.google.com/maps/dir/-31.4201,-64.1888/${startPoint}/`
          }
          console.log('⚠️ Usando ruta manual (sin optimización)')
        } else {
          console.warn('⚠️ No se encontraron coordenadas para la ruta')
        }
      }

      if (googleMapsUrl) {
        window.open(googleMapsUrl, '_blank')
      } else {
        setError('No se pudo abrir Google Maps. Verifica que los clientes tengan coordenadas.')
      }

      router.refresh()
    } catch (err) {
      console.error("[v0] Error starting route:", err)
      setError(err instanceof Error ? err.message : "Error al iniciar la ruta")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDeliveryDialog = (order: any) => {
    setSelectedOrder(order)
    setWasCollected(false)
    setCollectedAmount("")
    setDeliveryNotes("")
    // 🆕 Reset delivery evidence fields
    setDeliveryPhoto(null)
    setPhotoPreview(null)
    setReceivedByName("")
    setCannotDeliver(false)
    setNoDeliveryReason("")
    setNoDeliveryNotes("")
    setShowDeliveryDialog(true)
  }

  // 🆕 Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Por favor selecciona una imagen válida")
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen no puede ser mayor a 5MB")
        return
      }
      setDeliveryPhoto(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return

    // 🆕 MEDIUM-2: Handle non-delivery case
    if (cannotDeliver) {
      if (!noDeliveryReason) {
        setError("Debe seleccionar un motivo de no-entrega")
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // Update order with non-delivery info (keep EN_REPARTICION status)
        const { error: orderError } = await supabase
          .from("orders")
          .update({
            no_delivery_reason: noDeliveryReason,
            no_delivery_notes: noDeliveryNotes || null,
          })
          .eq("id", selectedOrder.id)

        if (orderError) throw orderError

        // Create history entry
        await supabase.from("order_history").insert({
          order_id: selectedOrder.id,
          previous_status: "EN_REPARTICION",
          new_status: "EN_REPARTICION", // Status doesn't change
          changed_by: userId,
          change_reason: `No se pudo entregar: ${noDeliveryReason}`,
        })

        setShowDeliveryDialog(false)
        setSelectedOrder(null)
        router.refresh()
      } catch (err) {
        console.error("[v0] Error recording non-delivery:", err)
        setError(err instanceof Error ? err.message : "Error al registrar la no-entrega")
      } finally {
        setIsLoading(false)
      }
      return
    }

    // 🆕 Validate delivery evidence (photo + name)
    if (!deliveryPhoto) {
      setError("Debe tomar una foto de la entrega")
      return
    }
    if (!receivedByName.trim()) {
      setError("Debe ingresar el nombre de quien recibió el pedido")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // 1. Upload photo to Supabase Storage
      const fileExt = deliveryPhoto.name.split('.').pop()
      const fileName = `${selectedOrder.id}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('delivery')
        .upload(filePath, deliveryPhoto, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error("Error uploading photo:", uploadError)
        throw new Error("Error al subir la foto de entrega")
      }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('delivery')
        .getPublicUrl(filePath)

      // 3. Update order with delivery evidence
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "ENTREGADO",
          delivered_at: new Date().toISOString(),
          delivery_notes: deliveryNotes || null,
          delivery_photo_url: publicUrl,
          received_by_name: receivedByName.trim(),
        })
        .eq("id", selectedOrder.id)

      if (orderError) throw orderError

      // Update route_orders
      const { error: routeOrderError } = await supabase
        .from("route_orders")
        .update({
          actual_arrival_time: new Date().toISOString(),
          was_collected: wasCollected,
          collected_amount: wasCollected ? Number.parseFloat(collectedAmount) || 0 : null,
        })
        .eq("route_id", route.id)
        .eq("order_id", selectedOrder.id)

      if (routeOrderError) throw routeOrderError

      // Create history entry
      await supabase.from("order_history").insert({
        order_id: selectedOrder.id,
        previous_status: "EN_REPARTICION",
        new_status: "ENTREGADO",
        changed_by: userId,
        change_reason: "Entrega confirmada",
      })

      setShowDeliveryDialog(false)
      setSelectedOrder(null)
      router.refresh()
    } catch (err) {
      console.error("[v0] Error confirming delivery:", err)
      setError(err instanceof Error ? err.message : "Error al confirmar la entrega")
    } finally {
      setIsLoading(false)
    }
  }

  // 🆕 MEDIUM-3: Show route summary before completing
  const handleShowRouteSummary = () => {
    const supabase = createClient()
    
    // Calculate summary statistics
    const orders = route.route_orders.map((ro: any) => ro.orders)
    const delivered = orders.filter((o: any) => o.status === "ENTREGADO")
    const notDelivered = orders.filter((o: any) => o.status !== "ENTREGADO" && o.no_delivery_reason)
    
    const totalExpected = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
    
    // Get collected amounts from route_orders
    const totalCollected = route.route_orders
      .filter((ro: any) => ro.was_collected)
      .reduce((sum: number, ro: any) => sum + (ro.collected_amount || 0), 0)
    
    const summary = {
      totalOrders: orders.length,
      deliveredCount: delivered.length,
      notDeliveredCount: notDelivered.length,
      totalExpected,
      totalCollected,
      difference: totalExpected - totalCollected,
      notDeliveredOrders: notDelivered.map((o: any) => ({
        orderNumber: o.order_number,
        customer: o.customers?.commercial_name || o.customers?.name,
        reason: o.no_delivery_reason,
        notes: o.no_delivery_notes,
      })),
    }
    
    setRouteSummary(summary)
    setShowSummaryDialog(true)
  }

  const handleCompleteRoute = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current orders in route
      const { data: currentRouteOrders, error: fetchError } = await supabase
        .from("route_orders")
        .select("order_id, orders(id, status, no_delivery_reason)")
        .eq("route_id", route.id)

      if (fetchError) throw fetchError

      // Validate all orders are in final state (ENTREGADO or have no_delivery_reason)
      const pendingOrders = currentRouteOrders?.filter((ro: any) => {
        const order = ro.orders
        return order.status !== "ENTREGADO" && !order.no_delivery_reason
      })

      if (pendingOrders && pendingOrders.length > 0) {
        setError(
          `No se puede finalizar la ruta. Hay ${pendingOrders.length} pedido(s) sin gestionar. Debes entregarlos o indicar por qué no se pudieron entregar.`
        )
        setIsLoading(false)
        return
      }

      // Get orders that were not delivered (have no_delivery_reason)
      const notDeliveredOrders = currentRouteOrders?.filter((ro: any) => {
        const order = ro.orders
        return order.no_delivery_reason && order.status !== "ENTREGADO"
      })

      // Return not delivered orders to PENDIENTE_ENTREGA
      if (notDeliveredOrders && notDeliveredOrders.length > 0) {
        const notDeliveredOrderIds = notDeliveredOrders.map((ro: any) => ro.orders.id)

        const { error: updateOrdersError } = await supabase
          .from("orders")
          .update({
            status: "PENDIENTE_ENTREGA",
            delivered_by: null,
            delivery_started_at: null,
          })
          .in("id", notDeliveredOrderIds)

        if (updateOrdersError) throw updateOrdersError

        // Create history entries for orders returning to PENDIENTE_ENTREGA
        for (const orderId of notDeliveredOrderIds) {
          await supabase.from("order_history").insert({
            order_id: orderId,
            previous_status: "EN_REPARTICION",
            new_status: "PENDIENTE_ENTREGA",
            changed_by: userId,
            change_reason: "Pedido no entregado - devuelto para reasignación",
          })
        }
      }

      // Complete the route
      const { error: routeError } = await supabase
        .from("routes")
        .update({
          status: "COMPLETADO",
          actual_end_time: new Date().toISOString(),
        })
        .eq("id", route.id)

      if (routeError) throw routeError

      setShowSummaryDialog(false)
      router.push("/repartidor/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error completing route:", err)
      setError(err instanceof Error ? err.message : "Error al completar la ruta")
    } finally {
      setIsLoading(false)
    }
  }

  const sortedOrders = route.route_orders
    .map((ro: any) => ({
      ...ro.orders,
      delivery_order: ro.delivery_order,
      route_order_id: ro.id,
    }))
    .sort((a: any, b: any) => a.delivery_order - b.delivery_order)

  const totalOrders = sortedOrders.length
  const deliveredOrders = sortedOrders.filter((order: any) => order.status === "ENTREGADO").length
  const notDeliveredOrders = sortedOrders.filter((order: any) => order.no_delivery_reason && order.status !== "ENTREGADO")
  const pendingOrders = sortedOrders.filter((order: any) => order.status !== "ENTREGADO" && !order.no_delivery_reason)
  
  // All orders are managed if they are either delivered or have a no-delivery reason
  const allOrdersManaged = pendingOrders.length === 0
  
  // Check if route is scheduled for today
  const isScheduledForToday = route.scheduled_date === today

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/repartidor/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>

        <div className="flex gap-2">
          {route.status === "PLANIFICADO" && (
            <Button onClick={handleStartRoute} disabled={isLoading || !isScheduledForToday} size="lg">
              <Play className="mr-2 h-4 w-4" />
              Iniciar Ruta
            </Button>
          )}

          {route.status === "EN_CURSO" && (
            <>
              <Button 
                variant="outline"
                onClick={() => {
                  // Abrir Google Maps con la ruta completa
                  let googleMapsUrl = null
                  
                  // Intentar obtener la URL del optimized_route (generada por microservicio)
                  if (route.optimized_route?.googleMapsUrl) {
                    googleMapsUrl = route.optimized_route.googleMapsUrl
                  } else {
                    // Fallback: Construir URL manualmente con coordenadas de los clientes
                    const coordinates = route.route_orders
                      .sort((a: any, b: any) => a.delivery_order - b.delivery_order)
                      .filter((ro: any) => ro.orders?.customers?.latitude && ro.orders?.customers?.longitude)
                      .map((ro: any) => `${ro.orders.customers.latitude},${ro.orders.customers.longitude}`)

                    if (coordinates.length > 0) {
                      if (coordinates.length > 1) {
                        googleMapsUrl = `https://www.google.com/maps/dir/${coordinates.join('/')}/`
                      } else {
                        googleMapsUrl = `https://www.google.com/maps/dir/-31.4201,-64.1888/${coordinates[0]}/`
                      }
                    }
                  }

                  if (googleMapsUrl) {
                    window.open(googleMapsUrl, '_blank')
                  } else {
                    setError('No se pudo abrir Google Maps. Verifica que los clientes tengan coordenadas.')
                  }
                }}
                size="lg"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Abrir en Google Maps
              </Button>
              <Button 
                onClick={handleShowRouteSummary} 
                disabled={isLoading || !allOrdersManaged} 
                size="lg"
              >
                <Flag className="mr-2 h-4 w-4" />
                Finalizar Ruta
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">{error}</div>
      )}

      {/* Info banner for active route */}
      {route.status === "EN_CURSO" && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg mb-1">Ruta en Curso</p>
              <p className="text-sm text-muted-foreground mb-3">
                Gestiona tus entregas y marca cada pedido como entregado. Usa el botón "Abrir en Google Maps" para navegar entre direcciones.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span><strong>{deliveredOrders}</strong> entregados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span><strong>{pendingOrders.length}</strong> pendientes</span>
                </div>
                {notDeliveredOrders.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-red-600" />
                    <span><strong>{notDeliveredOrders.length}</strong> no entregados</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info message for future routes */}
      {route.status === "PLANIFICADO" && !isScheduledForToday && (
        <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-100">
                Ruta Planificada para el Futuro
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Esta ruta está programada para el{" "}
                <strong>{new Date(route.scheduled_date).toLocaleDateString("es-AR", { dateStyle: "long" })}</strong>.
                Solo podrás iniciarla cuando llegue ese día.
              </p>
            </div>
          </div>
        </div>
      )}

      {route.status === "EN_CURSO" && !allOrdersManaged && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-yellow-900 dark:text-yellow-100">
                Pedidos pendientes de gestionar: {pendingOrders.length}
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Para finalizar la ruta, debes entregar todos los pedidos o indicar el motivo por el cual no pudieron ser entregados.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className={route.status === "EN_CURSO" ? "border-2 border-primary" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{route.route_code}</CardTitle>
              <CardDescription>
                {route.zones?.name} | {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
              </CardDescription>
            </div>
            <Badge variant={route.status === "COMPLETADO" ? "default" : route.status === "EN_CURSO" ? "default" : "secondary"}>
              {route.status === "PLANIFICADO" && "Planificado"}
              {route.status === "EN_CURSO" && "🚚 En Curso"}
              {route.status === "COMPLETADO" && "Completado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Progreso:</span>
              <p className="text-2xl font-bold text-primary">
                {deliveredOrders} / {totalOrders}
              </p>
              <p className="text-xs text-muted-foreground">entregas realizadas</p>
            </div>
            {route.total_distance && (
              <div>
                <span className="font-medium">Distancia:</span>
                <p className="text-muted-foreground">{route.total_distance.toFixed(1)} km</p>
              </div>
            )}
            {route.estimated_duration && (
              <div>
                <span className="font-medium">Duración estimada:</span>
                <p className="text-muted-foreground">
                  {Math.floor(route.estimated_duration / 60)}h {route.estimated_duration % 60}min
                </p>
              </div>
            )}
          </div>

          {route.status === "EN_CURSO" && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progreso de entregas</span>
                <span className="text-muted-foreground">
                  {Math.round((deliveredOrders / totalOrders) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all flex items-center justify-end pr-2"
                  style={{ width: `${(deliveredOrders / totalOrders) * 100}%` }}
                >
                  {deliveredOrders > 0 && (
                    <span className="text-xs font-bold text-primary-foreground">
                      {deliveredOrders}
                    </span>
                  )}
                </div>
              </div>
              {pendingOrders.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  ⏳ Quedan <strong className="text-foreground">{pendingOrders.length}</strong> pedido{pendingOrders.length !== 1 ? 's' : ''} por gestionar
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas</CardTitle>
          <CardDescription>Pedidos en orden de entrega</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedOrders.map((order: any, index: number) => (
              <div
                key={order.id}
                className={`border rounded-lg p-4 ${order.status === "ENTREGADO" ? "bg-muted/50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.order_number}</span>
                        {order.status === "ENTREGADO" && (
                          <Badge variant="default">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Entregado
                          </Badge>
                        )}
                        {order.priority === "urgente" && <Badge variant="destructive">Urgente</Badge>}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{order.customers.commercial_name}</p>
                            <p className="text-muted-foreground">
                              {order.customers.street} {order.customers.street_number}
                              {order.customers.floor_apt && `, ${order.customers.floor_apt}`}
                            </p>
                            <p className="text-muted-foreground">
                              {order.customers.locality}, {order.customers.province}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>
                            {order.order_items.length} productos | Total: ${order.total.toFixed(2)}
                          </span>
                        </div>

                        {order.customers.phone && <p className="text-muted-foreground">Tel: {order.customers.phone}</p>}
                      </div>

                      {order.observations && (
                        <div className="bg-muted p-2 rounded text-sm">
                          <span className="font-medium">Observaciones:</span> {order.observations}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.status !== "ENTREGADO" && route.status === "EN_CURSO" && (
                      <>
                        <Button onClick={() => handleOpenDeliveryDialog(order)} size="sm">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marcar Entregado
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Abrir Google Maps con dirección del cliente
                            const address = `${order.customers.street} ${order.customers.street_number}, ${order.customers.locality}, ${order.customers.province}, Argentina`
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                            window.open(mapsUrl, '_blank')
                          }}
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          Navegar
                        </Button>
                      </>
                    )}
                    {order.status === "ENTREGADO" && (
                      <Badge variant="default" className="justify-center py-2">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Completado
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/repartidor/orders/${order.id}`}>Ver Detalle</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{cannotDeliver ? "Registrar No-Entrega" : "Confirmar Entrega"}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.order_number} - {selectedOrder?.customers?.commercial_name}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* 🆕 MEDIUM-2: Cannot Deliver Toggle */}
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <Checkbox
                id="cannot-deliver"
                checked={cannotDeliver}
                onCheckedChange={(checked) => setCannotDeliver(checked as boolean)}
              />
              <Label htmlFor="cannot-deliver" className="font-medium">
                No se pudo entregar
              </Label>
            </div>

            {cannotDeliver ? (
              // 🆕 MEDIUM-2: Non-delivery form
              <>
                <div className="space-y-2">
                  <Label htmlFor="no-delivery-reason">Motivo de No-Entrega *</Label>
                  <Select value={noDeliveryReason} onValueChange={setNoDeliveryReason}>
                    <SelectTrigger id="no-delivery-reason">
                      <SelectValue placeholder="Seleccionar motivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente_ausente">Cliente Ausente</SelectItem>
                      <SelectItem value="cliente_rechazo">Cliente Rechazó el Pedido</SelectItem>
                      <SelectItem value="direccion_incorrecta">Dirección Incorrecta</SelectItem>
                      <SelectItem value="sin_acceso">Sin Acceso al Domicilio</SelectItem>
                      <SelectItem value="comercio_cerrado">Comercio Cerrado</SelectItem>
                      <SelectItem value="otro">Otro Motivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no-delivery-notes">Detalles Adicionales</Label>
                  <Textarea
                    id="no-delivery-notes"
                    placeholder="Describe la situación con más detalle..."
                    value={noDeliveryNotes}
                    onChange={(e) => setNoDeliveryNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              // Normal delivery form
              <>
                {/* 🆕 Delivery Photo Evidence */}
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
                  <Label htmlFor="delivery-photo" className="font-bold text-blue-900 dark:text-blue-100">
                    📸 Foto de Entrega *
                  </Label>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    Toma una foto del pedido entregado
                  </p>
                  <Input
                    id="delivery-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                  {photoPreview && (
                    <div className="mt-2">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full max-w-xs mx-auto rounded-lg border-2 border-blue-300"
                      />
                    </div>
                  )}
                </div>

                {/* 🆕 Received By Name */}
                <div className="space-y-2">
                  <Label htmlFor="received-by" className="font-medium">
                    Nombre de quien recibe *
                  </Label>
                  <Input
                    id="received-by"
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={receivedByName}
                    onChange={(e) => setReceivedByName(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="collected"
                    checked={wasCollected}
                    onCheckedChange={(checked) => setWasCollected(checked as boolean)}
                  />
                  <Label htmlFor="collected" className="font-normal">
                    Se cobró el pedido
                  </Label>
                </div>

                {wasCollected && (
                  <div className="space-y-2">
                    <Label htmlFor="amount">Importe Cobrado ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder={selectedOrder?.total?.toFixed(2)}
                      value={collectedAmount}
                      onChange={(e) => setCollectedAmount(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Observaciones (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas sobre la entrega..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmDelivery} 
              disabled={isLoading}
              variant={cannotDeliver ? "destructive" : "default"}
            >
              {isLoading ? "Procesando..." : (cannotDeliver ? "Registrar No-Entrega" : "Confirmar Entrega")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🆕 MEDIUM-3: Route Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen de Ruta</DialogTitle>
            <DialogDescription>
              {route.route_code} - Revisa los detalles antes de finalizar
            </DialogDescription>
          </DialogHeader>

          {routeSummary && (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{routeSummary.totalOrders}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {routeSummary.deliveredCount} entregados, {routeSummary.notDeliveredCount} no entregados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      ${routeSummary.totalCollected.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      de ${routeSummary.totalExpected.toFixed(2)} esperado
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Difference Alert */}
              {routeSummary.difference !== 0 && (
                <div 
                  className={`p-4 rounded-lg border-2 ${
                    routeSummary.difference > 0 
                      ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700'
                      : 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700'
                  }`}
                >
                  <p className="font-medium">
                    {routeSummary.difference > 0 
                      ? `⚠️ Falta cobrar: $${routeSummary.difference.toFixed(2)}`
                      : `✅ Cobrado completo (exceso de $${Math.abs(routeSummary.difference).toFixed(2)})`
                    }
                  </p>
                </div>
              )}

              {/* Not Delivered Orders */}
              {routeSummary.notDeliveredCount > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      Pedidos No Entregados ({routeSummary.notDeliveredCount})
                    </h3>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      ℹ️ Estos pedidos volverán a estado <strong>PENDIENTE_ENTREGA</strong> para ser reasignados a otra ruta.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {routeSummary.notDeliveredOrders.map((order: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">{order.customer}</p>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {order.reason?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {order.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            "{order.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {routeSummary.deliveredCount === routeSummary.totalOrders && (
                <div className="bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="font-bold text-green-900 dark:text-green-100">
                    ¡Todos los pedidos fueron entregados!
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)} disabled={isLoading}>
              Revisar Entregas
            </Button>
            <Button onClick={handleCompleteRoute} disabled={isLoading}>
              {isLoading ? "Finalizando..." : "Confirmar y Finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

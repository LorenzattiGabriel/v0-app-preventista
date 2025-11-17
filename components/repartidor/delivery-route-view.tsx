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
import { ArrowLeft, MapPin, Package, CheckCircle, Play, Flag } from "lucide-react"
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
}

export function DeliveryRouteView({ route, userId }: DeliveryRouteViewProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)

  // Delivery form state
  const [wasCollected, setWasCollected] = useState(false)
  const [collectedAmount, setCollectedAmount] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")

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
        console.log('✅ Usando URL de ruta optimizada del microservicio')
      } else if (route.optimized_route?.origin && route.optimized_route?.destinations) {
        // Fallback 1: Construir URL desde el objeto de ruta optimizada
        console.log('🛠️ Construyendo URL desde objeto de ruta optimizada')
        const origin = `${route.optimized_route.origin.lat},${route.optimized_route.origin.lng}`
        
        // Waypoints (puntos intermedios) si existen
        const waypoints = (route.optimized_route.waypoints || [])
          .map((wp: any) => `${wp.lat},${wp.lng}`)
          .join('|')

        // El último destino es el punto final
        const destination = route.optimized_route.destinations.length > 0
          ? `${route.optimized_route.destinations[route.optimized_route.destinations.length - 1].lat},${route.optimized_route.destinations[route.optimized_route.destinations.length - 1].lng}`
          : origin

        googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
      } else {
        // Fallback 2: Construir URL manualmente con coordenadas de los clientes (sin optimizar)
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
          console.log('⚠️ Usando ruta manual (fallback, sin optimización)')
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
    setShowDeliveryDialog(true)
  }

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Update order
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "ENTREGADO",
          delivered_at: new Date().toISOString(),
          delivery_notes: deliveryNotes || null,
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

  const handleCompleteRoute = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: routeError } = await supabase
        .from("routes")
        .update({
          status: "COMPLETADO",
          actual_end_time: new Date().toISOString(),
        })
        .eq("id", route.id)

      if (routeError) throw routeError

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
  const allDelivered = deliveredOrders === totalOrders

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/repartidor/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>

        {route.status === "PLANIFICADO" && (
          <Button onClick={handleStartRoute} disabled={isLoading} size="lg">
            <Play className="mr-2 h-4 w-4" />
            Iniciar Ruta
          </Button>
        )}

        {route.status === "EN_CURSO" && allDelivered && (
          <Button onClick={handleCompleteRoute} disabled={isLoading} size="lg">
            <Flag className="mr-2 h-4 w-4" />
            Finalizar Ruta
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">{error}</div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{route.route_code}</CardTitle>
              <CardDescription>
                {route.zones?.name} | {new Date(route.scheduled_date).toLocaleDateString("es-AR")}
              </CardDescription>
            </div>
            <Badge variant={route.status === "COMPLETADO" ? "default" : "secondary"}>
              {route.status === "PLANIFICADO" && "Planificado"}
              {route.status === "EN_CURSO" && "En Curso"}
              {route.status === "COMPLETADO" && "Completado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Progreso:</span>
              <p className="text-muted-foreground">
                {deliveredOrders} / {totalOrders} entregas
              </p>
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
            <div className="mt-4">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(deliveredOrders / totalOrders) * 100}%` }}
                />
              </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Entrega</DialogTitle>
            <DialogDescription>
              {selectedOrder?.order_number} - {selectedOrder?.customers?.commercial_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDelivery} disabled={isLoading}>
              {isLoading ? "Confirmando..." : "Confirmar Entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

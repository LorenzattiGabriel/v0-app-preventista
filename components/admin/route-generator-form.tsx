"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Zone, Profile } from "@/lib/types/database"
import { ArrowLeft, MapPin, Truck, Package, Loader2, ExternalLink, AlertCircle } from "lucide-react"
import Link from "next/link"
import { generateRouteFromOrders, reorderOrdersByOptimization } from "@/lib/services/rutasInteligentesService"
import { RutasInteligentesError } from "@/lib/services/rutasInteligentesClient"

interface RouteGeneratorFormProps {
  zones: Zone[]
  drivers: Profile[]
  pendingOrders: any[]
  userId: string
}

interface GeneratedRoute {
  zone: string
  zoneId: string
  orders: any[]
  suggestedDriver?: string
  totalDistance: number // km REALES del microservicio
  estimatedDuration: number // minutos REALES del microservicio
  googleMapsUrl?: string // URL de Google Maps optimizada
  optimizedRouteData?: any // Datos completos de la ruta
}

export function RouteGeneratorForm({ zones, drivers, pendingOrders, userId }: RouteGeneratorFormProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const [deliveryDate, setDeliveryDate] = useState(tomorrow)
  const [selectedZones, setSelectedZones] = useState<string[]>(zones.map((z) => z.id))
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("20:00")
  const [avgDeliveryTime, setAvgDeliveryTime] = useState(10)
  const [maxOrdersPerRoute, setMaxOrdersPerRoute] = useState(40)

  // Generated routes
  const [generatedRoutes, setGeneratedRoutes] = useState<GeneratedRoute[]>([])
  const [routeDrivers, setRouteDrivers] = useState<{ [key: number]: string }>({})

  const handleZoneToggle = (zoneId: string) => {
    setSelectedZones((prev) => (prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]))
  }

  const handleGenerateRoutes = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      console.log('🚀 Iniciando generación de rutas inteligentes...')

      // Filter orders by selected zones and date
      const filteredOrders = pendingOrders.filter(
        (order) =>
          order.delivery_date === deliveryDate &&
          (selectedZones.length === 0 || selectedZones.includes(order.customers.zone_id)),
      )

      if (filteredOrders.length === 0) {
        setError("No hay pedidos pendientes para la fecha y zonas seleccionadas")
        setIsGenerating(false)
        return
      }

      console.log(`📦 ${filteredOrders.length} pedidos filtrados`)

      // 🆕 FILTRAR PEDIDOS CON COORDENADAS
      const ordersWithCoordinates = filteredOrders.filter(
        order => order.customers.latitude && order.customers.longitude
      )

      const ordersWithoutCoordinates = filteredOrders.filter(
        order => !order.customers.latitude || !order.customers.longitude
      )

      console.log(`✅ ${ordersWithCoordinates.length} con coordenadas`)
      console.log(`⚠️ ${ordersWithoutCoordinates.length} sin coordenadas`)

      if (ordersWithCoordinates.length === 0) {
        setError(
          "Ningún pedido tiene coordenadas guardadas. " +
          "Registra las ubicaciones de los clientes en la sección de Preventistas primero."
        )
        setIsGenerating(false)
        return
      }

      // Group orders by zone
      const ordersByZone: { [key: string]: any[] } = {}

      ordersWithCoordinates.forEach((order) => {
        const zoneId = order.customers.zone_id || "sin_zona"
        if (!ordersByZone[zoneId]) {
          ordersByZone[zoneId] = []
        }
        ordersByZone[zoneId].push(order)
      })

      // Generate routes using microservice
      const routes: GeneratedRoute[] = []

      for (const [zoneId, orders] of Object.entries(ordersByZone)) {
        const zone = zones.find((z) => z.id === zoneId)
        const zoneName = zone?.name || "Sin Zona"

        console.log(`🔄 Optimizando ruta para zona: ${zoneName} (${orders.length} pedidos)`)

        try {
          // 🌟 LLAMAR AL MICROSERVICIO DE RUTAS INTELIGENTES
          const optimizedRoute = await generateRouteFromOrders(orders)

          // Reordenar pedidos según optimización
          const reorderedOrders = reorderOrdersByOptimization(
            optimizedRoute.data.optimizedOrder,
            orders
          )

          routes.push({
            zone: zoneName,
            zoneId: zoneId,
            orders: reorderedOrders,
            totalDistance: optimizedRoute.totalDistance, // ✅ REAL del microservicio (ya en km)
            estimatedDuration: optimizedRoute.estimatedDuration, // ✅ REAL del microservicio (ya en minutos)
            googleMapsUrl: optimizedRoute.googleMapsUrl, // ✅ Link directo a Google Maps
            optimizedRouteData: optimizedRoute.data, // ✅ Guardar la data de la ruta
          })

          console.log(`✅ Ruta optimizada para ${zoneName}:`, {
            distance: `${optimizedRoute.totalDistance.toFixed(1)} km`,
            duration: `${Math.floor(optimizedRoute.estimatedDuration / 60)}h ${Math.floor(optimizedRoute.estimatedDuration % 60)}min`,
            orders: reorderedOrders.length,
          })
        } catch (error) {
          console.error(`❌ Error al optimizar ruta para ${zoneName}:`, error)
          
          if (error instanceof RutasInteligentesError) {
            setError(`Error en zona ${zoneName}: ${error.message}`)
          } else {
            setError(`Error al optimizar ruta para ${zoneName}. Intenta nuevamente.`)
          }
          
          setIsGenerating(false)
          return
        }
      }

      if (routes.length === 0) {
        setError("No se pudieron generar rutas. Verifica que los clientes tengan coordenadas válidas.")
        setIsGenerating(false)
        return
      }

      // Auto-assign drivers if available
      const availableDrivers = [...drivers]
      routes.forEach((route, index) => {
        if (availableDrivers.length > 0) {
          const driver = availableDrivers.shift()
          if (driver) {
            setRouteDrivers((prev) => ({ ...prev, [index]: driver.id }))
          }
        }
      })

      console.log(`✅ ${routes.length} rutas generadas exitosamente`)
      
      // Mostrar warning si hay pedidos sin coordenadas
      if (ordersWithoutCoordinates.length > 0) {
        setError(
          `⚠️ Se generaron ${routes.length} rutas con ${ordersWithCoordinates.length} pedidos. ` +
          `${ordersWithoutCoordinates.length} pedidos fueron omitidos por no tener coordenadas.`
        )
      }

      setGeneratedRoutes(routes)
    } catch (err) {
      console.error("[v0] Error generating routes:", err)
      setError(err instanceof Error ? err.message : "Error al generar las rutas")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateRoutes = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()

      // 🆕 CRITICAL-4: Validate no duplicate orders across all generated routes
      const allOrderIds = generatedRoutes.flatMap(route => route.orders.map(o => o.id))
      
      // Check if any of these orders are already in an active route (PLANIFICADO or EN_CURSO)
      const { data: existingRouteOrders, error: checkError } = await supabase
        .from("route_orders")
        .select(`
          order_id,
          routes!inner(id, route_code, status)
        `)
        .in("order_id", allOrderIds)
        .in("routes.status", ["PLANIFICADO", "EN_CURSO"])

      if (checkError) throw checkError

      if (existingRouteOrders && existingRouteOrders.length > 0) {
        // Get order numbers for better error message
        const duplicateOrderIds = existingRouteOrders.map(ro => ro.order_id)
        const allOrders = generatedRoutes.flatMap(route => route.orders)
        const duplicateOrders = allOrders.filter(o => duplicateOrderIds.includes(o.id))
        const orderNumbers = duplicateOrders.map(o => o.order_number).join(", ")
        const routeCodes = Array.from(new Set(existingRouteOrders.map(ro => (ro.routes as any).route_code))).join(", ")
        
        setError(`Los siguientes pedidos ya están en rutas activas (${routeCodes}): ${orderNumbers}. Por favor, elimínalos de las rutas o regenera las rutas sin incluir estos pedidos.`)
        setIsCreating(false)
        return
      }

      for (let i = 0; i < generatedRoutes.length; i++) {
        const route = generatedRoutes[i]
        const driverId = routeDrivers[i]

        if (!driverId) {
          setError(`Debe asignar un repartidor a la ruta ${i + 1}`)
          setIsCreating(false)
          return
        }

        // Generate route code
        const { data: routeCodeData } = await supabase.rpc("generate_route_code", {
          route_date: deliveryDate,
        })
        const routeCode = routeCodeData as string

        // 🆕 Create route with REAL data from microservice
        const { data: createdRoute, error: routeError } = await supabase
          .from("routes")
          .insert({
            route_code: routeCode,
            driver_id: driverId,
            zone_id: route.zoneId !== "sin_zona" ? route.zoneId : null,
            scheduled_date: deliveryDate,
            scheduled_start_time: startTime,
            scheduled_end_time: endTime,
            total_distance: route.totalDistance, // ✅ REAL del microservicio
            estimated_duration: route.estimatedDuration, // ✅ REAL del microservicio
            optimized_route: route.optimizedRouteData || null, // ✅ Guardar toda la data de la ruta
            status: "PLANIFICADO",
            created_by: userId,
          })
          .select()
          .single()

        if (routeError) throw routeError

        // Create route_orders in OPTIMIZED order
        for (let j = 0; j < route.orders.length; j++) {
          const order = route.orders[j]

          const { error: routeOrderError } = await supabase.from("route_orders").insert({
            route_id: createdRoute.id,
            order_id: order.id,
            delivery_order: j + 1, // El orden YA está optimizado por el microservicio
          })

          if (routeOrderError) throw routeOrderError
        }

        console.log(`✅ Ruta ${routeCode} creada exitosamente`)
      }

      router.push("/admin/routes")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error creating routes:", err)
      setError(err instanceof Error ? err.message : "Error al crear las rutas")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Generación</CardTitle>
          <CardDescription>Configure los parámetros para generar las rutas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Fecha de Entrega</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxOrders">Máximo de Pedidos por Ruta</Label>
              <Input
                id="maxOrders"
                type="number"
                min="1"
                max="50"
                value={maxOrdersPerRoute}
                onChange={(e) => setMaxOrdersPerRoute(Number.parseInt(e.target.value) || 40)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora Inicio</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Hora Fin</Label>
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgTime">Tiempo Promedio por Entrega (min)</Label>
              <Input
                id="avgTime"
                type="number"
                min="5"
                max="30"
                value={avgDeliveryTime}
                onChange={(e) => setAvgDeliveryTime(Number.parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Zonas a Incluir</Label>
            <div className="grid grid-cols-3 gap-4">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`zone-${zone.id}`}
                    checked={selectedZones.includes(zone.id)}
                    onCheckedChange={() => handleZoneToggle(zone.id)}
                  />
                  <Label htmlFor={`zone-${zone.id}`} className="font-normal">
                    {zone.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-medium">Pedidos Disponibles</p>
            <p className="text-2xl font-bold">
              {
                pendingOrders.filter(
                  (order) =>
                    order.delivery_date === deliveryDate &&
                    (selectedZones.length === 0 || selectedZones.includes(order.customers.zone_id)),
                ).length
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Pedidos en estado PENDIENTE_ENTREGA para {new Date(deliveryDate).toLocaleDateString("es-AR")}
            </p>
          </div>

          <Button onClick={handleGenerateRoutes} disabled={isGenerating} className="w-full" size="lg">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando Rutas...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Calcular Rutas
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedRoutes.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Rutas Generadas</CardTitle>
              <CardDescription>
                {generatedRoutes.length} rutas generadas con{" "}
                {generatedRoutes.reduce((sum, r) => sum + r.orders.length, 0)} pedidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedRoutes.map((route, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="space-y-4">
                    {/* Header con info y asignación de repartidor */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Ruta {index + 1}</h3>
                          <Badge variant="outline">{route.zone}</Badge>
                          {route.googleMapsUrl && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              ✅ Optimizada
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            <span>{route.orders.length} pedidos</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{route.totalDistance.toFixed(1)} km</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>
                              {Math.floor(route.estimatedDuration / 60)}h {Math.floor(route.estimatedDuration % 60)}min
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-64">
                        <Label htmlFor={`driver-${index}`}>Repartidor</Label>
                        <Select
                          value={routeDrivers[index]}
                          onValueChange={(value) => setRouteDrivers({ ...routeDrivers, [index]: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar repartidor" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 🆕 Botón de Google Maps */}
                    {route.googleMapsUrl && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">
                            Ruta optimizada lista para navegación GPS
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(route.googleMapsUrl, '_blank')
                            }}
                            className="ml-4"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir en Google Maps
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Pedidos en orden de entrega:</p>
                    <div className="space-y-2">
                      {route.orders.slice(0, 5).map((order, orderIndex) => (
                        <div key={order.id} className="flex items-center gap-2 text-sm">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                            {orderIndex + 1}
                          </span>
                          <span className="font-medium">{order.order_number}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-muted-foreground">{order.customers.commercial_name}</span>
                          {order.priority === "urgente" && <Badge variant="destructive">Urgente</Badge>}
                        </div>
                      ))}
                      {route.orders.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-8">
                          ... y {route.orders.length - 5} pedidos más
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setGeneratedRoutes([])}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRoutes} disabled={isCreating} size="lg">
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando Rutas...
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  Crear {generatedRoutes.length} Rutas
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

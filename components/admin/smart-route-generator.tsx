"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Profile } from "@/lib/types/database"
import type { VRPTWResult, RouteSegment } from "@/lib/types/rutas-inteligentes.types"
import { ArrowLeft, MapPin, Truck, Loader2, DollarSign, Route, Clock, TrendingUp, AlertCircle, AlertTriangle, Timer, Car, Package, Calendar, ArrowUpDown, Filter, Check, ChevronsUpDown, X, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { generateRouteFromOrders } from "@/lib/services/rutasInteligentesService"
import { RutasInteligentesError } from "@/lib/services/rutasInteligentesClient"
import { VEHICLE_TYPES, FUEL_TYPES, type VehicleType, type FuelType } from "@/lib/constants/vehicles"
import { OrderCard } from "@/components/admin/order-card"
import { OrdersSummaryStats } from "@/components/admin/orders-summary-stats"
import { 
  getAvailableOrdersForRoute, 
  filterOrdersWithoutCoordinates,
  validateOrderSelection,
  getUniqueLocalities
} from "@/lib/utils/order-filters"
import { revalidateDashboard } from "@/app/actions/revalidate"

// Coordenadas por defecto (solo si no hay depot configurado)
const DEFAULT_COORDS = {
  lat: -31.4201,
  lng: -64.1888,
  address: "Córdoba, Argentina"
}

interface SmartRouteGeneratorProps {
  drivers: Profile[]
  pendingOrders: any[]
  userId: string
  depot: any | null // Depot configurado
}

interface CostCalculation {
  fuelCost: number
  driverCost: number
  totalCost: number
  fuelLiters: number
  fuelPricePerLiter: number
  driverHours: number
  driverHourlyRate: number
  breakdown: {
    distance: number
    duration: number
    vehicleType: string
    fuelType: string
    consumption: number
    localidad: string
  }
}

interface GeneratedRoute {
  zone: string
  zoneId: string
  orders: any[]
  driverId?: string
  totalDistance: number
  estimatedDuration: number
  googleMapsUrl?: string | null
  optimizedRouteData?: any
  costCalculation?: CostCalculation
  vrptw?: VRPTWResult  // 🆕 Datos VRPTW v2.0
  // 🆕 Datos de segmentación (rutas con >25 waypoints)
  isSegmented?: boolean
  totalWaypoints?: number
  segments?: RouteSegment[]
}

export function SmartRouteGenerator({ drivers, pendingOrders, userId, depot }: SmartRouteGeneratorProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("configurar")

  // Usar depot configurado o coordenadas por defecto
  const startCoords = {
    lat: depot?.latitude || DEFAULT_COORDS.lat,
    lng: depot?.longitude || DEFAULT_COORDS.lng,
    address: depot?.name || DEFAULT_COORDS.address
  }

  // Form state
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedLocality, setSelectedLocality] = useState<string>("all") // Default to "all" localities
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [startTime, setStartTime] = useState("08:00")
  const [avgDeliveryTime, setAvgDeliveryTime] = useState(10)
  
  // Locality search state
  const [localitySearchOpen, setLocalitySearchOpen] = useState(false)
  const [localitySearchValue, setLocalitySearchValue] = useState("")
  
  // Lista de localidades únicas de los pedidos
  const availableLocalities = getUniqueLocalities(pendingOrders)
  
  // Filtered localities based on search
  const filteredLocalities = availableLocalities.filter(loc => 
    loc.toLowerCase().includes(localitySearchValue.toLowerCase())
  )
  
  // Cost parameters
  const [vehicleType, setVehicleType] = useState<VehicleType>("commercial")
  const [fuelType, setFuelType] = useState<FuelType>("gasoil")
  const [driverSalary, setDriverSalary] = useState<string>("")
  
  // Selected driver
  const [selectedDriver, setSelectedDriver] = useState<string>("")

  // Generated route
  const [generatedRoute, setGeneratedRoute] = useState<GeneratedRoute | null>(null)

  // Filtered orders by zone and date
  const [availableOrders, setAvailableOrders] = useState<any[]>([])

  // UI Filters & Sorting


  const PRIORITY_WEIGHTS: Record<string, number> = {
    urgente: 5,
    alta: 4,
    media: 3,
    normal: 2,
    baja: 1
  }

  // State for sorting and filtering
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "priority">("priority")
  // Sort order is now fixed: Priority always Highest->Lowest, Date always Oldest->Newest

  // Derived state for displayed orders
  const displayedOrders = availableOrders.filter(order => {
    if (filterPriority === "all") return true
    return order.priority === filterPriority
  }).sort((a, b) => {
    // Helper to get weight
    const getWeight = (p: string) => PRIORITY_WEIGHTS[p] || 0
    // Helper to get time
    const getTime = (d: string) => new Date(d || "").getTime()

    if (sortBy === "priority") {
       // Primary: Priority (ALWAYS Highest First)
       const weightA = getWeight(a.priority)
       const weightB = getWeight(b.priority)
       if (weightA !== weightB) {
         return weightB - weightA // Descending (5 -> 1)
       }
       // Secondary: Date (ALWAYS Oldest First)
       return getTime(a.delivery_date) - getTime(b.delivery_date)
    } else {
       // Primary: Date (ALWAYS Oldest First)
       const dateA = getTime(a.delivery_date)
       const dateB = getTime(b.delivery_date)
       if (dateA !== dateB) {
         return dateA - dateB
       }
       // Secondary: Priority (Highest First)
       return getWeight(b.priority) - getWeight(a.priority)
    }
  })

  // Update available orders when locality or date changes
  // Using clean filtering functions for better maintainability
  // NOTE: We do NOT reset selectedOrderIds when locality changes to allow multi-locality selection
  useEffect(() => {
    const filtered = getAvailableOrdersForRoute(pendingOrders, {
      deliveryDate,
      locality: selectedLocality,
      status: "PENDIENTE_ENTREGA"
    })

    console.log('🔄 Pedidos filtrados:', {
      date: deliveryDate,
      locality: selectedLocality,
      totalPending: pendingOrders.length,
      filtered: filtered.length,
      withAmounts: filtered.filter(o => o.total).length
    })

    setAvailableOrders(filtered)
    // Do NOT reset selectedOrderIds here - we want to keep selections across locality changes
  }, [selectedLocality, deliveryDate, pendingOrders])
  
  // Reset selections only when date changes (different delivery day = fresh start)
  useEffect(() => {
    setSelectedOrderIds([])
  }, [deliveryDate])
  
  // Get all selected orders from pendingOrders (regardless of current locality filter)
  const selectedOrders = pendingOrders.filter(o => selectedOrderIds.includes(o.id))
  
  // Get unique localities from selected orders
  const selectedLocalitiesSet = new Set(selectedOrders.map(o => o.customers?.locality).filter(Boolean))
  const hasMultipleLocalities = selectedLocalitiesSet.size > 1

  const handleOrderToggle = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    )
  }

  const handleSelectAllOrders = () => {
    const currentVisibleIds = availableOrders.map((o) => o.id)
    const allVisibleSelected = currentVisibleIds.every(id => selectedOrderIds.includes(id))
    
    if (allVisibleSelected) {
      // Deselect all visible orders (but keep orders from other localities)
      setSelectedOrderIds(prev => prev.filter(id => !currentVisibleIds.includes(id)))
    } else {
      // Add all visible orders to selection (keeping existing selections)
      setSelectedOrderIds(prev => {
        const newIds = currentVisibleIds.filter(id => !prev.includes(id))
        return [...prev, ...newIds]
      })
    }
  }

  const handleGenerateRoute = async () => {
    // Validate order selection using clean validation function
    const validation = validateOrderSelection(selectedOrderIds)
    if (!validation.isValid) {
      setError(validation.error || "Error de validación")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedRoute(null)

    try {
      console.log('🚀 Generando ruta inteligente...')

      // Get selected orders from ALL pending orders (not just filtered ones)
      const ordersToRoute = pendingOrders.filter((o) => selectedOrderIds.includes(o.id))

      console.log(`📦 ${ordersToRoute.length} pedidos seleccionados`)

      // Prepare cost parameters
      const costParams = {
        vehicleType,
        fuelType,
        ...(driverSalary && driverSalary.trim() !== "" && {
          driverSalary: parseFloat(driverSalary)
        })
      }

      // 🆕 Prepare VRPTW parameters
      const vrptwParams = {
        routeStartTime: startTime,
        serviceTimeMinutes: avgDeliveryTime
      }

      // Call microservice con coordenadas del depot configurado
      const routeResponse = await generateRouteFromOrders(
        ordersToRoute,
        startCoords.lat,
        startCoords.lng,
        costParams,
        undefined, // endLat (usa startLat)
        undefined, // endLng (usa startLng)
        vrptwParams // 🆕 Parámetros VRPTW
      )

      console.log('✅ Ruta generada:', routeResponse)
      console.log('📊 Datos de la ruta:', {
        hasGoogleMapsUrl: !!routeResponse.googleMapsUrl,
        googleMapsUrl: routeResponse.googleMapsUrl,
        hasCostCalculation: !!routeResponse.costCalculation,
        costCalculation: routeResponse.costCalculation,
        totalDistance: routeResponse.totalDistance,
        estimatedDuration: routeResponse.estimatedDuration
      })

      // Get locality name based on selected orders
      const orderLocalities = new Set(ordersToRoute.map(o => o.customers?.locality).filter(Boolean))
      const localityName = orderLocalities.size > 1 
        ? `${orderLocalities.size} Localidades` 
        : Array.from(orderLocalities)[0] || "Sin Localidad"

      const newRoute: GeneratedRoute = {
        zone: localityName, // Mantener "zone" por compatibilidad
        zoneId: "", // Ya no usamos zoneId
        orders: ordersToRoute,
        totalDistance: routeResponse.totalDistance,
        estimatedDuration: routeResponse.estimatedDuration,
        googleMapsUrl: routeResponse.googleMapsUrl,
        optimizedRouteData: routeResponse.data,
        costCalculation: routeResponse.costCalculation,
        vrptw: routeResponse.vrptw, // 🆕 Datos VRPTW v2.0
        // 🆕 Datos de segmentación
        isSegmented: routeResponse.isSegmented,
        totalWaypoints: routeResponse.totalWaypoints,
        segments: routeResponse.segments,
      }
      
      console.log('🎯 Estado de la ruta generada:', {
        hasRoute: true,
        hasGoogleMapsUrl: !!newRoute.googleMapsUrl,
        hasCostCalculation: !!newRoute.costCalculation,
        route: newRoute
      })
      
      setGeneratedRoute(newRoute)
      
      // Auto-cambiar a la pestaña de resultado
      setTimeout(() => {
        setActiveTab("resultado")
      }, 100)

    } catch (err) {
      console.error('❌ Error al generar ruta:', err)
      if (err instanceof RutasInteligentesError) {
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : "Error al generar la ruta")
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateRoute = async () => {
    if (!generatedRoute || !selectedDriver) {
      setError("Debe generar una ruta y asignar un repartidor")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()

      // 🆕 CRITICAL-4: Validate no duplicate orders in active routes
      const orderIds = generatedRoute.orders.map(o => o.id)
      
      // Check if any of these orders are already in an active route (PLANIFICADO or EN_CURSO)
      const { data: existingRouteOrders, error: checkError } = await supabase
        .from("route_orders")
        .select(`
          order_id,
          routes!inner(id, route_code, status)
        `)
        .in("order_id", orderIds)
        .in("routes.status", ["PLANIFICADO", "EN_CURSO"])

      if (checkError) throw checkError

      if (existingRouteOrders && existingRouteOrders.length > 0) {
        // Get order numbers for better error message
        const duplicateOrderIds = existingRouteOrders.map(ro => ro.order_id)
        const duplicateOrders = generatedRoute.orders.filter(o => duplicateOrderIds.includes(o.id))
        const orderNumbers = duplicateOrders.map(o => o.order_number).join(", ")
        const routeCodes = Array.from(new Set(existingRouteOrders.map(ro => (ro.routes as any).route_code))).join(", ")
        
        setError(`Los siguientes pedidos ya están en rutas activas (${routeCodes}): ${orderNumbers}. Por favor, elimínalos de la ruta o quita los pedidos duplicados.`)
        setIsCreating(false)
        return
      }

      // Generate route code
      const { data: routeCodeData } = await supabase.rpc("generate_route_code", {
        route_date: deliveryDate,
      })
      const routeCode = routeCodeData as string

      // Calcular duración total: tiempo de Google Maps + (tiempo promedio por entrega * cantidad de pedidos)
      const totalOrders = generatedRoute.orders.length
      const deliveryTimeMinutes = avgDeliveryTime * totalOrders
      const totalDurationMinutes = generatedRoute.estimatedDuration + deliveryTimeMinutes

      console.log('⏱️  Cálculo de duración:', {
        googleMapsDuration: generatedRoute.estimatedDuration,
        avgDeliveryTime,
        totalOrders,
        deliveryTimeMinutes,
        totalDurationMinutes: totalDurationMinutes
      })

      // Calcular hora fin basada en hora inicio + duración total
      const [hours, minutes] = startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0)
      startDate.setMinutes(startDate.getMinutes() + totalDurationMinutes)
      const endTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`

      // Preparar datos completos de la ruta para guardar
      const routeData = {
        totalOrders,
        orders: generatedRoute.orders.map((order, index) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customers.commercial_name || order.customers.name,
          address: `${order.customers.street} ${order.customers.street_number}`,
          delivery_order: index + 1,
          total_amount: order.total
        })),
        costCalculation: generatedRoute.costCalculation,
        optimizationData: generatedRoute.optimizedRouteData,
        durationBreakdown: {
          googleMapsDuration: generatedRoute.estimatedDuration,
          deliveryTime: deliveryTimeMinutes,
          totalDuration: Math.round(totalDurationMinutes)
        },
        // 🆕 Datos de segmentación (si aplica)
        isSegmented: generatedRoute.isSegmented || false,
        totalWaypoints: generatedRoute.totalWaypoints,
        segments: generatedRoute.segments,
      }

      console.log('💾 Guardando ruta con datos completos:', {
        routeCode,
        totalOrders: routeData.totalOrders,
        googleMapsUrl: generatedRoute.googleMapsUrl,
        hasCostCalculation: !!routeData.costCalculation,
        startTime,
        endTime,
        totalDurationMinutes,
        totalDurationRounded: Math.round(totalDurationMinutes)
      })

      // Create route
      const { data: createdRoute, error: routeError } = await supabase
        .from("routes")
        .insert({
          route_code: routeCode,
          driver_id: selectedDriver,
          zone_id: null, // Ya no usamos zone_id, filtramos por localidad
          scheduled_date: deliveryDate,
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          total_distance: generatedRoute.totalDistance,
          estimated_duration: Math.round(totalDurationMinutes), // ✅ Redondeado a entero
          google_maps_url: generatedRoute.googleMapsUrl, // ✅ Guardado en columna dedicada
          optimized_route: routeData, // Guardamos el resto de la info
          status: "PLANIFICADO",
          created_by: userId,
        })
        .select()
        .single()

      if (routeError) throw routeError

      // Create route_orders in order
      for (let i = 0; i < generatedRoute.orders.length; i++) {
        const order = generatedRoute.orders[i]

        const { error: routeOrderError } = await supabase.from("route_orders").insert({
          route_id: createdRoute.id,
          order_id: order.id,
          delivery_order: i + 1,
        })

        if (routeOrderError) throw routeOrderError
        
        // Update order status to EN_REPARTICION (asignado a ruta)
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({ status: "EN_REPARTICION" })
          .eq("id", order.id)
        
        if (orderUpdateError) throw orderUpdateError
      }

      console.log(`✅ Ruta ${routeCode} creada exitosamente`)
      
      // Revalidar todos los paths relevantes para actualizar el dashboard
      await revalidateDashboard()
      
      router.push("/admin/routes")
      router.refresh()
    } catch (err) {
      console.error("Error al crear ruta:", err)
      setError(err instanceof Error ? err.message : "Error al crear la ruta")
    } finally {
      setIsCreating(false)
    }
  }

  // Get orders without coordinates for the selected date (including backlog)
  const ordersWithoutCoords = filterOrdersWithoutCoordinates(
    pendingOrders.filter(order => order.delivery_date <= deliveryDate)
  )
  
  // Debug: Log cuando cambia la selección
  useEffect(() => {
    console.log('🔄 Estado actual:', {
      availableOrdersCount: availableOrders.length,
      selectedCount: selectedOrderIds.length,
      selectedIds: selectedOrderIds,
      availableOrdersSample: availableOrders.slice(0, 2).map(o => ({
        id: o.id,
        order_number: o.order_number
      }))
    })
  }, [selectedOrderIds, availableOrders])

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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {ordersWithoutCoords.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Hay {ordersWithoutCoords.length} pedidos sin coordenadas guardadas. Solo se mostrarán pedidos con
            ubicación registrada.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="configurar">Configurar Ruta</TabsTrigger>
          <TabsTrigger value="resultado" disabled={!generatedRoute}>
            {generatedRoute ? '✅ Resultado' : 'Resultado'}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configurar */}
        <TabsContent value="configurar" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Selección de Pedidos
              </CardTitle>
              <CardDescription>Selecciona la fecha, zona y pedidos para la ruta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date */}
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

              {/* Time Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Hora Inicio</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar hora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="05:00">05:00</SelectItem>
                      <SelectItem value="05:30">05:30</SelectItem>
                      <SelectItem value="06:00">06:00</SelectItem>
                      <SelectItem value="06:30">06:30</SelectItem>
                      <SelectItem value="07:00">07:00</SelectItem>
                      <SelectItem value="07:30">07:30</SelectItem>
                      <SelectItem value="08:00">08:00</SelectItem>
                      <SelectItem value="08:30">08:30</SelectItem>
                      <SelectItem value="09:00">09:00</SelectItem>
                      <SelectItem value="09:30">09:30</SelectItem>
                      <SelectItem value="10:00">10:00</SelectItem>
                      <SelectItem value="10:30">10:30</SelectItem>
                      <SelectItem value="11:00">11:00</SelectItem>
                      <SelectItem value="11:30">11:30</SelectItem>
                      <SelectItem value="12:00">12:00</SelectItem>
                      <SelectItem value="12:30">12:30</SelectItem>
                      <SelectItem value="13:00">13:00</SelectItem>
                      <SelectItem value="13:30">13:30</SelectItem>
                      <SelectItem value="14:00">14:00</SelectItem>
                    </SelectContent>
                  </Select>
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

              {/* Locality - Searchable Combobox */}
              <div className="space-y-2">
                <Label>Localidad</Label>
                <Popover open={localitySearchOpen} onOpenChange={setLocalitySearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={localitySearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedLocality === "all" ? (
                        <span className="flex items-center gap-2">
                          🌐 Todas las localidades
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          📍 {selectedLocality}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[300px] max-w-[300px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Buscar localidad..." 
                        value={localitySearchValue}
                        onValueChange={setLocalitySearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontró la localidad</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedLocality("all")
                              setLocalitySearchOpen(false)
                              setLocalitySearchValue("")
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedLocality === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            🌐 Todas las localidades
                          </CommandItem>
                          {filteredLocalities.map((locality) => (
                            <CommandItem
                              key={locality}
                              value={locality}
                              onSelect={() => {
                                setSelectedLocality(locality)
                                setLocalitySearchOpen(false)
                                setLocalitySearchValue("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedLocality === locality ? "opacity-100" : "opacity-0"
                                )}
                              />
                              📍 {locality}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {availableLocalities.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay localidades disponibles en los pedidos pendientes
                  </p>
                )}
              </div>

              {/* 🆕 Selected Orders Summary - Always visible when there are selections */}
              {selectedOrderIds.length > 0 && (
                <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-400 dark:border-green-600 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800 dark:text-green-200">
                        Pedidos Seleccionados ({selectedOrderIds.length})
                      </span>
                      {hasMultipleLocalities && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                          {selectedLocalitiesSet.size} localidades
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrderIds([])}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpiar
                    </Button>
                  </div>
                  
                  {/* List of selected orders - scrollable */}
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {selectedOrders.map((order) => (
                      <div 
                        key={order.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="shrink-0 text-xs">
                            #{order.order_number}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {order.customers?.commercial_name || order.customers?.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({order.customers?.locality})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOrderToggle(order.id)}
                          className="h-6 w-6 p-0 shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total amount of selected orders */}
                  <div className="flex items-center justify-between pt-2 border-t border-green-300 dark:border-green-700">
                    <span className="text-sm text-green-700 dark:text-green-300">Total a entregar:</span>
                    <span className="text-lg font-bold text-green-800 dark:text-green-200">
                      ${selectedOrders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}

              {/* Orders Dashboard */}
              {availableOrders.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <Label className="text-base font-semibold">
                        Pedidos Disponibles 
                        {selectedLocality !== "all" && (
                          <span className="text-muted-foreground font-normal"> - {selectedLocality}</span>
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {availableOrders.filter(o => selectedOrderIds.includes(o.id)).length} de {availableOrders.length} seleccionados en esta vista
                        {selectedLocality === "all" && " (todas las localidades)"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllOrders}
                    >
                      {availableOrders.every(o => selectedOrderIds.includes(o.id)) ? "Deseleccionar todos" : "Seleccionar todos"}
                    </Button>
                    </div>

                    {/* Filters & Sort Controls */}
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium mr-1">Filtrar por Prioridad:</span>
                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Prioridad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="baja">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="h-4 w-px bg-border mx-1" />

                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium mr-1">Ordenar:</span>
                        
                        <div className="flex items-center gap-2">
                          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="date">
                                <span className="flex flex-col text-xs text-left">
                                  <span>Principal: Fecha</span>
                                  <span className="text-muted-foreground text-[10px]">Secundario: Prioridad</span>
                                </span>
                              </SelectItem>
                              <SelectItem value="priority">
                                <span className="flex flex-col text-xs text-left">
                                  <span>Principal: Prioridad</span>
                                  <span className="text-muted-foreground text-[10px]">Secundario: Fecha</span>
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>


                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Grid - Using OrderCard component */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-1">
                    {displayedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isSelected={selectedOrderIds.includes(order.id)}
                        onToggle={handleOrderToggle}
                      />
                    ))}
                  </div>

                  {/* Summary Stats - Using OrdersSummaryStats component */}
                  <OrdersSummaryStats 
                    totalOrders={availableOrders.length}
                    selectedCount={selectedOrderIds.length}
                  />
                </div>
              )}

              {deliveryDate && availableOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay pedidos disponibles para {selectedLocality === "all" ? "esta fecha (o anteriores)" : `la localidad "${selectedLocality}" y fecha (o anteriores)`} con coordenadas guardadas.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cálculo de Costos
              </CardTitle>
              <CardDescription>Configura los parámetros para estimar los costos de la ruta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vehicle Type */}
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Tipo de Vehículo</Label>
                <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                  <SelectTrigger id="vehicleType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VEHICLE_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label} ({value.consumption} km/l)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fuel Type */}
              <div className="space-y-2">
                <Label htmlFor="fuelType">Tipo de Combustible</Label>
                <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
                  <SelectTrigger id="fuelType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FUEL_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver Salary (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="driverSalary">
                  Sueldo Mensual del Conductor <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="driverSalary"
                  type="number"
                  placeholder="Dejar vacío para omitir"
                  value={driverSalary}
                  onChange={(e) => setDriverSalary(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Si no se ingresa, solo se calculará el costo de combustible
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerateRoute}
            disabled={isGenerating || selectedOrderIds.length === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando Ruta Inteligente...
              </>
            ) : (
              <>
                <Route className="mr-2 h-4 w-4" />
                Generar Ruta Inteligente
              </>
            )}
          </Button>
        </TabsContent>

        {/* Tab: Resultado */}
        <TabsContent value="resultado" className="space-y-6 mt-6">
          {generatedRoute && (
            <>
              {/* Debug info - Remove in production */}
              {console.log('🎨 Renderizando resultado:', {
                hasGoogleMapsUrl: !!generatedRoute.googleMapsUrl,
                googleMapsUrl: generatedRoute.googleMapsUrl,
                hasCostCalculation: !!generatedRoute.costCalculation,
                costCalculationKeys: generatedRoute.costCalculation ? Object.keys(generatedRoute.costCalculation) : []
              })}
              
              <Card>
                <CardHeader>
                  <CardTitle>Ruta Generada - {generatedRoute.zone}</CardTitle>
                  <CardDescription>{generatedRoute.orders.length} pedidos optimizados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Google Maps Embed + Link */}
                  {generatedRoute.isSegmented && generatedRoute.segments && generatedRoute.segments.length > 0 ? (
                    /* 🆕 Ruta Segmentada: Múltiples tramos */
                    <div className="space-y-4">
                      {/* Banner informativo de segmentación */}
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-2 border-amber-400 dark:border-amber-600 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white shrink-0">
                            🔀
                          </div>
                          <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-100">
                              Ruta Dividida en {generatedRoute.segments.length} Tramos
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              Esta ruta tiene {generatedRoute.totalWaypoints} puntos y supera el límite de Google Maps (25 waypoints).
                              Se ha dividido automáticamente en tramos para facilitar la navegación.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tramos de la ruta */}
                      <div className="grid gap-3">
                        {generatedRoute.segments.map((segment, index) => (
                          <div 
                            key={segment.id}
                            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                              index === 0 
                                ? 'bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-600' 
                                : index === generatedRoute.segments!.length - 1
                                  ? 'bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-600'
                                  : 'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold ${
                                  index === 0 ? 'bg-green-600' : index === generatedRoute.segments!.length - 1 ? 'bg-red-600' : 'bg-blue-600'
                                }`}>
                                  {segment.id}
                                </div>
                                <div>
                                  <p className="font-semibold">{segment.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Puntos {segment.waypointRange.from} → {segment.waypointRange.to} 
                                    <span className="ml-2 text-xs">({segment.waypointsCount} entregas)</span>
                                  </p>
                                </div>
                              </div>
                              <a
                                href={segment.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                                  index === 0 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : index === generatedRoute.segments!.length - 1
                                      ? 'bg-red-600 hover:bg-red-700'
                                      : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                🗺️ Navegar {segment.name}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Instrucciones de uso */}
                      <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                        <p className="font-medium mb-1">📌 Cómo usar los tramos:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Abre el <strong>Tramo 1</strong> en Google Maps y navega hasta el último punto</li>
                          <li>Cuando llegues al punto de conexión, vuelve a la app y abre el <strong>Tramo 2</strong></li>
                          <li>Repite hasta completar todos los tramos</li>
                        </ol>
                      </div>
                    </div>
                  ) : generatedRoute.googleMapsUrl ? (
                    /* Ruta simple: un solo link */
                    <div className="space-y-3">
                      {/* Mapa embebido */}
                      <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-blue-300 dark:border-blue-700">
                        <iframe
                          src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDRsczXb0roqcWOV3EXW9DCMVph0FKzpwY'}&origin=${startCoords.lat},${startCoords.lng}&destination=${startCoords.lat},${startCoords.lng}&waypoints=${generatedRoute.orders.map(o => `${o.customers.latitude},${o.customers.longitude}`).join('|')}`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                      
                      {/* Botón para abrir en Google Maps */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                        <a
                          href={generatedRoute.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md transition-colors text-sm font-medium"
                        >
                          🗺️ Abrir en Google Maps
                        </a>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ⚠️ No se generó el link de Google Maps
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 🆕 VRPTW v2.0 Metrics - Métricas detalladas */}
                  {generatedRoute.vrptw ? (
                    <div className="space-y-4">
                      {/* Feasibility Alert */}
                      {!generatedRoute.vrptw.feasible && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            ⚠️ La ruta no es 100% factible. Algunas entregas no podrán realizarse dentro de su ventana horaria.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* VRPTW Warnings */}
                      {generatedRoute.vrptw.warnings?.length > 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <ul className="list-disc pl-4 space-y-1">
                              {generatedRoute.vrptw.warnings.map((w, i) => (
                                <li key={i} className="text-sm">{w}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Main Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Route className="h-4 w-4 text-blue-600" />
                            Distancia
                          </div>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {generatedRoute.vrptw.totalDistance.toFixed(1)} km
                          </p>
                        </div>
                        <div className="space-y-1 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-green-600" />
                            Duración Total
                          </div>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {Math.round(generatedRoute.vrptw.totalDuration)} min
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.floor(generatedRoute.vrptw.totalDuration / 60)}h {Math.round(generatedRoute.vrptw.totalDuration % 60)}m
                          </p>
                        </div>
                        <div className="space-y-1 p-4 border rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Car className="h-4 w-4" />
                            Conduciendo
                          </div>
                          <p className="text-xl font-bold">
                            {generatedRoute.vrptw.totalDrivingTime} min
                          </p>
                        </div>
                        <div className="space-y-1 p-4 border rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="h-4 w-4" />
                            En Entregas
                          </div>
                          <p className="text-xl font-bold">
                            {generatedRoute.vrptw.totalServiceTime} min
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {avgDeliveryTime} min × {generatedRoute.orders.length} pedidos
                          </p>
                        </div>
                      </div>

                      {/* Wait Time Highlight */}
                      {generatedRoute.vrptw.totalWaitTime > 0 && (
                        <div className="p-4 border-2 border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-950">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Timer className="h-5 w-5 text-orange-600" />
                              <span className="font-medium text-orange-800 dark:text-orange-200">
                                Tiempo de Espera Total
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                {generatedRoute.vrptw.totalWaitTime} min
                              </span>
                              <p className="text-xs text-orange-600">
                                {Math.floor(generatedRoute.vrptw.totalWaitTime / 60)}h {generatedRoute.vrptw.totalWaitTime % 60}m esperando en ubicaciones
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Schedule Summary */}
                      <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium">📅 Horario de la Ruta:</span>
                        <span className="text-sm">
                          <strong>{generatedRoute.vrptw.routeStartTime}</strong>
                          {' → '}
                          <strong>
                            {generatedRoute.vrptw.arrivalTimes?.length > 0 
                              ? generatedRoute.vrptw.arrivalTimes[generatedRoute.vrptw.arrivalTimes.length - 1]?.estimatedArrival
                              : '--:--'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Fallback: Old metrics display */
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Route className="h-4 w-4" />
                        Distancia
                      </div>
                      <p className="text-2xl font-bold">
                        {generatedRoute.totalDistance.toFixed(2)} km
                      </p>
                    </div>
                    <div className="space-y-1 p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Duración Total
                      </div>
                      <p className="text-2xl font-bold">
                        {Math.round(generatedRoute.estimatedDuration + (avgDeliveryTime * generatedRoute.orders.length))} min
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Google Maps: {Math.round(generatedRoute.estimatedDuration)} min + 
                        Entregas: {avgDeliveryTime * generatedRoute.orders.length} min
                      </p>
                    </div>
                  </div>
                  )}

                  {/* Cost Calculation */}
                  {generatedRoute.costCalculation ? (
                    <div className="space-y-3 p-4 border-2 border-purple-500/30 rounded-lg bg-purple-500/5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        💰 Estimación de Costos
                      </div>
                      {/* Total Cost */}
                      <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                        <p className="text-sm text-muted-foreground">Costo Total Estimado</p>
                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          ${generatedRoute.costCalculation.totalCost.toLocaleString('es-AR')}
                        </p>
                      </div>
                      {/* Breakdown */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-background rounded border">
                          <p className="text-xs text-muted-foreground">Combustible</p>
                          <p className="text-lg font-semibold">
                            ${generatedRoute.costCalculation.fuelCost.toLocaleString('es-AR')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {generatedRoute.costCalculation.fuelLiters.toFixed(1)}L @ $
                            {generatedRoute.costCalculation.fuelPricePerLiter.toFixed(2)}/L
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded border">
                          <p className="text-xs text-muted-foreground">Conductor</p>
                          {generatedRoute.costCalculation.driverCost > 0 ? (
                            <>
                              <p className="text-lg font-semibold">
                                ${generatedRoute.costCalculation.driverCost.toLocaleString('es-AR')}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {generatedRoute.costCalculation.driverHours.toFixed(1)}hs @ $
                                {generatedRoute.costCalculation.driverHourlyRate.toFixed(2)}/h
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mt-2">
                              No incluido
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ℹ️ No se calcularon los costos. Asegúrate de configurar el tipo de vehículo y combustible.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Optimized Order */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      Orden Optimizado de Entregas
                      </div>
                      {/* 🆕 Summary of time restrictions */}
                      {generatedRoute.orders.some(o => o.has_time_restriction) && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          {generatedRoute.orders.filter(o => o.has_time_restriction).length} con restricción horaria
                        </Badge>
                      )}
                    </div>
                    <ol className="space-y-2 border rounded-lg p-4">
                      {/* Depot Start */}
                      <li className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded">
                        <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                          ▶
                        </span>
                        <div className="flex-1">
                          <span className="text-sm font-medium">Partida: {startCoords.address}</span>
                        </div>
                        {generatedRoute.vrptw?.arrivalTimes?.[0] && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            🕐 {generatedRoute.vrptw.arrivalTimes[0].estimatedDeparture}
                          </Badge>
                        )}
                      </li>
                      
                      {/* Orders - match with VRPTW arrival times */}
                      {generatedRoute.orders.map((order, index) => {
                        // Find arrival time for this order from VRPTW data
                        const arrivalInfo = generatedRoute.vrptw?.arrivalTimes?.find(
                          at => at.locationId === order.id
                        )
                        
                        return (
                          <li 
                            key={order.id} 
                            className={`flex items-start gap-3 p-3 hover:bg-muted rounded border-l-4 ${
                              order.has_time_restriction 
                                ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/30' 
                                : 'border-blue-500'
                            }`}
                          >
                            <span className={`flex items-center justify-center w-10 h-10 text-white rounded-full text-sm font-bold shrink-0 ${
                              order.has_time_restriction ? 'bg-orange-500' : 'bg-blue-600'
                            }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-bold text-primary">
                                {order.customers.commercial_name || order.customers.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                #{order.order_number}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {order.customers.street} {order.customers.street_number}
                              {order.customers.floor_apt && `, ${order.customers.floor_apt}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.customers.locality}
                            </p>
                              
                              {/* 🆕 VRPTW Arrival Time Display */}
                              {arrivalInfo && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      arrivalInfo.withinWindow 
                                        ? 'bg-green-50 text-green-700 border-green-300' 
                                        : 'bg-red-50 text-red-700 border-red-300'
                                    }`}
                                  >
                                    🕐 Llega: {arrivalInfo.estimatedArrival} → Sale: {arrivalInfo.estimatedDeparture}
                                  </Badge>
                                  {arrivalInfo.waitTime && arrivalInfo.waitTime > 0 && (
                                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                      ⏳ Espera: {arrivalInfo.waitTime} min
                                    </Badge>
                                  )}
                                  {arrivalInfo.lateBy && arrivalInfo.lateBy > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      ❌ Tarde: +{arrivalInfo.lateBy} min
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {/* Time Window Display */}
                              {order.has_time_restriction && (
                                <div className="mt-2 p-2 rounded bg-orange-100 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-orange-600" />
                                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                                      Franja horaria: {order.delivery_window_start?.slice(0, 5)} - {order.delivery_window_end?.slice(0, 5)}
                                    </span>
                                  </div>
                                  {order.time_restriction_notes && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                      📝 {order.time_restriction_notes}
                                    </p>
                                  )}
                                </div>
                              )}
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="secondary" className="text-sm font-semibold">
                              ${order.total_amount?.toLocaleString('es-AR') || '0'}
                            </Badge>
                          </div>
                        </li>
                        )
                      })}
                      
                      {/* Depot End */}
                      <li className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded">
                        <span className="flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full text-sm font-bold">
                          ■
                        </span>
                        <div className="flex-1">
                          <span className="text-sm font-medium">Llegada: {startCoords.address}</span>
                        </div>
                        {generatedRoute.vrptw?.arrivalTimes && generatedRoute.vrptw.arrivalTimes.length > 0 && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                            🕐 {generatedRoute.vrptw.arrivalTimes[generatedRoute.vrptw.arrivalTimes.length - 1].estimatedArrival}
                          </Badge>
                        )}
                      </li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asignar Repartidor</CardTitle>
                  <CardDescription>Selecciona el repartidor para esta ruta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="driver">Repartidor</Label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger id="driver">
                        <SelectValue placeholder="Selecciona un repartidor" />
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

                  <Button
                    onClick={handleCreateRoute}
                    disabled={isCreating || !selectedDriver}
                    className="w-full"
                    size="lg"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando Ruta...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Crear y Asignar Ruta
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}


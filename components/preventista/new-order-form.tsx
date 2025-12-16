"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Customer, Product, OrderPriority, OrderType, PaymentMethod } from "@/lib/types/database"
import { PAYMENT_METHODS } from "@/lib/types/database"
import { Plus, Trash2, ArrowLeft, Save, MapPin, Loader2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { CustomerSelector } from "./customer-selector"
import { ProductSelector } from "./product-selector"
import { useOrderFormActions } from "./use-order-form-actions"
import { GoBackButton } from "../ui/go-back-button"

// Constante para el radio máximo de validación presencial (en metros)
const MAX_PRESENCIAL_DISTANCE_METERS = 200

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @returns distancia en metros
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  unitOfMeasure?: string // Unidad de medida (kg, unidad, litro, etc.)
}

interface InitialOrderData {
  orderNumber: string
  selectedCustomer: Customer | null
  deliveryDate: string
  priority: OrderPriority
  orderType: OrderType
  requiresInvoice: boolean
  observations: string
  generalDiscount: number
  orderItems: OrderItem[]
}

interface NewOrderFormProps {
  customers: Customer[]
  products: Product[]
  userId: string
  initialOrderData?: InitialOrderData
  orderId?: string // Added for editing existing orders
}

export function NewOrderForm({ customers, products, userId, initialOrderData, orderId }: NewOrderFormProps) {
  const router = useRouter()

  const { saveOrder, isLoading, error, setError, calculateTotals } = useOrderFormActions()

  // Form state
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialOrderData?.selectedCustomer || null)
  const [deliveryDate, setDeliveryDate] = useState(initialOrderData?.deliveryDate || tomorrow)
  const [priority, setPriority] = useState<OrderPriority>(initialOrderData?.priority || "normal")
  const [orderType, setOrderType] = useState<OrderType>(initialOrderData?.orderType || "presencial")
  const [requiresInvoice, setRequiresInvoice] = useState(initialOrderData?.requiresInvoice || false)
  const [observations, setObservations] = useState(initialOrderData?.observations || "")
  const [generalDiscount, setGeneralDiscount] = useState(initialOrderData?.generalDiscount || 0)
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed") // 🆕 Tipo de descuento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo") // 🆕 Payment method
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderData?.orderItems || [])

  // 🆕 Time Windows (VRPTW) - Restricciones horarias
  const [hasTimeRestriction, setHasTimeRestriction] = useState(false)
  const [deliveryWindowStart, setDeliveryWindowStart] = useState("08:00")
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState("18:00")
  const [timeRestrictionNotes, setTimeRestrictionNotes] = useState("")

  // 🆕 Geolocalización para validación de pedidos presenciales
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [distanceToCustomer, setDistanceToCustomer] = useState<number | null>(null)
  const [isWithinRange, setIsWithinRange] = useState<boolean | null>(null)

  // Add product form state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [itemDiscount, setItemDiscount] = useState(0)

  // 🆕 Obtener ubicación cuando el tipo es "presencial" y hay cliente seleccionado
  useEffect(() => {
    if (orderType === "presencial" && selectedCustomer) {
      validatePresencialLocation()
    } else {
      // Limpiar estados de validación si no es presencial
      setDistanceToCustomer(null)
      setIsWithinRange(null)
      setLocationError(null)
    }
  }, [orderType, selectedCustomer])

  // 🆕 Función para validar la ubicación presencial
  const validatePresencialLocation = () => {
    if (!selectedCustomer?.latitude || !selectedCustomer?.longitude) {
      setLocationError("El cliente no tiene coordenadas registradas. No se puede validar la ubicación presencial.")
      setIsWithinRange(false)
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError("Tu navegador no soporta geolocalización")
      setIsGettingLocation(false)
      setIsWithinRange(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude
        const userLng = position.coords.longitude
        setUserLocation({ lat: userLat, lng: userLng })

        // Calcular distancia al cliente
        const distance = calculateHaversineDistance(
          userLat,
          userLng,
          selectedCustomer.latitude!,
          selectedCustomer.longitude!
        )

        setDistanceToCustomer(Math.round(distance))
        setIsWithinRange(distance <= MAX_PRESENCIAL_DISTANCE_METERS)
        setIsGettingLocation(false)

        if (distance > MAX_PRESENCIAL_DISTANCE_METERS) {
          setLocationError(
            `Estás a ${Math.round(distance)}m del cliente. Para un pedido presencial debes estar dentro de ${MAX_PRESENCIAL_DISTANCE_METERS}m.`
          )
        }
      },
      (error) => {
        console.error("Error getting location:", error)
        setIsGettingLocation(false)
        setIsWithinRange(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Permiso de ubicación denegado. Activa la ubicación para pedidos presenciales.")
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError("No se pudo obtener la ubicación. Intenta nuevamente.")
            break
          case error.TIMEOUT:
            setLocationError("Tiempo de espera agotado. Intenta nuevamente.")
            break
          default:
            setLocationError("Error al obtener la ubicación.")
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  // Initialize order items if provided
  useState(() => {
    if (initialOrderData?.orderItems) setOrderItems(initialOrderData.orderItems)
  })

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    // Apply customer's general discount if exists
    if (customer.general_discount > 0) {
      setGeneralDiscount(customer.general_discount)
    }
    // 🆕 Apply customer's time restriction if exists
    setHasTimeRestriction(customer.has_time_restriction || false)
    setDeliveryWindowStart(customer.delivery_window_start || "08:00")
    setDeliveryWindowEnd(customer.delivery_window_end || "18:00")
    setTimeRestrictionNotes(customer.time_restriction_notes || "")
  }

  const handleAddProduct = () => {
    if (!selectedProductId || quantity <= 0) return

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    // 🆕 Validar cantidad según tipo de producto
    const finalQuantity = product.allows_decimal_quantity 
      ? quantity 
      : Math.round(quantity) // Forzar entero si no permite decimales

    if (finalQuantity <= 0) return

    // Determine price based on customer type
    let basePrice = product.base_price
    if (selectedCustomer?.customer_type === "mayorista" && product.wholesale_price) {
      basePrice = product.wholesale_price
    } else if (selectedCustomer?.customer_type === "minorista" && product.retail_price) {
      basePrice = product.retail_price
    }

    const unitPrice = customPrice !== null ? customPrice : basePrice
    const subtotal = finalQuantity * unitPrice - itemDiscount

    const newItem: OrderItem = {
      productId: product.id,
      productName: `${product.name} ${product.brand ? `- ${product.brand}` : ""}`,
      quantity: finalQuantity,
      unitPrice,
      discount: itemDiscount,
      subtotal,
      unitOfMeasure: product.unit_of_measure || "unidad",
    }

    setOrderItems([...orderItems, newItem])

    // Reset form
    setSelectedProductId("")
    setQuantity(1)
    setCustomPrice(null)
    setItemDiscount(0)
  }

  const handleRemoveProduct = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const handleSaveOrder = async (isDraft: boolean) => {
    // 🆕 Validar ubicación para pedidos presenciales (no aplica a borradores)
    if (!isDraft && orderType === "presencial") {
      if (!selectedCustomer?.latitude || !selectedCustomer?.longitude) {
        setError("El cliente no tiene coordenadas. No se puede crear un pedido presencial.")
        return
      }

      if (isWithinRange === false) {
        setError(
          `No estás dentro del rango permitido (${MAX_PRESENCIAL_DISTANCE_METERS}m) del cliente. ` +
          `Distancia actual: ${distanceToCustomer}m. Cambia el tipo de pedido o acércate al cliente.`
        )
        return
      }

      if (isWithinRange === null && !isGettingLocation) {
        // Reintenta obtener ubicación
        validatePresencialLocation()
        setError("Validando ubicación... Por favor espera.")
        return
      }

      if (isGettingLocation) {
        setError("Obteniendo ubicación... Por favor espera.")
        return
      }
    }

    // The saveOrder hook now returns the order ID on success
    const savedOrderId = await saveOrder({
      selectedCustomer,
      deliveryDate,
      priority,
      orderType,
      requiresInvoice,
      observations,
      generalDiscount,
      paymentMethod,
      orderItems,
      userId,
      isDraft,
      orderId,
      // 🆕 Time Windows (VRPTW)
      hasTimeRestriction,
      deliveryWindowStart,
      deliveryWindowEnd,
      timeRestrictionNotes,
    });

    // If the order was saved successfully, redirect to the dashboard
    if (savedOrderId) {
      router.push("/preventista/dashboard");
      router.refresh();
    }
  }

  const { subtotal, total, discountAmount } = calculateTotals(orderItems, generalDiscount, discountType)
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <GoBackButton/>
        <h2 className="text-2xl font-medium">Borrador de Pedido: {initialOrderData?.orderNumber || ""}</h2>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>Seleccione el cliente para este pedido</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerSelector customers={customers} onSelect={handleCustomerSelect} selectedCustomer={selectedCustomer} />

          {selectedCustomer && (
            <div className="mt-4 space-y-4">
              {/* Info del cliente */}
              <div className="p-4 bg-muted rounded-md space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Dirección:</span>
                    <p className="text-muted-foreground">
                      {selectedCustomer.street} {selectedCustomer.street_number}
                      {selectedCustomer.floor_apt && `, ${selectedCustomer.floor_apt}`}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Localidad:</span>
                    <p className="text-muted-foreground">
                      {selectedCustomer.locality}, {selectedCustomer.province}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Teléfono:</span>
                    <p className="text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span>
                    <p className="text-muted-foreground capitalize">{selectedCustomer.customer_type}</p>
                  </div>
                </div>
              </div>

              {/* 🆕 Restricción Horaria (Time Window) */}
              <div className={`p-4 rounded-md border-2 ${hasTimeRestriction ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30' : 'border-muted bg-muted/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 font-semibold">
                    🕐 Franja Horaria de Entrega
                  </Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="hasTimeRestriction" className="text-sm text-muted-foreground">
                      {hasTimeRestriction ? "Con restricción" : "Sin restricción"}
                    </Label>
                    <input
                      type="checkbox"
                      id="hasTimeRestriction"
                      checked={hasTimeRestriction}
                      onChange={(e) => setHasTimeRestriction(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                </div>

                {hasTimeRestriction && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="deliveryWindowStart" className="text-xs">Desde</Label>
                        <Input
                          id="deliveryWindowStart"
                          type="time"
                          value={deliveryWindowStart}
                          onChange={(e) => setDeliveryWindowStart(e.target.value)}
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="deliveryWindowEnd" className="text-xs">Hasta</Label>
                        <Input
                          id="deliveryWindowEnd"
                          type="time"
                          value={deliveryWindowEnd}
                          onChange={(e) => setDeliveryWindowEnd(e.target.value)}
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="timeRestrictionNotes" className="text-xs">Notas (opcional)</Label>
                      <Input
                        id="timeRestrictionNotes"
                        type="text"
                        placeholder="Ej: Solo por la mañana, cerrado al mediodía..."
                        value={timeRestrictionNotes}
                        onChange={(e) => setTimeRestrictionNotes(e.target.value)}
                        className="bg-white dark:bg-gray-900 text-sm"
                      />
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      ⚠️ El pedido solo podrá ser entregado entre {deliveryWindowStart} y {deliveryWindowEnd}
                    </p>
                  </div>
                )}

                {!hasTimeRestriction && (
                  <p className="text-xs text-muted-foreground">
                    Sin restricción horaria - entrega flexible durante el horario comercial
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Pedido</CardTitle>
          <CardDescription>Configure las opciones del pedido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryDate" className="font-semibold">
                📅 Fecha de Entrega <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="border-2 border-primary/50 focus:border-primary"
                required
              />
              <p className="text-xs text-muted-foreground">
                El admin generará rutas para esta fecha
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as OrderPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Pedido</Label>
            <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as OrderType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="presencial" id="presencial" />
                <Label htmlFor="presencial" className="font-normal">
                  Presencial
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="web" id="web" />
                <Label htmlFor="web" className="font-normal">
                  Web
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="telefono" id="telefono" />
                <Label htmlFor="telefono" className="font-normal">
                  Teléfono
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="font-normal">
                  WhatsApp
                </Label>
              </div>
            </RadioGroup>

            {/* 🆕 Validación de ubicación para pedidos presenciales */}
            {orderType === "presencial" && selectedCustomer && (
              <div className="mt-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium text-sm">Validación de Ubicación</span>
                </div>

                {isGettingLocation && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Obteniendo tu ubicación...
                  </div>
                )}

                {!isGettingLocation && isWithinRange === true && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    ✓ Estás a {distanceToCustomer}m del cliente (dentro del rango de {MAX_PRESENCIAL_DISTANCE_METERS}m)
                  </div>
                )}

                {!isGettingLocation && isWithinRange === false && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {locationError || `Estás a ${distanceToCustomer}m del cliente (máximo permitido: ${MAX_PRESENCIAL_DISTANCE_METERS}m)`}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={validatePresencialLocation}
                        disabled={isGettingLocation}
                      >
                        <MapPin className="mr-1 h-3 w-3" />
                        Reintentar
                      </Button>
                      <p className="text-xs text-muted-foreground self-center">
                        O cambia a otro tipo de pedido
                      </p>
                    </div>
                  </div>
                )}

                {!isGettingLocation && isWithinRange === null && !locationError && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={validatePresencialLocation}
                  >
                    <MapPin className="mr-1 h-3 w-3" />
                    Validar mi ubicación
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ">
            <input
              type="checkbox"
              id="requiresInvoice"
              checked={requiresInvoice}
              onChange={(e) => setRequiresInvoice(e.target.checked)}
              className="h-4 w-4 hover:cursor-pointer "
            />
            <Label htmlFor="requiresInvoice" className="font-normal hover:cursor-pointer ">
              Requiere Factura
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas adicionales sobre el pedido..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Agregue productos al pedido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de producto con búsqueda */}
          <ProductSelector
            products={products}
            selectedProduct={selectedProduct}
            onSelect={(product) => setSelectedProductId(product?.id || "")}
          />
          
          {/* 🆕 Warning de stock del producto seleccionado */}
          {selectedProduct && selectedProduct.current_stock === 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">¡Producto sin stock!</p>
                  <p className="text-sm">Este producto no tiene stock disponible. El pedido podría tener faltantes.</p>
                </div>
              </div>
            </div>
          )}
          
          {selectedProduct && selectedProduct.current_stock > 0 && selectedProduct.current_stock <= selectedProduct.min_stock && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Stock bajo: {selectedProduct.current_stock} unidades</p>
                  <p className="text-sm">Este producto tiene stock bajo (mínimo: {selectedProduct.min_stock}). Verificar disponibilidad.</p>
                </div>
              </div>
            </div>
          )}

          {/* Campos numéricos en grilla responsive */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-xs sm:text-sm">
                Cantidad {selectedProduct?.unit_of_measure && `(${selectedProduct.unit_of_measure})`}
              </Label>
              <Input
                id="quantity"
                type="number"
                min={selectedProduct?.allows_decimal_quantity ? "0.1" : "1"}
                step={selectedProduct?.allows_decimal_quantity ? "0.1" : "1"}
                value={quantity}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 1
                  // Si no permite decimales, redondear a entero
                  if (selectedProduct && !selectedProduct.allows_decimal_quantity) {
                    setQuantity(Math.round(value))
                  } else {
                    setQuantity(value)
                  }
                }}
                className="text-center"
              />
              {selectedProduct?.allows_decimal_quantity && (
                <p className="text-xs text-muted-foreground">
                  Acepta decimales (ej: 1.5 {selectedProduct.unit_of_measure || 'unidades'})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice" className="text-xs sm:text-sm">Precio</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                placeholder={
                  selectedProduct
                    ? selectedCustomer?.customer_type === "mayorista"
                      ? selectedProduct.wholesale_price?.toString() || selectedProduct.base_price.toString()
                      : selectedProduct.retail_price?.toString() || selectedProduct.base_price.toString()
                    : "0"
                }
                value={customPrice || ""}
                onChange={(e) => setCustomPrice(e.target.value ? Number.parseFloat(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemDiscount" className="text-xs sm:text-sm">Descuento</Label>
              <Input
                id="itemDiscount"
                type="number"
                step="0.01"
                min="0"
                value={itemDiscount}
                onChange={(e) => setItemDiscount(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Botón agregar - ancho completo en móvil */}
          <Button 
            onClick={handleAddProduct} 
            disabled={!selectedProductId || quantity <= 0} 
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </Button>

          {orderItems.length > 0 && (
            <div className="border rounded-md overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[600px]">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 text-xs md:text-sm font-medium">Producto</th>
                    <th className="text-right p-2 text-xs md:text-sm font-medium">Cant.</th>
                    <th className="text-right p-2 text-xs md:text-sm font-medium">Precio</th>
                    <th className="text-right p-2 text-xs md:text-sm font-medium">Desc.</th>
                    <th className="text-right p-2 text-xs md:text-sm font-medium">Subtotal</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 text-sm">{item.productName}</td>
                      <td className="p-2 text-sm text-right">
                        {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(2)}
                        {item.unitOfMeasure && item.unitOfMeasure !== "unidad" && (
                          <span className="text-xs text-muted-foreground ml-1">{item.unitOfMeasure}</span>
                        )}
                      </td>
                      <td className="p-2 text-sm text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-sm text-right">${item.discount.toFixed(2)}</td>
                      <td className="p-2 text-sm text-right font-medium">${item.subtotal.toFixed(2)}</td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveProduct(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totales y Observaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="generalDiscount">Descuento General</Label>
            <div className="flex gap-2">
              <Input
                id="generalDiscount"
                type="number"
                step="0.01"
                min="0"
                max={discountType === "percentage" ? 100 : undefined}
                value={generalDiscount}
                onChange={(e) => setGeneralDiscount(Number.parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <div className="flex border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDiscountType("fixed")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    discountType === "fixed" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("percentage")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    discountType === "percentage" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  %
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              placeholder="Notas adicionales sobre el pedido..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Descuento General {discountType === "percentage" ? `(${generalDiscount}%)` : ""}:</span>
              <span className="font-medium text-destructive">-${discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={() => handleSaveOrder(true)} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Guardando Borrador..." : "Guardar Borrador"}
        </Button>
        <Button onClick={() => handleSaveOrder(false)} disabled={isLoading} size="lg">
          {isLoading ? "Creando..." : "Confirmar Pedido"}
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
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
import { ArrowLeft, MapPin, Package, CheckCircle, Play, Flag, Calendar, Truck, Clock, CircleDollarSign, FileText, ChevronDown, ChevronUp, GripVertical, Pencil } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { RouteSegment } from "@/lib/types/rutas-inteligentes.types"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GeocodingService } from "@/lib/services/geocodingService"
import { ReceiptButton } from "./receipt-button"
import { ShareButtons } from "./share-buttons"
import { ReceiptActionsMenu } from "./receipt-actions-menu"
import { CameraCapture } from "@/components/ui/camera-capture"
import { PAYMENT_METHODS, type PaymentMethod, type PaymentLine } from "@/lib/types/database"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"
import { 
  calculateRouteSummary, 
  calculateRouteCollectedTotal,
  calculateRouteExpectedTotal,
  calculateDeliveredExpectedTotal,
  calculateRouteDebt,
  type RouteOrderData 
} from "@/lib/services/routeCalculations"


interface DeliveryRouteViewProps {
  route: any
  userId: string
  today: string
  depot: any | null
  hasActiveRoute?: boolean
  repartidorName?: string
}

/**
 * Card compacta de un stop en modo edición. Sortable con drag handle.
 */
function SortableStopItem({
  id,
  position,
  order,
}: {
  id: string
  position: number
  order: any
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-background ${
        isDragging ? "shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
        {position}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{order.customers?.commercial_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {order.order_number} · {order.customers?.street} {order.customers?.street_number}
        </p>
      </div>
    </div>
  )
}

export function DeliveryRouteView({ route, userId, today, depot, hasActiveRoute = false, repartidorName }: DeliveryRouteViewProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)

  // 🆕 Reordenar ruta: "Ir ahora" con motivo
  const [showReorderDialog, setShowReorderDialog] = useState(false)
  const [reorderTargetOrder, setReorderTargetOrder] = useState<any>(null)
  const [reorderReason, setReorderReason] = useState("")
  const [isReordering, setIsReordering] = useState(false)

  // 🆕 Modo edición de ruta (drag & drop)
  const [editMode, setEditMode] = useState(false)
  const [editedOrderIds, setEditedOrderIds] = useState<string[]>([])
  const [showSaveOrderDialog, setShowSaveOrderDialog] = useState(false)
  const [saveOrderReason, setSaveOrderReason] = useState("")
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // Sensores DnD: pointer (desktop) + touch (mobile) + keyboard (accesible)
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  
  // 🆕 MEDIUM-3: Route summary state
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [routeSummary, setRouteSummary] = useState<any>(null)

  // Delivery form state
  const [wasCollected, setWasCollected] = useState(false)
  const [deliveryNotes, setDeliveryNotes] = useState("")

  // Payment lines para split payment (múltiples métodos de pago)
  interface PaymentLineState {
    id: string
    method: PaymentMethod
    amount: string
    transferProof: File | null
    transferProofPreview: string | null
  }
  const [paymentLines, setPaymentLines] = useState<PaymentLineState[]>([
    { id: "1", method: "Efectivo", amount: "", transferProof: null, transferProofPreview: null }
  ])

  const addPaymentLine = () => {
    setPaymentLines(prev => [
      ...prev,
      { id: Date.now().toString(), method: "Efectivo", amount: "", transferProof: null, transferProofPreview: null }
    ])
  }

  const removePaymentLine = (id: string) => {
    setPaymentLines(prev => prev.filter(line => line.id !== id))
  }

  const updatePaymentLine = (id: string, updates: Partial<PaymentLineState>) => {
    setPaymentLines(prev => prev.map(line =>
      line.id === id ? { ...line, ...updates } : line
    ))
  }

  const totalCollected = paymentLines.reduce(
    (sum, line) => sum + (Number.parseFloat(line.amount) || 0), 0
  )


  // New states for delivery evidence and non-delivery
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [receivedByName, setReceivedByName] = useState("")
  const [cannotDeliver, setCannotDeliver] = useState(false)
  const [noDeliveryReason, setNoDeliveryReason] = useState("")
  const [noDeliveryNotes, setNoDeliveryNotes] = useState("")

  // Foto de comprobante cuando no se puede entregar
  const [noDeliveryPhoto, setNoDeliveryPhoto] = useState<File | null>(null)
  const [noDeliveryPhotoPreview, setNoDeliveryPhotoPreview] = useState<string | null>(null)
  
  // 🆕 Estado para expandir/colapsar segmentos de ruta
  const [segmentsExpanded, setSegmentsExpanded] = useState(false)

  // 🆕 Helper function para verificar si la ruta está segmentada
  const isRouteSegmented = (): boolean => {
    return route.optimized_route?.isSegmented === true && 
           Array.isArray(route.optimized_route?.segments) && 
           route.optimized_route.segments.length > 0
  }

  // 🆕 Helper function para obtener los segmentos de la ruta
  const getRouteSegments = (): RouteSegment[] => {
    if (isRouteSegmented()) {
      return route.optimized_route.segments as RouteSegment[]
    }
    return []
  }

  // Build Google Maps URL always from current delivery_order (never from stored URL which is stale after reordering)
  const buildGoogleMapsUrl = () => {
    if (isRouteSegmented()) {
      return null
    }

    const startPoint = depot
      ? `${depot.latitude},${depot.longitude}`
      : route.start_latitude && route.start_longitude
      ? `${route.start_latitude},${route.start_longitude}`
      : '-31.4201,-64.1888'

    const customerCoords = route.route_orders
      .sort((a: any, b: any) => a.delivery_order - b.delivery_order)
      .filter((ro: any) => ro.orders?.customers?.latitude && ro.orders?.customers?.longitude)
      .map((ro: any) => `${ro.orders.customers.latitude},${ro.orders.customers.longitude}`)

    if (customerCoords.length === 0) {
      // Last resort: stored URLs
      return route.optimized_route?.googleMapsUrl || route.google_maps_url || null
    }

    return `https://www.google.com/maps/dir/${startPoint}/${customerCoords.join('/')}/${startPoint}/`
  }


  // Effect to log customer coordinates on page load in development environment
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      logCustomerCoordinates()
    }
  }, [])

  const logCustomerCoordinates = () => {
    if (process.env.NODE_ENV === "development") {
      console.log("Customer Coordinates for Route:", route.id)
      route.route_orders
        .sort((a: any, b: any) => a.delivery_order - b.delivery_order)
        .forEach((ro: any) => {
          if (ro.orders?.customers?.latitude && ro.orders?.customers?.longitude) {
            console.log(
              `Customer ${ro.orders.customers.commercial_name}: Lat ${ro.orders.customers.latitude}, Lng ${ro.orders.customers.longitude}`
            )
          } else {
            console.log(`Customer ${ro.orders.customers.name}: Coordinates not available`)
          }
        })
    }
  }

  const handleStartRoute = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Check if there is another route in progress
      const { count: inProgressCount, error: countError } = await supabase
        .from("routes")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", userId)
        .eq("status", "EN_CURSO")

      if (countError) throw countError
      if (inProgressCount && inProgressCount > 0) throw new Error("Ya tienes otra ruta en curso. Complétala antes de iniciar una nueva.")

      // Validate location if depot is configured
      if (depot) {
        const currentLocation = await GeocodingService.getCurrentLocation()
        
        if (!currentLocation) {
          setError('No se pudo obtener tu ubicación. Por favor, habilita el GPS y vuelve a intentar.')
          setIsLoading(false)
          return
        }

        const isWithinRadius = GeocodingService.isWithinRadius(
          currentLocation.latitude,
          currentLocation.longitude,
          depot.latitude,
          depot.longitude,
          depot.radius_meters
        )

        if (!isWithinRadius) {
          const distance = GeocodingService.calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            depot.latitude,
            depot.longitude
          )
          setError(
            `Debes estar en la distribuidora para iniciar la ruta. Te encuentras a ${Math.round(distance)} metros del punto base (máximo permitido: ${depot.radius_meters}m).`
          )
          setIsLoading(false)
          return
        }
      }

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

      // Open Google Maps with route (depot -> customers -> depot)
      // 🆕 Manejar rutas segmentadas
      if (isRouteSegmented()) {
        const segments = getRouteSegments()
        if (segments.length > 0) {
          console.log(`✅ Ruta segmentada: abriendo Tramo 1 de ${segments.length}`)
          window.open(segments[0].googleMapsUrl, '_blank')
          // Expandir el menú de segmentos para que el usuario vea los demás tramos
          setSegmentsExpanded(true)
        } else {
          setError('Error: La ruta está segmentada pero no tiene tramos.')
        }
      } else {
        // We rely on buildGoogleMapsUrl which handles:
        // 1. Optimized route URL if available
        // 2. Manual construction: Depot -> Customers -> Depot
        const googleMapsUrl = buildGoogleMapsUrl()
        
        if (googleMapsUrl) {
          console.log('✅ Opening Google Maps URL:', googleMapsUrl)
          window.open(googleMapsUrl, '_blank')
        } else {
          console.warn('⚠️ Could not generate Google Maps URL')
          setError('No se pudo abrir Google Maps. Verifica que los clientes tengan coordenadas.')
        }
      }



      router.refresh()
    } catch (err) {
      console.error("[v0] Error starting route:", err)
      setError(err instanceof Error ? err.message : "Error al iniciar la ruta")
    } finally {
      setIsLoading(false)
    }
  }

  // 🆕 Abrir dialog de reordenar (Ir ahora)
  const handleOpenReorder = (order: any) => {
    setReorderTargetOrder(order)
    setReorderReason("")
    setError(null)
    setShowReorderDialog(true)
  }

  // 🆕 Confirmar el reorder llamando al API
  const handleConfirmReorder = async () => {
    if (!reorderTargetOrder) return
    if (reorderReason.trim().length < 5) {
      setError("El motivo es obligatorio (mínimo 5 caracteres)")
      return
    }
    setIsReordering(true)
    setError(null)
    try {
      const response = await fetch(`/api/repartidor/routes/${route.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: reorderTargetOrder.id,
          reason: reorderReason.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Error al reordenar")
      setShowReorderDialog(false)
      setReorderTargetOrder(null)
      setReorderReason("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reordenar la ruta")
    } finally {
      setIsReordering(false)
    }
  }

  const handleOpenDeliveryDialog = (order: any) => {
    setSelectedOrder(order)
    setWasCollected(false)
    setDeliveryNotes("")
    // Reset payment lines a una sola línea por defecto
    setPaymentLines([
      { id: "1", method: "Efectivo", amount: "", transferProof: null, transferProofPreview: null }
    ])
    // Reset delivery evidence fields
    setDeliveryPhoto(null)
    setPhotoPreview(null)
    setReceivedByName("")
    setCannotDeliver(false)
    setNoDeliveryReason("")
    setNoDeliveryNotes("")
    setNoDeliveryPhoto(null)
    setNoDeliveryPhotoPreview(null)
    setShowDeliveryDialog(true)
  }

  // 🆕 Handle photo selection
  const handlePhotoCapture = (file: File) => {
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
  
  // 🆕 Handle no-delivery photo selection
  const handleNoDeliveryPhotoCapture = (file: File) => {
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
      setNoDeliveryPhoto(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setNoDeliveryPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
  }
  
  // 🆕 Send receipt via WhatsApp
  const handleSendWhatsApp = (order: any) => {
    const customer = order.customers
    if (!customer?.phone) {
      setError("El cliente no tiene número de teléfono registrado")
      return
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    let phone = customer.phone.replace(/[\s\-\(\)]/g, "")
    // Add country code if not present (Argentina default)
    if (!phone.startsWith("+")) {
      phone = "+54" + phone.replace(/^0/, "")
    }
    
    // Build message
    const message = encodeURIComponent(
      `🧾 *Comprobante de Entrega*\n\n` +
      `📦 Pedido: ${order.order_number}\n` +
      `👤 Cliente: ${customer.commercial_name}\n` +
      `📅 Fecha: ${new Date().toLocaleDateString("es-AR")}\n` +
      `💰 Total: $${order.total?.toFixed(2) || "0.00"}\n` +
      `✅ Estado: ENTREGADO\n\n` +
      `Gracias por su compra!`
    )
    
    // Open WhatsApp
    window.open(`https://wa.me/${phone.replace("+", "")}?text=${message}`, "_blank")
  }

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return

    // 🆕 MEDIUM-2: Handle non-delivery case
    if (cannotDeliver) {
      if (!noDeliveryReason) {
        setError("Debe seleccionar un motivo de no-entrega")
        return
      }
      
      // 🆕 Validar foto de no-entrega (opcional pero recomendada)
      // Si hay foto, la subimos

      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        
        // 🆕 Upload no-delivery photo if provided
        let noDeliveryPhotoUrl: string | null = null
        if (noDeliveryPhoto) {
          const fileExt = noDeliveryPhoto.name.split(".").pop() || "jpg"
          const fileName = `no_delivery_${selectedOrder.id}_${Date.now()}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from("delivery")
            .upload(fileName, noDeliveryPhoto, {
              cacheControl: "3600",
              upsert: false,
            })
          
          if (uploadError) {
            console.warn("[v0] Error uploading no-delivery photo:", uploadError)
            // Continue without photo if bucket doesn't exist
            if (!uploadError.message.includes("Bucket not found")) {
              throw uploadError
            }
          } else {
            const { data: publicData } = supabase.storage.from("delivery").getPublicUrl(fileName)
            noDeliveryPhotoUrl = publicData.publicUrl
          }
        }

        // Update order with non-delivery info and reset status to PENDIENTE_ENTREGA
        const { error: orderError } = await supabase
          .from("orders")
          .update({
            status: "PENDIENTE_ENTREGA", // Return to pending so it can be re-assigned
            no_delivery_reason: noDeliveryReason,
            no_delivery_notes: noDeliveryNotes || null,
            no_delivery_photo_url: noDeliveryPhotoUrl, // 🆕 Foto de comprobante
            // Clear delivery evidence and assignment
            delivered_at: null,
            received_by_name: null,
            delivery_photo_url: null,
            delivery_notes: null,
            delivered_by: null,
            delivery_started_at: null,
          })
          .eq("id", selectedOrder.id)

        if (orderError) throw orderError

        // Create history entry
        await supabase.from("order_history").insert({
          order_id: selectedOrder.id,
          previous_status: selectedOrder.status,
          new_status: "PENDIENTE_ENTREGA", 
          changed_by: userId,
          change_reason: `No se pudo entregar: ${noDeliveryReason}${noDeliveryPhotoUrl ? ' (con foto)' : ''}`,
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

    // Validate delivery evidence
    if (!receivedByName.trim()) {
      setError("Debe ingresar el nombre de quien recibió el pedido")
      return
    }

    // Validate payment lines if marked as collected
    if (wasCollected) {
      if (totalCollected <= 0) {
        setError("Debe ingresar al menos un monto cobrado válido (mayor a $0)")
        return
      }
      for (const line of paymentLines) {
        const lineAmount = Number.parseFloat(line.amount) || 0
        if (lineAmount <= 0) {
          setError("Cada línea de pago debe tener un monto mayor a $0")
          return
        }
        if (line.method === "Transferencia" && !line.transferProof) {
          setError("Debe adjuntar el comprobante de transferencia para cada pago con transferencia")
          return
        }
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // 1. Upload photo to Supabase Storage
      let publicUrl = ""
      let bucketNotFound = false
      
      // Helper function to get file extension safely
      const getFileExtension = (file: File): string => {
        const nameParts = file.name.split('.')
        if (nameParts.length > 1) {
          return nameParts.pop() || 'jpg'
        }
        // Fallback based on MIME type
        if (file.type.includes('png')) return 'png'
        if (file.type.includes('gif')) return 'gif'
        if (file.type.includes('webp')) return 'webp'
        return 'jpg' // Default to jpg
      }

      // Upload delivery photo
      try {
        const fileExt = getFileExtension(deliveryPhoto)
      const fileName = `${selectedOrder.id}_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
        .from('delivery')
          .upload(fileName, deliveryPhoto, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error("Error uploading photo:", uploadError)
          // Si el bucket no existe, marcamos para continuar sin fotos
          if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("not found")) {
            console.warn("[v0] Storage bucket 'delivery' not found - continuing without photos")
            bucketNotFound = true
          } else {
            throw new Error(`Error al subir la foto de entrega: ${uploadError.message}`)
          }
        } else {
          // Get public URL only if upload succeeded
          const { data } = supabase.storage
            .from('delivery')
            .getPublicUrl(fileName)
          publicUrl = data.publicUrl
        }
      } catch (photoError: any) {
        // Re-throw if it's not a bucket error - this is a real error
        if (!photoError.message?.includes("Bucket not found")) {
          throw photoError
        }
        console.warn("[v0] Storage error for delivery photo:", photoError)
        bucketNotFound = true
      }

      // Upload transfer proofs para cada línea de pago con Transferencia
      if (wasCollected && !bucketNotFound) {
        for (const line of paymentLines) {
          if (line.method === "Transferencia" && line.transferProof) {
            try {
              const proofExt = getFileExtension(line.transferProof)
              const proofFileName = `${selectedOrder.id}_transfer_proof_${line.id}_${Date.now()}.${proofExt}`

              const { error: proofUploadError } = await supabase.storage
                .from('delivery')
                .upload(proofFileName, line.transferProof, {
                  cacheControl: '3600',
                  upsert: false
                })

              if (proofUploadError) {
                throw new Error(`Error al subir comprobante de transferencia: ${proofUploadError.message}`)
              }

              const { data: proofData } = supabase.storage
                .from('delivery')
                .getPublicUrl(proofFileName)

              // Guardar URL en la línea para uso posterior
              updatePaymentLine(line.id, { transferProofPreview: proofData.publicUrl })
              // También guardar en variable local para el JSON
              line.transferProofPreview = proofData.publicUrl
            } catch (proofError: any) {
              throw new Error(`Error al subir comprobante de transferencia: ${proofError.message || 'Error desconocido'}`)
            }
          }
        }
      }

      // 3. Update order with delivery evidence AND payment data
      const collectedAmountNum = wasCollected ? totalCollected : 0

      // Determinar método principal (mayor monto) para backward compat
      const primaryLine = wasCollected
        ? paymentLines.reduce((max, line) =>
            (Number.parseFloat(line.amount) || 0) > (Number.parseFloat(max.amount) || 0) ? line : max
          )
        : null

      // Construir JSON de desglose de pagos
      const paymentMethodsJson = wasCollected
        ? paymentLines.map(line => ({
            method: line.method,
            amount: Number.parseFloat(line.amount) || 0,
            transferProofUrl: line.method === "Transferencia" ? (line.transferProofPreview || undefined) : undefined,
          }))
        : null

      // Primera URL de comprobante de transferencia (backward compat)
      const firstTransferProofUrl = wasCollected
        ? paymentLines.find(l => l.method === "Transferencia" && l.transferProofPreview)?.transferProofPreview || ""
        : ""

      const orderUpdateData: any = {
        status: "ENTREGADO",
        delivered_at: new Date().toISOString(),
        delivery_notes: deliveryNotes || null,
        delivery_photo_url: publicUrl,
        received_by_name: receivedByName.trim(),
        amount_paid: collectedAmountNum,
        was_collected_on_delivery: wasCollected,
        payment_method: primaryLine?.method || null,
        payment_methods_json: paymentMethodsJson,
      }

      if (firstTransferProofUrl) {
        orderUpdateData.transfer_proof_url = firstTransferProofUrl
      }

      const { error: orderError } = await supabase
        .from("orders")
        .update(orderUpdateData)
        .eq("id", selectedOrder.id)

      if (orderError) throw orderError

      // Update route_orders (solo tiempo de llegada, datos de pago ya no van aquí)
      const { error: routeOrderError } = await supabase
        .from("route_orders")
        .update({
          actual_arrival_time: new Date().toISOString(),
        })
        .eq("route_id", route.id)
        .eq("order_id", selectedOrder.id)

      if (routeOrderError) throw routeOrderError

      // Registrar pagos en cuenta corriente del cliente
      const orderTotal = selectedOrder.total || 0
      const debtAmount = orderTotal - collectedAmountNum

      try {
        const accountService = createAccountMovementsService(supabase)

        // Registrar un pago por cada línea de pago
        if (wasCollected && collectedAmountNum > 0) {
          for (const line of paymentLines) {
            const lineAmount = Number.parseFloat(line.amount) || 0
            if (lineAmount > 0) {
              const proofUrl = line.method === "Transferencia" ? (line.transferProofPreview || undefined) : undefined
              await accountService.recordDebtPayment({
                orderId: selectedOrder.id,
                amount: lineAmount,
                paymentMethod: line.method,
                routeId: route.id,
                createdBy: userId,
                notes: `Cobrado en entrega por ${repartidorName || 'Repartidor'}`,
                proofUrl,
              })
            }
          }
          console.log(`✅ Pagos registrados: $${collectedAmountNum} (${paymentLines.length} línea(s)) para pedido ${selectedOrder.order_number}`)
        }
      } catch (accountError) {
        console.warn("[v0] Account system not available (tables may not exist):", accountError)
      }

      // Create history entry
      const methodsSummary = paymentLines
        .filter(l => (Number.parseFloat(l.amount) || 0) > 0)
        .map(l => `${l.method}: $${(Number.parseFloat(l.amount) || 0).toFixed(2)}`)
        .join(", ")

      await supabase.from("order_history").insert({
        order_id: selectedOrder.id,
        previous_status: "EN_REPARTICION",
        new_status: "ENTREGADO",
        changed_by: userId,
        change_reason: wasCollected
          ? `Entrega confirmada - Cobrado: $${collectedAmountNum.toFixed(2)} (${methodsSummary})${debtAmount > 0 ? ` - Deuda: $${debtAmount.toFixed(2)}` : ""}`
          : `Entrega confirmada - Sin cobro - Deuda: $${orderTotal.toFixed(2)}`,
      })

      setShowDeliveryDialog(false)
      setSelectedOrder(null)
      router.refresh()
    } catch (err: any) {
      console.error("[v0] Error confirming delivery:", err)
      // Mostrar mensaje de error más detallado
      let errorMessage = "Error al confirmar la entrega"
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.error?.message) {
        errorMessage = err.error.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      console.error("[v0] Error details:", JSON.stringify(err, null, 2))
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 🆕 MEDIUM-3: Show route summary before completing
  // Uses centralized calculation service for consistency
  const handleShowRouteSummary = () => {
    const summary = calculateRouteSummary(route.route_orders as RouteOrderData[])
    setRouteSummary(summary)
    setShowSummaryDialog(true)
  }

  const handleCompleteRoute = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Validate location if depot is configured
      if (depot) {
        const currentLocation = await GeocodingService.getCurrentLocation()
        
        if (!currentLocation) {
          setError('No se pudo obtener tu ubicación. Por favor, habilita el GPS y vuelve a intentar.')
          setIsLoading(false)
          return
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('Depot coordinates:', depot.latitude, depot.longitude)
          console.log('Current location:', currentLocation.latitude, currentLocation.longitude)
          console.log('Radius:', depot.radius_meters)
        }

        const isWithinRadius = GeocodingService.isWithinRadius(
          currentLocation.latitude,
          currentLocation.longitude,
          depot.latitude,
          depot.longitude,
          depot.radius_meters
        )

        if (!isWithinRadius) {
          const distance = GeocodingService.calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            depot.latitude,
            depot.longitude
          )
          setError(
            `Debes regresar a la distribuidora para finalizar la ruta. Te encuentras a ${Math.round(distance)} metros del punto base (máximo permitido: ${depot.radius_meters}m).`
          )
          setIsLoading(false)
          return
        }
      }

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

      // 🆕 Crear cierre de caja automático e inmutable
      const accountService = createAccountMovementsService(supabase)
      
      // Obtener datos actualizados de route_orders para el cierre
      const { data: finalRouteOrders } = await supabase
        .from("route_orders")
        .select("order_id, orders(total, status, was_collected_on_delivery, amount_paid, payment_method)")
        .eq("route_id", route.id)

      // Datos de pago ahora vienen de orders (normalizado)
      const ordersForClosure = (finalRouteOrders || [])
        .filter((ro: any) => ro.orders?.status === "ENTREGADO")
        .map((ro: any) => ({
          total: ro.orders?.total || 0,
          wasCollected: ro.orders?.was_collected_on_delivery || false,
          collectedAmount: ro.orders?.amount_paid || 0,
          paymentMethod: (ro.orders?.payment_method || "efectivo") as PaymentMethod,
        }))

      if (ordersForClosure.length > 0) {
        await accountService.createCashClosure({
          routeId: route.id,
          driverId: userId,
          orders: ordersForClosure,
        })
      }

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

  // Map route_orders to include order data with normalized payment fields
  // Uses orders.was_collected_on_delivery and orders.amount_paid as source of truth
  const sortedOrders = route.route_orders
    .map((ro: any) => ({
      ...ro.orders,
      delivery_order: ro.delivery_order,
      route_order_id: ro.id,
      // Use orders fields as source of truth (normalized)
      collected_amount: ro.orders.amount_paid || 0,
      was_collected: ro.orders.was_collected_on_delivery || false,
      payment_method: ro.orders.payment_method,
    }))
    .sort((a: any, b: any) => a.delivery_order - b.delivery_order)

  const totalOrders = sortedOrders.length
  const deliveredOrders = sortedOrders.filter((order: any) => order.status === "ENTREGADO").length
  const notDeliveredOrders = sortedOrders.filter((order: any) => order.no_delivery_reason && order.status !== "ENTREGADO")
  const pendingOrders = sortedOrders.filter((order: any) => order.status !== "ENTREGADO" && !order.no_delivery_reason)
  
  // All orders are managed if they are either delivered or have a no-delivery reason
  const allOrdersManaged = pendingOrders.length === 0

  // 🆕 Identificar el primer stop pendiente (no se puede reordenar a sí mismo)
  const firstPendingOrderId = pendingOrders.length > 0 ? pendingOrders[0].id : null

  // 🆕 Handlers de modo edición de ruta (drag & drop)
  const enterEditMode = () => {
    // Inicializar con el orden actual de los pendientes
    setEditedOrderIds(pendingOrders.map((o: any) => o.id))
    setEditMode(true)
  }

  const cancelEditMode = () => {
    setEditMode(false)
    setEditedOrderIds([])
    setSaveOrderReason("")
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = editedOrderIds.indexOf(active.id as string)
    const newIndex = editedOrderIds.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    setEditedOrderIds(arrayMove(editedOrderIds, oldIndex, newIndex))
  }

  const hasOrderChanges = () => {
    if (editedOrderIds.length === 0) return false
    return editedOrderIds.some((id, idx) => pendingOrders[idx]?.id !== id)
  }

  const handleSaveOrderClick = () => {
    if (!hasOrderChanges()) {
      setError("No hiciste cambios en el orden")
      return
    }
    setError(null)
    setShowSaveOrderDialog(true)
  }

  const handleConfirmSaveOrder = async () => {
    if (saveOrderReason.trim().length < 5) {
      setError("El motivo es obligatorio (mínimo 5 caracteres)")
      return
    }
    setIsSavingOrder(true)
    setError(null)
    try {
      // Construir new_orders: a cada id le asignamos el delivery_order de la posición actual
      // que tenía el pendingOrders en esa posición (mantiene los slots ocupados)
      const new_orders = editedOrderIds.map((id, idx) => ({
        order_id: id,
        delivery_order: pendingOrders[idx].delivery_order,
      }))

      const response = await fetch(
        `/api/repartidor/routes/${route.id}/reorder-batch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_orders, reason: saveOrderReason.trim() }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Error al guardar")
      setShowSaveOrderDialog(false)
      setEditMode(false)
      setEditedOrderIds([])
      setSaveOrderReason("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el orden")
    } finally {
      setIsSavingOrder(false)
    }
  }

  // Mapa para acceder por id rápido en modo edición
  const pendingById = new Map<string, any>(pendingOrders.map((o: any) => [o.id, o]))
  
  // Check if route is scheduled for today or past
  const isScheduledForTodayOrPast = route.scheduled_date <= today
  const isFutureRoute = route.scheduled_date > today

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con botones - responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="outline" size="sm" className="w-fit" onClick={() => router.push("/repartidor/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <div className="flex flex-col sm:flex-row gap-2">
          {route.status === "PLANIFICADO" && (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <Button 
                onClick={handleStartRoute} 
                disabled={isLoading || !isScheduledForTodayOrPast || hasActiveRoute} 
                size="default"
                className="w-full sm:w-auto"
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar Ruta
              </Button>
              {hasActiveRoute && (
                <p className="text-xs text-destructive font-medium text-center sm:text-right">
                  Completa tu ruta activa primero
                </p>
              )}
            </div>
          )}

          {route.status === "EN_CURSO" && (
            <div className="flex flex-col sm:flex-row gap-2">
              {isRouteSegmented() ? (
                /* 🆕 Ruta Segmentada: Menú desplegable de tramos */
                <div className="relative">
                  <Button 
                    variant="outline"
                    onClick={() => setSegmentsExpanded(!segmentsExpanded)}
                    size="default"
                    className="w-full sm:w-auto sm:min-w-[180px]"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span className="truncate">Navegar ({getRouteSegments().length} tramos)</span>
                    {segmentsExpanded ? (
                      <ChevronUp className="ml-2 h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </Button>
                  
                  {segmentsExpanded && (
                    <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-64 bg-background border rounded-lg shadow-lg z-50 p-2 space-y-1">
                      {getRouteSegments().map((segment, index) => (
                        <button
                          key={segment.id}
                          onClick={() => {
                            window.open(segment.googleMapsUrl, '_blank')
                            setSegmentsExpanded(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                            index === 0 
                              ? 'bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 text-green-800 dark:text-green-200' 
                              : index === getRouteSegments().length - 1
                                ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-800 dark:text-red-200'
                                : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm">🗺️ {segment.name}</p>
                            <p className="text-xs opacity-70">
                              Puntos {segment.waypointRange.from}-{segment.waypointRange.to}
                            </p>
                          </div>
                          <span className="text-xs font-bold">
                            {segment.waypointsCount}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Ruta Simple: Un solo botón */
                <Button 
                  variant="outline"
                  onClick={() => {
                    const googleMapsUrl = buildGoogleMapsUrl()
                    if (googleMapsUrl) {
                      window.open(googleMapsUrl, '_blank')
                    } else {
                      setError('No se pudo abrir Google Maps. Verifica que los clientes tengan coordenadas.')
                    }
                  }}
                  size="default"
                  className="w-full sm:w-auto"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Google Maps</span>
                </Button>
              )}
              <Button 
                onClick={handleShowRouteSummary} 
                disabled={isLoading || !allOrdersManaged} 
                size="default"
                className="w-full sm:w-auto"
              >
                <Flag className="mr-2 h-4 w-4" />
                Finalizar Ruta
              </Button>
            </div>
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
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-lg">Ruta en Curso</p>
                {isRouteSegmented() && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900 dark:text-amber-200">
                    🔀 {getRouteSegments().length} Tramos
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {isRouteSegmented() 
                  ? `Esta ruta tiene ${route.optimized_route?.totalWaypoints || totalOrders} puntos y está dividida en ${getRouteSegments().length} tramos. Usa el botón "Navegar" para abrir cada tramo en Google Maps.`
                  : 'Gestiona tus entregas y marca cada pedido como entregado. Usa el botón "Abrir en Google Maps" para navegar entre direcciones.'
                }
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

      {/* 🆕 Info banner for COMPLETED route */}
      {route.status === "COMPLETADO" && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-400 dark:border-green-600 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-600 text-white shrink-0">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-green-800 dark:text-green-200">Ruta Completada</p>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Esta ruta fue finalizada el {route.actual_end_time 
                  ? new Date(route.actual_end_time).toLocaleDateString("es-AR", { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) 
                  : 'fecha no registrada'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-white dark:bg-gray-800 p-2 rounded-md">
                  <span className="text-green-600 dark:text-green-400 text-xs block">Entregados</span>
                  <span className="font-bold text-lg">{deliveredOrders}</span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded-md">
                  <span className="text-red-600 dark:text-red-400 text-xs block">No Entregados</span>
                  <span className="font-bold text-lg">{notDeliveredOrders.length}</span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded-md">
                  <span className="text-blue-600 dark:text-blue-400 text-xs block">Recaudado</span>
                  <span className="font-bold text-lg">
                    ${calculateRouteCollectedTotal(route.route_orders as RouteOrderData[]).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-800 p-2 rounded-md">
                  <span className="text-muted-foreground text-xs block">Total Pedidos</span>
                  <span className="font-bold text-lg">{totalOrders}</span>
                </div>
              </div>
              {route.actual_start_time && route.actual_end_time && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                  ⏱️ Duración real: {(() => {
                    const start = new Date(route.actual_start_time)
                    const end = new Date(route.actual_end_time)
                    const diffMs = end.getTime() - start.getTime()
                    const diffMins = Math.round(diffMs / 60000)
                    const hours = Math.floor(diffMins / 60)
                    const mins = diffMins % 60
                    return hours > 0 ? `${hours}h ${mins}min` : `${mins} minutos`
                  })()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info message for future routes */}
      {route.status === "PLANIFICADO" && isFutureRoute && (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="col-span-2 sm:col-span-1">
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
                <span className="font-medium">Duración:</span>
                <p className="text-muted-foreground">
                  {Math.floor(route.estimated_duration / 60)}h {route.estimated_duration % 60}min
                </p>
              </div>
            )}
            <div className="col-span-2 sm:col-span-3 pt-2 border-t mt-2">
               <span className="font-medium">Estado Financiero:</span>
               <div className="flex items-center gap-2 mt-1">
                 {(() => {
                    const routeOrdersData = route.route_orders as RouteOrderData[]
                    const collected = calculateRouteCollectedTotal(routeOrdersData)
                    const totalExpected = calculateRouteExpectedTotal(routeOrdersData)
                    const debt = calculateRouteDebt(routeOrdersData)
                    
                    return (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Recaudado: </span>
                          <span className="font-bold text-green-600 dark:text-green-400">${collected.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Esperado: </span>
                          <span className="font-semibold">${totalExpected.toFixed(2)}</span>
                        </div>
                        {debt > 0 && (
                          <div>
                            <span className="text-muted-foreground">Deuda Pendiente: </span>
                            <span className="font-bold text-red-600 dark:text-red-400">${debt.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )
                 })()}
               </div>
            </div>
          </div>

          {(route.status === "EN_CURSO" || route.status === "COMPLETADO") && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {route.status === "COMPLETADO" ? "Resultado Final" : "Progreso de entregas"}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(((deliveredOrders + notDeliveredOrders.length) / totalOrders) * 100)}%
                </span>
              </div>
              <div className="relative w-full h-3">
                <div className="absolute inset-0 w-full bg-muted rounded-full flex overflow-hidden">
                  {/* Delivered Segment (Black/Primary) */}
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${(deliveredOrders / totalOrders) * 100}%` }}
                  />
                  {/* Not Delivered Segment (Red) */}
                  <div
                    className="bg-red-500 h-full transition-all duration-500"
                    style={{ width: `${(notDeliveredOrders.length / totalOrders) * 100}%` }}
                  />
                </div>
                
                {/* Circle Indicator */}
                {(deliveredOrders + notDeliveredOrders.length) > 0 && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 border-primary rounded-full shadow-sm z-10 transition-all duration-500"
                      style={{ left: `calc(${((deliveredOrders + notDeliveredOrders.length) / totalOrders) * 100}% - 8px)` }}
                    />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                 <div className="flex gap-3">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> {deliveredOrders} Entregados</span>
                    {notDeliveredOrders.length > 0 && (
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> {notDeliveredOrders.length} No Entregados</span>
                    )}
                 </div>
                 <span>{totalOrders} Total</span>
              </div>
              {route.status === "EN_CURSO" && pendingOrders.length > 0 && (
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Entregas</CardTitle>
              <CardDescription>
                {editMode
                  ? "Arrastrá los stops para reordenar la ruta"
                  : "Pedidos en orden de entrega"}
              </CardDescription>
            </div>
            {/* Modo edición: solo si la ruta está PLANIFICADO (antes de iniciarla) */}
            {pendingOrders.length >= 2 &&
              route.status === "PLANIFICADO" &&
              !editMode && (
                <Button variant="outline" size="sm" onClick={enterEditMode}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modificar orden de la ruta
                </Button>
              )}
            {editMode && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cancelEditMode}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveOrderClick} disabled={!hasOrderChanges()}>
                  Guardar nuevo orden
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Modo edición: vista compacta con drag & drop */}
          {editMode && (
            <div className="space-y-2">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-2">
                  {error}
                </div>
              )}
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={editedOrderIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {editedOrderIds.map((id, idx) => {
                      const order = pendingById.get(id)
                      if (!order) return null
                      return (
                        <SortableStopItem
                          key={id}
                          id={id}
                          position={idx + 1}
                          order={order}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              <p className="text-xs text-muted-foreground italic mt-3">
                Solo se reordenan los pendientes. Los entregados o no-entregados quedan en su lugar.
              </p>
            </div>
          )}

          {/* Modo normal: vista completa con todos los detalles */}
          {!editMode && (
          <div className="space-y-4">
            {sortedOrders.map((order: any, index: number) => (
              <div
                key={order.id}
                className={`border rounded-lg p-3 sm:p-4 ${order.status === "ENTREGADO" ? "bg-muted/50" : order.no_delivery_reason ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : ""}`}
              >
                {/* Header con número y badges */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm shrink-0 ${order.no_delivery_reason ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100" : "bg-primary text-primary-foreground"}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm sm:text-base">{order.order_number}</span>
                      {order.status === "ENTREGADO" && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Entregado
                        </Badge>
                      )}
                      {order.no_delivery_reason && (
                        <Badge variant="destructive" className="text-xs">
                          No Entregado
                        </Badge>
                      )}
                      {order.priority === "urgente" && <Badge variant="destructive" className="text-xs">Urgente</Badge>}
                    </div>
                  </div>
                </div>

                {/* Contenido principal */}
                <div className="space-y-2 ml-0 sm:ml-11">
                  {/* Info del cliente */}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{order.customers.commercial_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {order.customers.street} {order.customers.street_number}
                        {order.customers.floor_apt && `, ${order.customers.floor_apt}`}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {order.customers.locality}, {order.customers.province}
                      </p>
                    </div>
                  </div>

                  {/* Info de productos y dinero */}
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <span>{order.order_items.length} productos</span>
                      <span className="mx-1">|</span>
                      <span>
                        Recaudado:{" "}
                        {(() => {
                          const collected = order.was_collected ? order.collected_amount || 0 : 0
                          const total = order.total || 0
                          const debt = total - collected
                          
                          return (
                            <>
                              <span className={collected >= total ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                                ${collected.toFixed(2)}
                              </span>
                              <span> / ${total.toFixed(2)}</span>
                            </>
                          )
                        })()}
                      </span>
                      {(() => {
                        const collected = order.was_collected ? order.collected_amount || 0 : 0
                        const total = order.total || 0
                        const debt = total - collected
                        
                        return debt > 0 && order.status === "ENTREGADO" ? (
                          <span className="block mt-1 text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded inline-block">
                            Deuda: ${debt.toFixed(2)}
                          </span>
                        ) : null
                      })()}
                    </div>
                  </div>

                  {order.customers.phone && (
                    <p className="text-xs sm:text-sm text-muted-foreground ml-6">Tel: {order.customers.phone}</p>
                  )}

                  {order.observations && (
                    <div className="bg-muted p-2 rounded text-xs sm:text-sm">
                      <span className="font-medium">Obs:</span> {order.observations}
                    </div>
                  )}
                  
                  {order.no_delivery_reason && (
                    <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                      <p className="font-medium">Motivo: {order.no_delivery_reason}</p>
                      {order.no_delivery_notes && <p className="text-xs mt-1">Nota: {order.no_delivery_notes}</p>}
                    </div>
                  )}
                </div>

                {/* Botones de acción - siempre debajo en móvil */}
                <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                  {order.status !== "ENTREGADO" && route.status === "EN_CURSO" && !order.no_delivery_reason && (
                    <>
                      <Button onClick={() => handleOpenDeliveryDialog(order)} size="sm" className="w-full sm:w-auto">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar Entregado
                      </Button>
                      {/* "Ir ahora" - solo si NO es el primer pendiente */}
                      {order.id !== firstPendingOrderId && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => handleOpenReorder(order)}
                        >
                          ⚡ Ir ahora
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
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
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="default" className="py-1">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completado
                        </Badge>
                        {order.payment_method && (
                          <span>Pagó: {order.payment_method}</span>
                        )}
                        {order.received_by_name && (
                          <span>• {order.received_by_name}</span>
                        )}
                      </div>
                      <ReceiptActionsMenu 
                        order={order}
                        className="w-full sm:w-auto"
                        repartidorName={repartidorName}
                      />
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link href={`/repartidor/orders/${order.route_order_id}`}>Ver Detalle</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* 🆕 Dialog "Guardar nuevo orden" - drag-and-drop batch */}
      <Dialog open={showSaveOrderDialog} onOpenChange={setShowSaveOrderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar nuevo orden de la ruta</DialogTitle>
            <DialogDescription>
              Vas a aplicar tu reordenamiento a la ruta. Indicá el motivo del cambio.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2 py-2">
            <Label htmlFor="save-order-reason">
              Motivo del cambio <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="save-order-reason"
              placeholder="Ej: Optimización de tiempos, cambio de prioridad por pedido del cliente, evitar zona con tránsito..."
              value={saveOrderReason}
              onChange={(e) => setSaveOrderReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 5 caracteres. Quedará registrado para que el administrador pueda revisar el cambio.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveOrderDialog(false)}
              disabled={isSavingOrder}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSaveOrder}
              disabled={isSavingOrder || saveOrderReason.trim().length < 5}
            >
              {isSavingOrder ? "Guardando..." : "Confirmar y guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                
                {/* 🆕 Foto de comprobante de no-entrega (opcional) */}
                <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950 border-2 border-orange-300 dark:border-orange-700 rounded-lg">
                  <Label className="font-bold text-orange-900 dark:text-orange-100">
                    📸 Foto de Comprobante (opcional)
                  </Label>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                    Toma una foto como evidencia (ej: local cerrado, dirección vacía)
                  </p>
                  <CameraCapture onCapture={handleNoDeliveryPhotoCapture} />
                  {noDeliveryPhotoPreview && (
                    <div className="space-y-3">
                      <div className="relative">
                        <img
                          src={noDeliveryPhotoPreview}
                          alt="Preview"
                          className="w-full max-w-xs mx-auto rounded-lg border-2 border-orange-500"
                        />
                        <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          ✓ Foto cargada
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNoDeliveryPhoto(null)
                          setNoDeliveryPhotoPreview(null)
                        }}
                        className="w-full"
                      >
                        Eliminar foto
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Normal delivery form
              <>
                {/* 🆕 Delivery Photo Evidence */}
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
                  <Label className="font-bold text-blue-900 dark:text-blue-100">
                    📸 Foto de Entrega <span className="font-normal text-blue-600 dark:text-blue-400">(opcional)</span>
                  </Label>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    Podés tomar una foto del pedido entregado como respaldo
                  </p>
                  <CameraCapture onCapture={handlePhotoCapture} />
                  {photoPreview && (
                    <div className="space-y-3">
                      <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                          className="w-full max-w-xs mx-auto rounded-lg border-2 border-green-500"
                        />
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          ✓ Foto cargada
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeliveryPhoto(null)
                          setPhotoPreview(null)
                        }}
                        className="w-full"
                      >
                        🔄 Cambiar foto
                      </Button>
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
                    onCheckedChange={(checked) => {
                      setWasCollected(checked as boolean)
                      if (checked && selectedOrder?.total) {
                        setPaymentLines([
                          { id: "1", method: "Efectivo", amount: selectedOrder.total.toFixed(2), transferProof: null, transferProofPreview: null }
                        ])
                      }
                    }}
                  />
                  <Label htmlFor="collected" className="font-normal">
                    Se cobró el pedido
                  </Label>
                </div>

                {wasCollected && (() => {
                  const total = selectedOrder?.total || 0
                  const debt = total - totalCollected
                  const isExact = Math.abs(debt) <= 0.01

                  return (
                    <div className="space-y-4">
                      {paymentLines.map((line, index) => (
                        <div key={line.id} className="space-y-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {paymentLines.length > 1 ? `Pago ${index + 1}` : "Pago"}
                            </Label>
                            {paymentLines.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-red-500 hover:text-red-700"
                                onClick={() => removePaymentLine(line.id)}
                              >
                                Quitar
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Método *</Label>
                              <Select
                                value={line.method}
                                onValueChange={(val) => {
                                  const updates: Partial<PaymentLineState> = { method: val as PaymentMethod }
                                  if (val !== "Transferencia") {
                                    updates.transferProof = null
                                    updates.transferProofPreview = null
                                  }
                                  updatePaymentLine(line.id, updates)
                                }}
                              >
                                <SelectTrigger className="h-9">
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
                            <div className="space-y-1">
                              <Label className="text-xs">Importe ($) *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.amount}
                                onChange={(e) => updatePaymentLine(line.id, { amount: e.target.value })}
                                className="h-9"
                              />
                            </div>
                          </div>

                          {/* Comprobante de transferencia por línea */}
                          {line.method === "Transferencia" && (
                            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg">
                              <Label className="text-xs font-bold text-blue-900 dark:text-blue-100">
                                Comprobante de Transferencia *
                              </Label>
                              {!line.transferProofPreview ? (
                                <div className="space-y-2">
                                  <label
                                    htmlFor={`transfer-proof-${line.id}`}
                                    className="flex items-center justify-center gap-2 w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors text-center text-sm font-medium"
                                  >
                                    Fotografiar Comprobante
                                  </label>
                                  <input
                                    id={`transfer-proof-${line.id}`}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        if (!file.type.startsWith('image/')) return
                                        if (file.size > 5 * 1024 * 1024) {
                                          setError("El comprobante no debe superar 5MB")
                                          return
                                        }
                                        const reader = new FileReader()
                                        reader.onload = (ev) => {
                                          updatePaymentLine(line.id, {
                                            transferProof: file,
                                            transferProofPreview: ev.target?.result as string,
                                          })
                                        }
                                        reader.readAsDataURL(file)
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <img
                                      src={line.transferProofPreview}
                                      alt="Comprobante"
                                      className="w-full max-w-[200px] mx-auto rounded-lg border-2 border-green-500"
                                    />
                                    <div className="absolute top-1 right-1 bg-green-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                      Cargado
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updatePaymentLine(line.id, { transferProof: null, transferProofPreview: null })}
                                    className="w-full text-xs"
                                  >
                                    Cambiar comprobante
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Botón agregar otro medio de pago */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPaymentLine}
                        className="w-full border-dashed"
                      >
                        + Agregar otro medio de pago
                      </Button>

                      {/* Total y comparación con pedido */}
                      <div className="space-y-1 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span>Total cobrado:</span>
                          <span className="font-bold">${totalCollected.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total del pedido: <strong>${total.toFixed(2)}</strong>
                        </p>
                        {totalCollected > 0 && (
                          <p className={`text-xs ${isExact ? "text-green-600" : "text-yellow-600"}`}>
                            {isExact ? "Cobro completo" : debt > 0 ? `Quedará deuda: $${debt.toFixed(2)}` : `Exceso: $${Math.abs(debt).toFixed(2)}`}
                          </p>
                        )}
                      </div>

                      {/* Alerta de deuda */}
                      {debt > 0 && totalCollected > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Se generará una <strong>deuda de ${debt.toFixed(2)}</strong> en la cuenta corriente del cliente.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Info si NO se marca como cobrado */}
                {!wasCollected && (
                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-300 dark:border-orange-700 rounded-lg p-3">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      ⚠️ Si no se cobró, se generará una <strong>deuda de ${(selectedOrder?.total || 0).toFixed(2)}</strong> en la cuenta corriente del cliente.
                    </p>
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

              {/* Payment Breakdown */}
              {routeSummary.paymentBreakdown && Object.keys(routeSummary.paymentBreakdown).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Detalle por Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(routeSummary.paymentBreakdown).map(([method, amount]: [string, any]) => (
                      <div key={method} className="flex justify-between text-sm">
                        <span className="capitalize">{method}</span>
                        <span className="font-medium">${Number(amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

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
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Los clientes con pagos parciales tendrán esta deuda registrada automáticamente.
                  </p>
                </div>
              )}

              {/* Detalle de Pedidos Entregados */}
              {routeSummary.deliveredOrders && routeSummary.deliveredOrders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    📦 Detalle de Entregas ({routeSummary.deliveredCount})
                  </h3>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Cliente</th>
                          <th className="text-right p-2 font-medium">Total</th>
                          <th className="text-right p-2 font-medium">Cobrado</th>
                          <th className="text-right p-2 font-medium">Deuda</th>
                        </tr>
                      </thead>
                      <tbody>
                        {routeSummary.deliveredOrders.map((order: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">
                              <div>
                                <p className="font-medium text-xs">{order.orderNumber}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">{order.customer}</p>
                              </div>
                            </td>
                            <td className="p-2 text-right text-xs">
                              ${order.orderTotal.toFixed(2)}
                            </td>
                            <td className="p-2 text-right">
                              {order.wasCollected ? (
                                <div>
                                  <span className="text-xs text-green-600 font-medium">${order.collectedAmount.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground ml-1">
                                    {order.paymentMethod === "efectivo" && "💵"}
                                    {order.paymentMethod === "Transferencia" && "🏦"}
                                    {order.paymentMethod === "tarjeta" && "💳"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              {order.debtAmount > 0 ? (
                                <span className="text-xs text-red-600 font-medium">${order.debtAmount.toFixed(2)}</span>
                              ) : (
                                <span className="text-xs text-green-600">✓</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t bg-muted/50 font-bold">
                        <tr>
                          <td className="p-2 text-xs">TOTALES</td>
                          <td className="p-2 text-right text-xs">${routeSummary.totalExpected.toFixed(2)}</td>
                          <td className="p-2 text-right text-xs text-green-600">${routeSummary.totalCollected.toFixed(2)}</td>
                          <td className="p-2 text-right text-xs text-red-600">
                            {routeSummary.difference > 0 ? `$${routeSummary.difference.toFixed(2)}` : "✓"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
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

      {/* 🆕 Dialog "Ir ahora" - reordenar stop con motivo */}
      <Dialog open={showReorderDialog} onOpenChange={setShowReorderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar orden de la ruta</DialogTitle>
            <DialogDescription>
              {reorderTargetOrder && (
                <>
                  Vas a entregar primero <strong>{reorderTargetOrder.order_number}</strong> —{" "}
                  {reorderTargetOrder.customers?.commercial_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2 py-2">
            <Label htmlFor="reorder-reason">
              Motivo del cambio <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reorder-reason"
              placeholder="Ej: Cliente anterior cerrado, calle cortada, cliente urgente avisó..."
              value={reorderReason}
              onChange={(e) => setReorderReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 5 caracteres. Quedará registrado para que el administrador pueda revisar el cambio.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReorderDialog(false)}
              disabled={isReordering}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReorder}
              disabled={isReordering || reorderReason.trim().length < 5}
            >
              {isReordering ? "Reordenando..." : "Confirmar y reordenar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

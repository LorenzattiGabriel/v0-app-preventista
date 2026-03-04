"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ShortageReason } from "@/lib/types/database"
import { ArrowLeft, AlertTriangle, CheckCircle, Package, MessageCircle, Download } from "lucide-react"
import Link from "next/link"
import { downloadAssemblyReceipt } from "@/lib/receipt-generator"
import { createAccountMovementsService } from "@/lib/services/accountMovementsService"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AssemblyItem {
  id: string
  productId: string
  productName: string
  quantityRequested: number
  quantityAssembled: number
  isShortage: boolean
  shortageReason?: ShortageReason
  shortageNotes?: string
  isSubstituted: boolean
  substitutedProductId?: string
  unitPrice: number
  discount: number
  allowsDecimalQuantity: boolean
  unitOfMeasure: string
}

interface AssemblyFormProps {
  order: any
  products: any[]
  userId: string
  isLocked: boolean
  lockedByUser?: { full_name: string; email: string } | null
}

export function AssemblyForm({ order, products, userId, isLocked, lockedByUser }: AssemblyFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [assembledOrder, setAssembledOrder] = useState<any>(null)

  // 🆕 Enviar comprobante de armado por WhatsApp (solo mensaje)
  const handleSendWhatsAppAssembly = () => {
    const phone = order.customers?.phone?.replace(/\D/g, '') || ''
    const customerName = order.customers?.commercial_name || order.customers?.name || 'Cliente'
    const message = `Hola ${customerName}, le informamos que su pedido #${order.order_number} ha sido armado y está listo para ser despachado. ¡Gracias por su compra!`
    
    const url = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    
    window.open(url, '_blank')
  }

  // 🆕 Descargar PDF
  const handleDownloadPDF = () => {
    downloadAssemblyReceipt(order)
  }

  // Initialize assembly items from order items
  const [assemblyItems, setAssemblyItems] = useState<AssemblyItem[]>(
    order.order_items.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: `${item.products.name} ${item.products.brand ? `- ${item.products.brand}` : ""}`,
      quantityRequested: item.quantity_requested,
      quantityAssembled: item.quantity_assembled || item.quantity_requested,
      isShortage: item.is_shortage || false,
      shortageReason: item.shortage_reason,
      shortageNotes: item.shortage_notes || "",
      isSubstituted: item.is_substituted || false,
      substitutedProductId: item.substituted_product_id,
      unitPrice: item.unit_price,
      discount: item.discount,
      allowsDecimalQuantity: item.products.allows_decimal_quantity || false,
      unitOfMeasure: item.products.unit_of_measure || "unidad",
    })),
  )

  const [assemblyNotes, setAssemblyNotes] = useState(order.assembly_notes || "")
  const [startTime] = useState(order.assembly_started_at || new Date().toISOString())

  // 🆕 CRITICAL-2: Release order function
  const handleReleaseOrder = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Change status back to PENDIENTE_ARMADO and clear assembled_by
      const { error: releaseError } = await supabase
        .from("orders")
        .update({
          status: "PENDIENTE_ARMADO",
          assembled_by: null,
          assembly_started_at: null,
        })
        .eq("id", order.id)

      if (releaseError) throw releaseError

      // Create history entry
      await supabase.from("order_history").insert({
        order_id: order.id,
        previous_status: "EN_ARMADO",
        new_status: "PENDIENTE_ARMADO",
        changed_by: userId,
        change_reason: "Pedido liberado por el armador",
      })

      router.push("/armado/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error releasing order:", err)
      setError(err instanceof Error ? err.message : "Error al liberar el pedido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof AssemblyItem, value: any) => {
    const newItems = [...assemblyItems]
    newItems[index] = { ...newItems[index], [field]: value }

    // If marking as shortage, set assembled quantity to what was assembled
    if (field === "isShortage" && value === true) {
      const quantityShortage = newItems[index].quantityRequested - newItems[index].quantityAssembled
      if (quantityShortage > 0 && newItems[index].quantityAssembled === newItems[index].quantityRequested) {
        newItems[index].quantityAssembled = 0
      }
    }

    // If unmarking shortage, reset to requested quantity
    if (field === "isShortage" && value === false) {
      newItems[index].quantityAssembled = newItems[index].quantityRequested
      newItems[index].shortageReason = undefined
      newItems[index].shortageNotes = ""
    }

    setAssemblyItems(newItems)
  }

  const calculateTotals = () => {
    const originalTotal = order.total
    const newSubtotal = assemblyItems.reduce((sum, item) => {
      const itemSubtotal = item.quantityAssembled * item.unitPrice - item.discount
      return sum + itemSubtotal
    }, 0)
    const newTotal = newSubtotal - order.general_discount
    const difference = originalTotal - newTotal

    return { originalTotal, newTotal, difference, hasShortages: assemblyItems.some((item) => item.isShortage) }
  }

  const handleStartAssembly = async () => {
    if (order.status === "PENDIENTE_ARMADO") {
      setIsLoading(true)
      try {
        const supabase = createClient()
        await supabase
          .from("orders")
          .update({
            status: "EN_ARMADO",
            assembly_started_at: startTime,
          })
          .eq("id", order.id)

        await supabase.from("order_history").insert({
          order_id: order.id,
          previous_status: "PENDIENTE_ARMADO",
          new_status: "EN_ARMADO",
          changed_by: userId,
          change_reason: "Inicio de armado",
        })

        router.refresh()
      } catch (err) {
        console.error("[v0] Error starting assembly:", err)
        setError("Error al iniciar el armado")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleConfirmAssembly = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { newTotal, hasShortages } = calculateTotals()

      // Check if all items have shortage
      const allShortage = assemblyItems.every((item) => item.quantityAssembled === 0)
      if (allShortage) {
        setError("No se puede confirmar un pedido sin ningún producto armado")
        setIsLoading(false)
        return
      }

      // Update order
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "PENDIENTE_ENTREGA",
          total: newTotal,
          has_shortages: hasShortages,
          assembled_by: userId,
          assembly_completed_at: new Date().toISOString(),
          assembly_notes: assemblyNotes,
        })
        .eq("id", order.id)

      if (orderError) throw orderError

      // Update order items and product stock
      for (const item of assemblyItems) {
        const { error: itemError } = await supabase
          .from("order_items")
          .update({
            quantity_assembled: item.quantityAssembled,
            is_shortage: item.isShortage,
            shortage_reason: item.shortageReason,
            shortage_notes: item.shortageNotes,
            is_substituted: item.isSubstituted,
            substituted_product_id: item.substitutedProductId,
          })
          .eq("id", item.id)

        if (itemError) throw itemError

        // Update product stock - decrease by assembled quantity
        if (item.quantityAssembled > 0) {
          const productIdToUpdate = item.isSubstituted && item.substitutedProductId 
            ? item.substitutedProductId 
            : item.productId

          // Get current stock
          const { data: product, error: productFetchError } = await supabase
            .from("products")
            .select("current_stock")
            .eq("id", productIdToUpdate)
            .single()

          if (productFetchError) {
            console.error("Error fetching product stock:", productFetchError)
            continue // Don't fail the whole operation if stock update fails
          }

          // Update stock
          const newStock = Math.max(0, (product?.current_stock || 0) - item.quantityAssembled)
          const { error: stockError } = await supabase
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", productIdToUpdate)

          if (stockError) {
            console.error("Error updating product stock:", stockError)
            // Don't fail the whole operation if stock update fails
          }
        }
      }

      // Create order history entry
      await supabase.from("order_history").insert({
        order_id: order.id,
        previous_status: "EN_ARMADO",
        new_status: "PENDIENTE_ENTREGA",
        changed_by: userId,
        change_reason: hasShortages ? "Armado completado con faltantes" : "Armado completado",
      })

      // 🆕 Generar deuda en cuenta corriente del cliente
      try {
        const accountService = createAccountMovementsService(supabase)
        await accountService.recordOrderAssembled(order.id, newTotal, userId)
        console.log(`✅ Deuda registrada para pedido ${order.order_number}: $${newTotal}`)
      } catch (debtError) {
        console.error("Error al registrar deuda en cuenta corriente:", debtError)
        // No fallar toda la operación si falla el registro de deuda
      }

      // 🆕 Mostrar diálogo de éxito con opción de compartir
      setAssembledOrder({
        ...order,
        total: newTotal,
        hasShortages,
      })
      setShowConfirmDialog(false)
      setShowSuccessDialog(true)
    } catch (err) {
      console.error("[v0] Error confirming assembly:", err)
      setError(err instanceof Error ? err.message : "Error al confirmar el armado")
      setShowConfirmDialog(false)
    } finally {
      setIsLoading(false)
    }
  }

  const { originalTotal, newTotal, difference, hasShortages } = calculateTotals()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/armado/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>

        <div className="flex gap-2">
          {/* 🆕 CRITICAL-2: Release Order Button */}
          {order.status === "EN_ARMADO" && order.assembled_by === userId && (
            <Button variant="outline" onClick={handleReleaseOrder} disabled={isLoading}>
              <Package className="mr-2 h-4 w-4" />
              Liberar Pedido
            </Button>
          )}

          {order.status === "PENDIENTE_ARMADO" && (
            <Button onClick={handleStartAssembly} disabled={isLoading || isLocked}>
              <Package className="mr-2 h-4 w-4" />
              Iniciar Armado
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">{error}</div>
      )}

      {/* 🆕 CRITICAL-1b: Show locked message */}
      {isLocked && lockedByUser && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Pedido en armado por otro usuario</p>
              <p className="text-sm mt-1">
                Este pedido está siendo armado por <strong>{lockedByUser.full_name}</strong> ({lockedByUser.email}).
                No puedes modificarlo hasta que lo libere.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedido {order.order_number}</CardTitle>
              <CardDescription>
                Cliente: {order.customers.commercial_name} | Entrega:{" "}
                {new Date(order.delivery_date).toLocaleDateString("es-AR")}
              </CardDescription>
            </div>
            <Badge variant={order.priority === "urgente" || order.priority === "alta" ? "destructive" : "default"}>
              {order.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Dirección:</span>
              <p className="text-muted-foreground">
                {order.customers.street} {order.customers.street_number}
                {order.customers.floor_apt && `, ${order.customers.floor_apt}`}
              </p>
            </div>
            <div>
              <span className="font-medium">Localidad:</span>
              <p className="text-muted-foreground">
                {order.customers.locality}, {order.customers.province}
              </p>
            </div>
            {order.observations && (
              <div className="col-span-2">
                <span className="font-medium">Observaciones del preventista:</span>
                <p className="text-muted-foreground">{order.observations}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos a Armar</CardTitle>
          <CardDescription>Verifica cada producto y marca los faltantes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assemblyItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="font-medium">No se encontraron productos para este pedido</p>
              <p className="text-sm">Los items del pedido pueden no estar cargados correctamente en la base de datos.</p>
            </div>
          )}
          {assemblyItems.map((item, index) => {
            const isWeightBased = item.allowsDecimalQuantity
            const qtyDiff = item.quantityAssembled - item.quantityRequested
            const projectedSubtotal = item.quantityRequested * item.unitPrice - item.discount
            const realSubtotal = item.quantityAssembled * item.unitPrice - item.discount
            const subtotalDiff = realSubtotal - projectedSubtotal

            return (
            <div key={item.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">
                    {item.productName}
                    {isWeightBased && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {item.unitOfMeasure}
                      </Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Solicitado: {Number.isInteger(item.quantityRequested) ? item.quantityRequested : item.quantityRequested.toFixed(2)}
                    {isWeightBased ? ` ${item.unitOfMeasure}` : ""} | Precio: ${item.unitPrice.toFixed(2)}
                    {isWeightBased ? `/${item.unitOfMeasure}` : ""}
                  </p>
                </div>
                {item.isShortage && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Faltante
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`quantity-${index}`}>
                    {isWeightBased ? `Peso Real (${item.unitOfMeasure})` : "Cantidad Armada"}
                  </Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min={isWeightBased ? "0.001" : "0"}
                    step={isWeightBased ? "0.01" : "1"}
                    value={item.quantityAssembled || ""}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === "" || raw === "0.") {
                        handleItemChange(index, "quantityAssembled", 0)
                        return
                      }
                      const value = Number.parseFloat(raw)
                      if (isNaN(value)) return
                      handleItemChange(
                        index,
                        "quantityAssembled",
                        isWeightBased ? (value >= 0 ? value : 0) : (Math.round(value) || 0)
                      )
                    }}
                    disabled={isLocked}
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`shortage-${index}`}
                      checked={item.isShortage}
                      onCheckedChange={(checked) => handleItemChange(index, "isShortage", checked)}
                      disabled={isLocked}
                    />
                    <Label htmlFor={`shortage-${index}`} className="font-normal">
                      Marcar como faltante
                    </Label>
                  </div>
                </div>
              </div>

              {/* Diferencia peso/cantidad para productos pesables */}
              {isWeightBased && item.quantityAssembled > 0 && Math.abs(qtyDiff) > 0.001 && (
                <div className={`text-xs p-2 rounded-md ${
                  qtyDiff > 0
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                }`}>
                  <div className="flex justify-between">
                    <span>
                      Pedido: {item.quantityRequested.toFixed(2)} {item.unitOfMeasure} → Pesado: {item.quantityAssembled.toFixed(2)} {item.unitOfMeasure}
                      <strong className="ml-1">
                        ({qtyDiff > 0 ? "+" : ""}{qtyDiff.toFixed(3)} {item.unitOfMeasure})
                      </strong>
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>
                      Proyectado: ${projectedSubtotal.toFixed(2)} → Real: ${realSubtotal.toFixed(2)}
                      <strong className="ml-1">
                        ({subtotalDiff > 0 ? "+" : ""}${subtotalDiff.toFixed(2)})
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {item.isShortage && (
                <div className="space-y-4 bg-muted/50 p-4 rounded-md">
                  <div className="space-y-2">
                    <Label htmlFor={`reason-${index}`}>Motivo del Faltante</Label>
                    <Select
                      value={item.shortageReason}
                      onValueChange={(value) =>
                        handleItemChange(index, "shortageReason", value as ShortageReason)
                      }
                      disabled={isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_stock">Sin Stock</SelectItem>
                        <SelectItem value="producto_danado">Producto Dañado</SelectItem>
                        <SelectItem value="producto_discontinuado">Producto Discontinuado</SelectItem>
                        <SelectItem value="error_pedido">Error en Pedido</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`notes-${index}`}>Notas del Faltante</Label>
                    <Textarea
                      id={`notes-${index}`}
                      placeholder="Detalles adicionales..."
                      value={item.shortageNotes}
                      onChange={(e) => handleItemChange(index, "shortageNotes", e.target.value)}
                      rows={2}
                      disabled={isLocked}
                    />
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas de Armado</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Observaciones generales del armado..."
            value={assemblyNotes}
            onChange={(e) => setAssemblyNotes(e.target.value)}
            rows={3}
            disabled={isLocked}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del Armado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Original:</span>
              <span className="font-medium">${originalTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Armado:</span>
              <span className="font-medium">${newTotal.toFixed(2)}</span>
            </div>
            {difference > 0 && (
              <div className="flex justify-between text-sm">
                <span>Diferencia:</span>
                <span className="font-medium text-destructive">-${difference.toFixed(2)}</span>
              </div>
            )}
          </div>

          {hasShortages && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Este pedido tiene productos faltantes</span>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.push("/armado/dashboard")}
              disabled={isLoading || isLocked}
            >
              Pausar Armado
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isLoading || isLocked}
              size="lg"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar Armado
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Armado</AlertDialogTitle>
            <AlertDialogDescription>
              {hasShortages ? (
                <div className="space-y-2">
                  <span className="block">Este pedido tiene productos faltantes. ¿Está seguro de confirmar el armado?</span>
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                    <span className="font-medium block">Diferencia en total: ${difference.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <>¿Está seguro de confirmar el armado de este pedido? El pedido pasará a estado PENDIENTE_ENTREGA.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAssembly}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🆕 Diálogo de éxito con opción de compartir */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <AlertDialogTitle className="text-center">¡Pedido Armado!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="block mb-2">
                El pedido <strong>#{order.order_number}</strong> ha sido armado correctamente.
              </span>
              {assembledOrder?.hasShortages && (
                <span className="block text-amber-600 dark:text-amber-400 text-sm">
                  ⚠️ El pedido tiene productos faltantes
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-center text-muted-foreground">
              ¿Desea notificar al cliente?
            </p>
            
            <div className="flex flex-col gap-2">
              {/* Descargar PDF */}
              <Button
                onClick={handleDownloadPDF}
                className="w-full"
                variant="default"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Comprobante PDF
              </Button>
              
              {/* WhatsApp con mensaje */}
              <Button
                onClick={handleSendWhatsAppAssembly}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar Mensaje WhatsApp
                {order.customers?.phone && (
                  <span className="ml-2 text-xs opacity-75">({order.customers.phone})</span>
                )}
              </Button>
            </div>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction 
              onClick={() => {
                setShowSuccessDialog(false)
                router.push("/armado/dashboard")
                router.refresh()
              }}
              className="w-full sm:w-auto"
            >
              Volver al Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

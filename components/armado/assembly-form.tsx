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
import { ArrowLeft, AlertTriangle, CheckCircle, Package } from "lucide-react"
import Link from "next/link"
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
}

interface AssemblyFormProps {
  order: any
  products: any[]
  userId: string
  isLocked: boolean
}

export function AssemblyForm({ order, products, userId, isLocked }: AssemblyFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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
    })),
  )

  const [assemblyNotes, setAssemblyNotes] = useState(order.assembly_notes || "")
  const [startTime] = useState(order.assembly_started_at || new Date().toISOString())



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

      // Update order items
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
      }

      // Create order history entry
      await supabase.from("order_history").insert({
        order_id: order.id,
        previous_status: "EN_ARMADO",
        new_status: "PENDIENTE_ENTREGA",
        changed_by: userId,
        change_reason: hasShortages ? "Armado completado con faltantes" : "Armado completado",
      })

      router.push("/armado/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error confirming assembly:", err)
      setError(err instanceof Error ? err.message : "Error al confirmar el armado")
    } finally {
      setIsLoading(false)
      setShowConfirmDialog(false)
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

        {order.status === "PENDIENTE_ARMADO" && (
          <Button onClick={handleStartAssembly} disabled={isLoading || isLocked}>
            <Package className="mr-2 h-4 w-4" />
            Iniciar Armado
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
          {assemblyItems.map((item, index) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{item.productName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Solicitado: {item.quantityRequested} | Precio: ${item.unitPrice.toFixed(2)}
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
                  <Label htmlFor={`quantity-${index}`}>Cantidad Armada</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="0"
                    max={item.quantityRequested}
                    value={item.quantityAssembled}
                    onChange={(e) =>
                      handleItemChange(index, "quantityAssembled", Number.parseInt(e.target.value) || 0)
                    }
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
          ))}
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
    </div>
  )
}

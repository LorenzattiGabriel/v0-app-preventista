"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import type { OrderPriority, OrderStatus } from "@/lib/types/database"

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Campos editables
  const [deliveryDate, setDeliveryDate] = useState("")
  const [priority, setPriority] = useState<OrderPriority>("normal")
  const [status, setStatus] = useState<OrderStatus>("PENDIENTE_ARMADO")
  const [observations, setObservations] = useState("")

  // Datos de solo lectura
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers (id, commercial_name, code)
        `)
        .eq("id", orderId)
        .single()

      if (error) {
        setError("Error al cargar el pedido")
        setIsLoading(false)
        return
      }

      setOrder(data)
      setDeliveryDate(data.delivery_date)
      setPriority(data.priority)
      setStatus(data.status)
      setObservations(data.observations || "")
      setIsLoading(false)
    }

    fetchOrder()
  }, [orderId])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          delivery_date: deliveryDate,
          priority,
          status,
          observations: observations || null,
        })
        .eq("id", orderId)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push(`/admin/orders/${orderId}`)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Pedido no encontrado</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/orders/${orderId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Pedido</h1>
          <p className="text-muted-foreground">{order.order_number}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-green-700 dark:text-green-300">
            ✅ Pedido actualizado correctamente
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información del Pedido</CardTitle>
          <CardDescription>
            Cliente: {order.customers?.commercial_name} ({order.customers?.code})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">
              Fecha de Entrega <span className="text-destructive">*</span>
            </Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as OrderPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">🟢 Baja</SelectItem>
                  <SelectItem value="normal">🟡 Normal</SelectItem>
                  <SelectItem value="media">🟠 Media</SelectItem>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="urgente">🚨 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="PENDIENTE_ARMADO">Pendiente Armado</SelectItem>
                  <SelectItem value="EN_ARMADO">En Armado</SelectItem>
                  <SelectItem value="PENDIENTE_ENTREGA">Pendiente Entrega</SelectItem>
                  <SelectItem value="EN_REPARTICION">En Repartición</SelectItem>
                  <SelectItem value="ENTREGADO">Entregado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              placeholder="Notas adicionales..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" asChild>
              <Link href={`/admin/orders/${orderId}`}>Cancelar</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}





"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, History, AlertTriangle } from "lucide-react"
import type { DelayedOrder, OrderDateChange } from "@/lib/types/database"

interface RescheduleOrderDialogProps {
  order: DelayedOrder
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RescheduleOrderDialog({
  order,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleOrderDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDate, setNewDate] = useState("")
  const [reason, setReason] = useState("")
  const [increasePriority, setIncreasePriority] = useState(false)
  const [history, setHistory] = useState<OrderDateChange[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  // Cargar historial al abrir
  useEffect(() => {
    if (open && order.id) {
      loadHistory()
      // Preseleccionar fecha de mañana
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setNewDate(tomorrow.toISOString().split("T")[0])
    }
  }, [open, order.id])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/reschedule`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data.data || [])
      }
    } catch (err) {
      console.error("Error loading history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSubmit = async () => {
    if (!newDate) {
      setError("Selecciona una nueva fecha de entrega")
      return
    }
    if (!reason.trim()) {
      setError("El motivo del cambio es requerido")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_delivery_date: newDate,
          reason: reason.trim(),
          increase_priority: increasePriority,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al reprogramar pedido")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setReason("")
    setIncreasePriority(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reprogramar Pedido #{order.order_number}
          </DialogTitle>
          <DialogDescription>
            Asigna una nueva fecha de entrega para este pedido retrasado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info del pedido */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fecha original:</span>
              <span className="font-medium">
                {new Date(order.delivery_date).toLocaleDateString("es-AR")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Días de retraso:</span>
              <Badge
                variant="destructive"
                className={
                  order.delay_severity === "critical"
                    ? "bg-red-500"
                    : order.delay_severity === "warning"
                    ? "bg-orange-500"
                    : "bg-yellow-500"
                }
              >
                {order.days_delayed} días
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="font-medium">
                ${order.total.toLocaleString("es-AR")}
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Nueva fecha */}
          <div className="space-y-2">
            <Label htmlFor="newDate">Nueva fecha de entrega *</Label>
            <Input
              id="newDate"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={today}
            />
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del cambio *</Label>
            <Textarea
              id="reason"
              placeholder="Ej: Cliente no disponible, problema de stock, reorganización de rutas..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Aumentar prioridad */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="increasePriority"
              checked={increasePriority}
              onCheckedChange={(checked) => setIncreasePriority(checked as boolean)}
            />
            <Label htmlFor="increasePriority" className="text-sm cursor-pointer">
              Aumentar prioridad automáticamente
              <span className="text-muted-foreground ml-1">
                (Actual: {order.priority})
              </span>
            </Label>
          </div>

          {/* Historial */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial de reprogramaciones
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="text-xs bg-muted/30 p-2 rounded"
                  >
                    <div className="flex justify-between">
                      <span>
                        {entry.previous_delivery_date &&
                          new Date(entry.previous_delivery_date).toLocaleDateString("es-AR")}{" "}
                        →{" "}
                        {entry.new_delivery_date &&
                          new Date(entry.new_delivery_date).toLocaleDateString("es-AR")}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                    {entry.change_reason && (
                      <div className="text-muted-foreground mt-1">
                        {entry.change_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reprogramar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




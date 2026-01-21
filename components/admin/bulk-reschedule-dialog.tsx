"use client"

import { useState } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react"

interface BulkRescheduleDialogProps {
  orderIds: string[]
  orderCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BulkRescheduleDialog({
  orderIds,
  orderCount,
  open,
  onOpenChange,
  onSuccess,
}: BulkRescheduleDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [newDate, setNewDate] = useState("")
  const [reason, setReason] = useState("")
  const [increasePriority, setIncreasePriority] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  // Reset al abrir
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setError(null)
      setSuccess(false)
      setReason("")
      setIncreasePriority(false)
      // Preseleccionar fecha de mañana
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setNewDate(tomorrow.toISOString().split("T")[0])
    }
    onOpenChange(isOpen)
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
      const response = await fetch("/api/admin/orders/reschedule-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_ids: orderIds,
          new_delivery_date: newDate,
          reason: reason.trim(),
          increase_priority: increasePriority,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al reprogramar pedidos")
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reprogramar {orderCount} Pedidos
          </DialogTitle>
          <DialogDescription>
            Asigna una nueva fecha de entrega para todos los pedidos seleccionados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-green-700">
                ¡Pedidos reprogramados!
              </h3>
              <p className="text-muted-foreground">
                {orderCount} pedidos fueron actualizados exitosamente
              </p>
            </div>
          ) : (
            <>
              {/* Resumen */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta acción reprogramará <strong>{orderCount} pedidos</strong> a la
                  misma fecha. Se registrará en el historial de cada uno.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Nueva fecha */}
              <div className="space-y-2">
                <Label htmlFor="bulkNewDate">Nueva fecha de entrega *</Label>
                <Input
                  id="bulkNewDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={today}
                />
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label htmlFor="bulkReason">Motivo del cambio *</Label>
                <Textarea
                  id="bulkReason"
                  placeholder="Ej: Reorganización de rutas, problemas logísticos..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Aumentar prioridad */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulkIncreasePriority"
                  checked={increasePriority}
                  onCheckedChange={(checked) =>
                    setIncreasePriority(checked as boolean)
                  }
                />
                <Label htmlFor="bulkIncreasePriority" className="text-sm cursor-pointer">
                  Aumentar prioridad de todos los pedidos
                </Label>
              </div>
            </>
          )}
        </div>

        {!success && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reprogramar {orderCount} pedidos
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}





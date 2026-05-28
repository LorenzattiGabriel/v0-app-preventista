"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
import { PAYMENT_METHODS, type PaymentLine, type PaymentMethod } from "@/lib/types/database"

interface EditPaymentMethodDialogProps {
  orderId: string
  orderNumber: string
  amountPaid: number
  paymentMethod: string | null
  paymentMethodsJson: PaymentLine[] | null
}

interface LineState {
  id: string
  method: PaymentMethod
  amount: string
}

export function EditPaymentMethodDialog({
  orderId,
  orderNumber,
  amountPaid,
  paymentMethod,
  paymentMethodsJson,
}: EditPaymentMethodDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildInitialLines = (): LineState[] => {
    if (Array.isArray(paymentMethodsJson) && paymentMethodsJson.length > 0) {
      return paymentMethodsJson.map((p, i) => ({
        id: `${i}`,
        method: p.method,
        amount: Number(p.amount || 0).toFixed(2),
      }))
    }
    return [
      {
        id: "0",
        method: (paymentMethod as PaymentMethod) || "Efectivo",
        amount: amountPaid.toFixed(2),
      },
    ]
  }

  const [lines, setLines] = useState<LineState[]>(buildInitialLines())

  const resetAndOpen = (next: boolean) => {
    if (next) {
      setLines(buildInitialLines())
      setError(null)
    }
    setOpen(next)
  }

  const totalLines = lines.reduce((sum, l) => sum + (Number.parseFloat(l.amount) || 0), 0)
  const diff = totalLines - amountPaid
  const isBalanced = Math.abs(diff) <= 0.01

  const updateLine = (id: string, updates: Partial<LineState>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, { id: Date.now().toString(), method: "Efectivo", amount: "" }])
  }

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const handleSubmit = async () => {
    if (!isBalanced) {
      setError(`El total debe ser igual al monto cobrado ($${amountPaid.toFixed(2)})`)
      return
    }
    for (const l of lines) {
      if ((Number.parseFloat(l.amount) || 0) <= 0) {
        setError("Cada forma de pago debe tener un importe mayor a $0")
        return
      }
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ method: l.method, amount: Number.parseFloat(l.amount) || 0 })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al actualizar la forma de pago")
        return
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error("Error updating payment method:", err)
      setError("Error al actualizar la forma de pago")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndOpen}>
      <Button variant="outline" size="sm" onClick={() => resetAndOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar forma de pago
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar forma de pago</DialogTitle>
          <DialogDescription>
            Pedido {orderNumber}. Solo se corrige el método de pago, el monto cobrado no cambia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {lines.map((line, index) => (
            <div key={line.id} className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {lines.length > 1 ? `Pago ${index + 1}` : "Pago"}
                </Label>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-red-500 hover:text-red-700"
                    onClick={() => removeLine(line.id)}
                  >
                    Quitar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Método</Label>
                  <Select
                    value={line.method}
                    onValueChange={(val) => updateLine(line.id, { method: val as PaymentMethod })}
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
                  <Label className="text-xs">Importe ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.amount}
                    onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-full border-dashed">
            + Agregar otro medio de pago
          </Button>

          <div className="space-y-1 pt-2 border-t text-sm">
            <div className="flex justify-between">
              <span>Total formas de pago:</span>
              <span className="font-bold">${totalLines.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Monto cobrado (fijo):</span>
              <span>${amountPaid.toFixed(2)}</span>
            </div>
            {!isBalanced && (
              <p className="text-xs text-red-600">
                {diff > 0
                  ? `Te sobran $${diff.toFixed(2)}`
                  : `Te faltan $${Math.abs(diff).toFixed(2)}`}{" "}
                — el total debe coincidir con el monto cobrado.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isBalanced}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

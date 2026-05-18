"use client"

// Selector de métodos de pago con soporte split.
// Componente compartible: se usa en venta directa y se puede migrar
// el de repartidor a este mismo en el futuro.

import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { PAYMENT_METHODS, type PaymentLine, type PaymentMethod } from "@/lib/types/database"
import { toNum } from "@/lib/utils/cart-calculations"

interface PaymentMethodsInputProps {
  value: PaymentLine[]
  onChange: (lines: PaymentLine[]) => void
  expectedTotal: number
  disabled?: boolean
}

export function PaymentMethodsInput({
  value,
  onChange,
  expectedTotal,
  disabled,
}: PaymentMethodsInputProps) {
  const baseId = useId()

  const addLine = () => {
    const used = toNum(value.reduce((s, l) => s + toNum(l.amount), 0))
    const remaining = Math.max(0, expectedTotal - used)
    onChange([...value, { method: "Efectivo", amount: remaining }])
  }

  const removeLine = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, patch: Partial<PaymentLine>) => {
    onChange(value.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const totalPaid = value.reduce((s, l) => s + toNum(l.amount), 0)
  const diff = totalPaid - expectedTotal

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Método de pago</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLine}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Agregá al menos un método de pago para confirmar la venta.
        </p>
      )}

      <div className="space-y-2">
        {value.map((line, idx) => (
          <div
            key={`${baseId}-${idx}`}
            className="flex items-end gap-2 rounded-md border bg-card p-3"
          >
            <div className="flex-1">
              <Label htmlFor={`${baseId}-method-${idx}`} className="text-xs">
                Método
              </Label>
              <Select
                value={line.method}
                onValueChange={(v) =>
                  updateLine(idx, { method: v as PaymentMethod })
                }
                disabled={disabled}
              >
                <SelectTrigger id={`${baseId}-method-${idx}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label htmlFor={`${baseId}-amount-${idx}`} className="text-xs">
                Monto
              </Label>
              <Input
                id={`${baseId}-amount-${idx}`}
                type="number"
                step="0.01"
                min="0"
                value={line.amount}
                onChange={(e) =>
                  updateLine(idx, { amount: toNum(e.target.value) })
                }
                disabled={disabled}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLine(idx)}
              disabled={disabled}
              aria-label="Eliminar método"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <div className="flex justify-between">
            <span>Total esperado:</span>
            <span className="font-medium">
              ${expectedTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total pagos:</span>
            <span className="font-medium">
              ${totalPaid.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          {Math.abs(diff) > 0.01 && (
            <div
              className={`mt-1 font-medium ${
                diff > 0 ? "text-orange-600" : "text-red-600"
              }`}
            >
              {diff > 0
                ? `Sobra: $${diff.toLocaleString("es-AR", { minimumFractionDigits: 2 })} (vuelto)`
                : `Falta: $${Math.abs(diff).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

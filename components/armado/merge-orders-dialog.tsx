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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Merge, AlertTriangle, Package, Calendar, ArrowRight } from "lucide-react"
import type { MergeableGroup } from "@/lib/utils/mergeable-orders"

interface MergeOrdersDialogProps {
  group: MergeableGroup
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PRIORITY_LABELS: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  normal: "Normal",
  baja: "Baja",
}

const PRIORITY_COLORS: Record<string, string> = {
  urgente: "bg-red-500",
  alta: "bg-orange-500",
  media: "bg-yellow-500",
  normal: "bg-blue-500",
  baja: "bg-gray-500",
}

export function MergeOrdersDialog({
  group,
  open,
  onOpenChange,
  onSuccess,
}: MergeOrdersDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const survivingOrder = group.orders[0] // Oldest order survives
  const absorbedOrders = group.orders.slice(1)
  const totalAmount = group.orders.reduce((sum, o) => sum + o.total, 0)

  // Detect conflicts
  const uniquePriorities = new Set(group.orders.map((o) => o.priority))
  const uniqueDates = new Set(group.orders.map((o) => o.delivery_date))
  const hasConflicts = uniquePriorities.size > 1 || uniqueDates.size > 1

  // Resolved values
  const PRIORITY_ORDER: Record<string, number> = {
    urgente: 5, alta: 4, media: 3, normal: 2, baja: 1,
  }
  const resolvedPriority = group.orders.reduce((best, o) => {
    return (PRIORITY_ORDER[o.priority] || 0) > (PRIORITY_ORDER[best] || 0)
      ? o.priority
      : best
  }, group.orders[0].priority)

  const resolvedDate = group.orders.reduce((earliest, o) => {
    return o.delivery_date < earliest ? o.delivery_date : earliest
  }, group.orders[0].delivery_date)

  const handleMerge = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/orders/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_ids: group.orders.map((o) => o.id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al fusionar pedidos")
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
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Fusionar Pedidos - {group.customer_name}
          </DialogTitle>
          <DialogDescription>
            Se fusionarán {group.orders.length} pedidos en uno solo. Los items
            del mismo producto se sumarán.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Pedidos a fusionar */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Pedidos a fusionar:</p>
            {group.orders.map((order, index) => (
              <div
                key={order.id}
                className={`p-3 rounded-lg border ${
                  index === 0
                    ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                    : "border-muted bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-sm">
                      {order.order_number}
                    </span>
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-700 dark:text-green-400">
                        Sobrevive
                      </Badge>
                    )}
                  </div>
                  <span className="font-medium">
                    ${order.total.toLocaleString("es-AR")}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(order.delivery_date).toLocaleDateString("es-AR")}
                  </span>
                  <Badge
                    className={`text-xs text-white ${PRIORITY_COLORS[order.priority] || "bg-gray-500"}`}
                  >
                    {PRIORITY_LABELS[order.priority] || order.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Conflictos / Preview resultado */}
          {hasConflicts && (
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                <p className="font-medium mb-1">Conflictos detectados:</p>
                <ul className="text-xs space-y-1">
                  {uniquePriorities.size > 1 && (
                    <li>
                      Prioridades distintas → Se usará la más alta:{" "}
                      <strong>{PRIORITY_LABELS[resolvedPriority]}</strong>
                    </li>
                  )}
                  {uniqueDates.size > 1 && (
                    <li>
                      Fechas distintas → Se usará la más temprana:{" "}
                      <strong>
                        {new Date(resolvedDate).toLocaleDateString("es-AR")}
                      </strong>
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview resultado */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2 border">
            <p className="text-sm font-medium flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Resultado de la fusión:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Pedido:</span>
              <span className="font-medium">{survivingOrder.order_number}</span>
              <span className="text-muted-foreground">Total estimado:</span>
              <span className="font-medium">
                ${totalAmount.toLocaleString("es-AR")}
              </span>
              <span className="text-muted-foreground">Prioridad:</span>
              <Badge
                className={`w-fit text-xs text-white ${PRIORITY_COLORS[resolvedPriority]}`}
              >
                {PRIORITY_LABELS[resolvedPriority]}
              </Badge>
              <span className="text-muted-foreground">Fecha entrega:</span>
              <span className="font-medium">
                {new Date(resolvedDate).toLocaleDateString("es-AR")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Los pedidos {absorbedOrders.map((o) => o.order_number).join(", ")}{" "}
              serán cancelados con referencia a la fusión.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Merge className="h-4 w-4 mr-2" />
            Fusionar {group.orders.length} pedidos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

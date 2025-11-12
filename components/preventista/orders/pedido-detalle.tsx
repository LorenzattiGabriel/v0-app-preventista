"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type OrderDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pedido: any | null
}

export function OrderDetailModal({ open, onOpenChange, pedido }: OrderDetailModalProps) {
  if (!pedido) return null

  // Función para color de prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "baja":
        return "bg-green-100 text-green-700 border-green-200"
      case "normal":
        return "bg-gray-100 text-gray-700 border-gray-200"
      case "media":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "alta":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "urgente":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Pedido {pedido.order_number}{" "}
            <Badge variant="outline" className="ml-2">
              {pedido.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>Detalles completos del pedido</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Cliente</h4>
              <p className="text-lg">
                {pedido.customer?.commercial_name ?? "Sin cliente"}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Fecha de Entrega</h4>
              <p className="text-lg">
                {pedido.delivery_date 
                  ? new Date(pedido.delivery_date).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })
                  : "No especificada"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Prioridad</h4>
              <Badge className={getPriorityColor(pedido.priority)}>
                {pedido.priority.toUpperCase()}
              </Badge>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Tipo de Pedido</h4>
              <p className="text-lg capitalize">{pedido.order_type || "Presencial"}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Montos</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">${pedido.subtotal?.toLocaleString() || pedido.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">${pedido.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Facturación</h4>
            <p className="text-lg">
              {pedido.requires_invoice ? (
                <span className="text-green-600 font-medium">✓ Requiere factura</span>
              ) : (
                <span className="text-gray-400">No requiere factura</span>
              )}
            </p>
          </div>

          {pedido.has_shortages && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <h4 className="font-semibold text-yellow-800">⚠️ Tiene faltantes</h4>
              <p className="text-sm text-yellow-700">Este pedido tiene productos con faltante de stock</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
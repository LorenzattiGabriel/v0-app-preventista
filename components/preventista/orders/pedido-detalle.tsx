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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Pedido {pedido.codigo}{" "}
            <Badge variant="outline" className="ml-2">
              {pedido.estado}
            </Badge>
          </DialogTitle>
          <DialogDescription>Detalles completos del pedido</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Información del Cliente</h4>
            <p>{pedido.cliente}</p>
          </div>

          <div>
            <h4 className="font-semibold">Fechas</h4>
            <p>Creado: {pedido.fecha}</p>
            <p>Entrega: {pedido.entrega}</p>
          </div>

          <div>
            <h4 className="font-semibold">Prioridad</h4>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              {pedido.prioridad}
            </Badge>
          </div>

          <div>
            <h4 className="font-semibold">Totales</h4>
            <p>Total: ${pedido.total.toLocaleString()}</p>
            <p>{pedido.factura ? "Requiere factura" : "Sin factura"}</p>
          </div>

          {pedido.observaciones && (
            <div>
              <h4 className="font-semibold">Observaciones</h4>
              <p className="text-muted-foreground">{pedido.observaciones}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

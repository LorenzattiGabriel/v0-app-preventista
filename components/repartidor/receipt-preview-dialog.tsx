"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { ShareButtons } from "./share-buttons"
import { downloadOrderReceipt } from "@/lib/receipt-generator"

interface ReceiptPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any
  repartidorName?: string
}

export function ReceiptPreviewDialog({ open, onOpenChange, order, repartidorName }: ReceiptPreviewDialogProps) {
  if (!order) return null

  const handleDownload = () => {
    downloadOrderReceipt(order, repartidorName)
  }

  const collectedAmount = order.was_collected ? (order.collected_amount || 0) : 0
  const totalAmount = order.total || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista Previa del Recibo</DialogTitle>
          <DialogDescription>
            Comprobante de entrega para pedido #{order.order_number}
          </DialogDescription>
        </DialogHeader>

        {/* HTML Preview imitating the Receipt */}
        <div className="flex-1 bg-white text-black p-4 border rounded-md shadow-sm text-sm space-y-4 font-mono overflow-auto">
          <div className="text-center border-b pb-2 mb-2">
            <h3 className="font-bold text-lg">COMPROBANTE DE ENTREGA</h3>
            <p className="text-xs text-gray-500">Reparto Preventista</p>
          </div>

          <div className="space-y-1">
             <p><strong>Fecha:</strong> {new Date().toLocaleDateString("es-AR")}</p>
             <p><strong>Pedido N°:</strong> {order.order_number}</p>
             {repartidorName && <p><strong>Repartidor:</strong> {repartidorName}</p>}
          </div>

          <div className="border-t border-dashed pt-2 space-y-1">
            <p className="font-bold mb-1">CLIENTE</p>
            <p>{order.customers?.commercial_name}</p>
            <p className="text-xs">{order.customers?.street} {order.customers?.street_number}</p>
            <p className="text-xs">{order.customers?.locality}</p>
          </div>

          <div className="border-t border-dashed pt-2">
            <p className="font-bold mb-2">DETALLE</p>
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-1">Prod</th>
                        <th className="text-center py-1">Cant</th>
                        <th className="text-right py-1">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order.order_items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td className="py-1 pr-2">{item.products?.name?.substring(0, 20)}</td>
                            <td className="text-center py-1">{item.quantity_assembled || item.quantity_requested}</td>
                            <td className="text-right py-1">${((item.unit_price || 0) * (item.quantity_assembled || item.quantity_requested || 0)).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          <div className="border-t border-b border-dashed py-2 space-y-1">
            <div className="flex justify-between font-bold text-base">
                <span>TOTAL:</span>
                <span>${totalAmount.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between font-medium ${order.was_collected ? 'text-green-700' : 'text-red-700'}`}>
                <span>{order.was_collected ? 'PAGADO:' : 'PENDIENTE:'}</span>
                <span>${order.was_collected ? collectedAmount.toFixed(2) : totalAmount.toFixed(2)}</span>
            </div>
            
             {order.was_collected && (
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Forma de Pago:</span>
                <span>{order.payment_method || "Efectivo"}</span>
              </div>
            )}
            
             {order.received_by_name && (
              <div className="pt-2 text-right">
                <p className="text-xs text-gray-500">Recibido por:</p>
                <p className="font-medium">{order.received_by_name}</p>
              </div>
            )}

          </div>
          
          <div className="text-center text-xs text-gray-400 pt-2">
            Documento no válido como factura
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          <ShareButtons 
            order={order} 
            phone={order.customers?.phone} 
            email={order.customers?.email}
            className="w-full justify-center"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto h-12 text-base hover:bg-muted transition-colors cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button 
              className="w-full sm:w-auto h-12 text-lg font-bold shadow-md hover:scale-[1.02] transition-transform cursor-pointer" 
              size="lg" 
              onClick={handleDownload}
            >
              <Download className="mr-2 h-6 w-6" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

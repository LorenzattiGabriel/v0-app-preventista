"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ChevronLeft, ChevronRight, FileText, MessageCircle } from "lucide-react"
import { downloadAssemblyReceipt, getAssemblyReceiptBlob } from "@/lib/receipt-generator"
import { shareOnWhatsApp } from "@/lib/share-utils"
import { toast } from "sonner"

interface PaginatedOrdersListProps {
  orders: any[]
  userId: string
  itemsPerPage?: number
  title: string
  emptyMessage: string
  variant: "pending" | "inProgress" | "finished"
}

export function PaginatedOrdersList({
  orders,
  userId,
  itemsPerPage = 10,
  title,
  emptyMessage,
  variant,
}: PaginatedOrdersListProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(orders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = orders.slice(startIndex, endIndex)

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{title}</h3>
        {orders.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      ) : (
        <>
          {paginatedOrders.map((order) => (
            <OrderCard key={order.id} order={order} userId={userId} variant={variant} />
          ))}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OrderCard({ order, userId, variant }: { order: any; userId: string; variant: string }) {
  if (variant === "finished") {
    const isIncomplete = order.has_shortages === true
    
    const handleDownloadReceipt = async () => {
      try {
        // Fetch complete order data with items
        const response = await fetch(`/api/orders/${order.id}`)
        if (!response.ok) throw new Error("No se pudo obtener el pedido")
        const fullOrder = await response.json()
        downloadAssemblyReceipt(fullOrder)
        toast.success("Comprobante descargado")
      } catch (error) {
        toast.error("Error al descargar comprobante")
      }
    }

    const handleSendWhatsApp = async () => {
      const phone = order.customers?.phone || ""
      if (!phone) {
        toast.error("El cliente no tiene teléfono registrado")
        return
      }

      const message = `Hola ${order.customers?.commercial_name}! 👋\n\n` +
        `Su pedido #${order.order_number} ha sido armado y está listo para ser despachado.\n\n` +
        `📦 Total: $${order.total?.toFixed(2) || "0.00"}\n` +
        (isIncomplete ? `⚠️ Nota: Hubo algunos productos faltantes.\n` : "") +
        `\nGracias por su compra! 🙏`

      let result: Awaited<ReturnType<typeof shareOnWhatsApp>>
      try {
        const response = await fetch(`/api/orders/${order.id}`)
        if (!response.ok) throw new Error()
        const fullOrder = await response.json()
        const blob = getAssemblyReceiptBlob(fullOrder)
        result = await shareOnWhatsApp(phone, order.order_number, blob, message)
      } catch {
        // Si falla la obtención del PDF, compartir solo el mensaje
        result = await shareOnWhatsApp(phone, order.order_number, null, message)
      }

      // Feedback al usuario según cómo terminó el share
      if (result === "shared") {
        toast.success("Comprobante compartido por WhatsApp")
      } else if (result === "downloaded") {
        toast.success(
          "PDF descargado. WhatsApp Web no permite adjuntar archivos automáticamente — arrastrá el PDF al chat para enviarlo.",
          { duration: 8000 },
        )
      } else if (result === "no-file") {
        toast.info("No se pudo generar el comprobante. Se abrió WhatsApp con el mensaje.")
      }
    }

    return (
      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-white">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{order.order_number}</span>
            <Badge variant="secondary">Completado</Badge>
            {isIncomplete && <Badge variant="destructive">Faltantes</Badge>}
          </div>

          <p className="text-sm text-muted-foreground">
            {order.customers?.commercial_name ?? "Sin cliente"} – {order.customers?.locality}
          </p>

          <p className="text-xs text-muted-foreground">
            Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")}
          </p>

          <p className="text-xs text-green-600 font-medium">Finalizado hoy</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadReceipt}>
            <FileText className="mr-1 h-4 w-4" />
            Comprobante
          </Button>
          <Button 
            size="sm" 
            onClick={handleSendWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="mr-1 h-4 w-4" />
            WhatsApp
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/armado/orders/${order.id}/detalle`}>Ver detalle</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isTakenByOther =
    order.status === "EN_ARMADO" && order.assembled_by && order.assembled_by !== userId

  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 border rounded-lg bg-white ${
        isTakenByOther ? "opacity-60" : ""
      }`}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{order.order_number}</span>
          <Badge variant="outline">{order.priority}</Badge>
          {isTakenByOther && <Badge variant="destructive">Ya asignado</Badge>}
        </div>

        <p className="text-sm text-muted-foreground">
          {order.customers?.commercial_name ?? "Sin cliente"} – {order.customers?.locality}
        </p>

        <p className="text-xs text-muted-foreground">
          Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")}
        </p>

        {isTakenByOther && (
          <p className="text-xs text-red-600 font-medium">
            Otro armador está trabajando en este pedido
          </p>
        )}
      </div>

      <Button asChild disabled={isTakenByOther} className="w-full md:w-auto">
        <Link href={`/armado/orders/${order.id}`}>
          {order.status === "EN_ARMADO" ? "Continuar" : "Armar"}
        </Link>
      </Button>
    </div>
  )
}


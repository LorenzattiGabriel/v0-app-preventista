"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { downloadAssemblyReceipt } from "@/lib/receipt-generator"
import { toast } from "sonner"

interface DownloadOrderReceiptButtonProps {
  orderId: string
  orderNumber: string
  variant?: "default" | "outline"
  size?: "default" | "sm"
}

/**
 * Botón para descargar el comprobante de armado desde la vista de admin.
 * Usa el endpoint /api/orders/[id] (mismo que arma el del armador).
 */
export function DownloadOrderReceiptButton({
  orderId,
  orderNumber,
  variant = "outline",
  size = "default",
}: DownloadOrderReceiptButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        const j = await response.json().catch(() => ({}))
        throw new Error(j.error || "No se pudo obtener el pedido")
      }
      const fullOrder = await response.json()
      downloadAssemblyReceipt(fullOrder)
      toast.success(`Comprobante de ${orderNumber} descargado`)
    } catch (e) {
      console.error("Error descargando comprobante:", e)
      toast.error(e instanceof Error ? e.message : "Error al descargar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Descargar Comprobante
    </Button>
  )
}

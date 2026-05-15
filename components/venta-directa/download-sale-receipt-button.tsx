"use client"

// Botón para descargar el remito PDF de una venta directa.
// Si recibe `sale` lo usa directo; si recibe `saleId` lo fetcha al hacer click.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { downloadOrderReceipt } from "@/lib/receipt-generator"
import { adaptSaleForReceipt } from "@/lib/utils/sale-to-receipt"
import type { DirectSale } from "@/lib/types/venta-directa"
import { toast } from "sonner"

type Props =
  | { sale: DirectSale; saleId?: never; sellerName?: string; variant?: "default" | "outline" | "ghost"; size?: "default" | "sm" | "lg" | "icon"; children?: React.ReactNode }
  | { saleId: string; sale?: never; sellerName?: string; variant?: "default" | "outline" | "ghost"; size?: "default" | "sm" | "lg" | "icon"; children?: React.ReactNode }

export function DownloadSaleReceiptButton(props: Props) {
  const { sellerName, variant = "outline", size = "sm", children } = props
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      let sale: DirectSale | null = props.sale ?? null
      if (!sale && "saleId" in props && props.saleId) {
        const supabase = createClient()
        const service = createDirectSalesService(supabase)
        sale = await service.getSaleById(props.saleId)
      }
      if (!sale) {
        toast.error("No se pudo cargar la venta")
        return
      }
      downloadOrderReceipt(adaptSaleForReceipt(sale), sellerName)
    } catch (e: any) {
      toast.error(`Error al generar el remito: ${e?.message || "desconocido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {children !== undefined ? (
        <span className="ml-2">{children}</span>
      ) : (
        <span className="ml-2">Descargar remito</span>
      )}
    </Button>
  )
}

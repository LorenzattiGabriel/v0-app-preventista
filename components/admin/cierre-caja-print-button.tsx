"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  generateCierreCajaPDF,
  type CierreCajaTotals,
  type CierreCajaPaymentRow,
  type CierreCajaSellerRow,
  type CierreCajaSaleRow,
} from "@/lib/cierre-caja-generator"

interface Props {
  date: string
  dateLabel: string
  totals: CierreCajaTotals
  paymentBreakdown: CierreCajaPaymentRow[]
  sellerRanking: CierreCajaSellerRow[]
  sales: CierreCajaSaleRow[]
}

export function CierreCajaPrintButton({ date, dateLabel, totals, paymentBreakdown, sellerRanking, sales }: Props) {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    setLoading(true)
    try {
      const doc = await generateCierreCajaPDF(dateLabel, totals, paymentBreakdown, sellerRanking, sales)
      doc.save(`Cierre_Caja_VentaDirecta_${date}.pdf`)
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handlePrint} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
      Imprimir cierre
    </Button>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  generateAccountsReportPDF,
  type CustomerForAccountsReport,
} from "@/lib/accounts-report-generator"

interface PrintAccountsReportButtonProps {
  customers: CustomerForAccountsReport[]
  filterLabel?: string
}

export function PrintAccountsReportButton({ customers, filterLabel }: PrintAccountsReportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    if (customers.length === 0) {
      toast.error("No hay clientes para incluir en el reporte")
      return
    }
    setLoading(true)
    try {
      const doc = await generateAccountsReportPDF(customers, filterLabel)
      const date = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")
      doc.save(`Reporte_Cuentas_Corrientes_${date}.pdf`)
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handlePrint} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
      Imprimir reporte general
    </Button>
  )
}

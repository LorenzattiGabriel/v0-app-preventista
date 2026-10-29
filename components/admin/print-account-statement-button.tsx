"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  generateAccountStatementPDF,
  type AccountMovementForStatement,
  type CustomerForStatement,
} from "@/lib/account-statement-generator"

interface PrintAccountStatementButtonProps {
  customer: CustomerForStatement
  movements: AccountMovementForStatement[]
}

export function PrintAccountStatementButton({ customer, movements }: PrintAccountStatementButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    setLoading(true)
    try {
      const doc = await generateAccountStatementPDF(customer, movements)
      const date = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")
      const safeName = customer.commercial_name.replace(/[^a-zA-Z0-9]+/g, "_")
      doc.save(`Cuenta_Corriente_${safeName}_${date}.pdf`)
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
      Imprimir cuenta
    </Button>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { downloadAssemblyReceipt } from "@/lib/receipt-generator"

interface Props {
  order: any
}

export function DownloadAssemblyReceiptButton({ order }: Props) {
  return (
    <Button variant="outline" onClick={() => downloadAssemblyReceipt(order)}>
      <Download className="mr-2 h-4 w-4" />
      Descargar Comprobante
    </Button>
  )
}

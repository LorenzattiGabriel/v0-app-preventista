"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Download } from "lucide-react"

import { ReceiptPreviewDialog } from "./receipt-preview-dialog"
import { downloadOrderReceipt } from "@/lib/receipt-generator"

interface ReceiptButtonProps {
  order: any
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  directDownload?: boolean
  repartidorName?: string
}

export function ReceiptButton({ 
  order, 
  variant = "outline", 
  size = "sm", 
  className,
  directDownload = false,
  repartidorName
}: ReceiptButtonProps) {
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)

  if (order.status !== "ENTREGADO") return null

  const handleClick = () => {
    if (directDownload) {
      downloadOrderReceipt(order, repartidorName)
    } else {
      setShowReceiptDialog(true)
    }
  }

  return (
    <>
      <Button 
        variant={variant}
        size={size}
        className={`shadow-sm ${className}`}
        onClick={handleClick}
      >
        {directDownload ? (
          <Download className="mr-2 h-4 w-4" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        {directDownload ? "Descargar Recibo" : "Ver Recibo"}
      </Button>

      {!directDownload && (
        <ReceiptPreviewDialog 
          open={showReceiptDialog} 
          onOpenChange={setShowReceiptDialog} 
          order={order} 
          repartidorName={repartidorName}
        />
      )}
    </>
  )
}

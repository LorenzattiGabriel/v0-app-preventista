"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { FileText, Download, Share2, MessageCircle, Mail, ExternalLink, ChevronDown } from "lucide-react"
import { downloadOrderReceipt } from "@/lib/receipt-generator"
import { shareNative, shareOnWhatsApp, shareViaEmail, shareViaGmail } from "@/lib/share-utils"
import { ReceiptPreviewDialog } from "./receipt-preview-dialog"

interface ReceiptActionsMenuProps {
  order: any
  className?: string
  repartidorName?: string
}

export function ReceiptActionsMenu({ order, className, repartidorName }: ReceiptActionsMenuProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const phone = order.customers?.phone
  const email = order.customers?.email

  const handleNativeShare = async () => {
    try {
      setIsSharing(true)
      await shareNative(order)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <FileText className="mr-2 h-4 w-4" />
            Gestionar Recibo
            <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Acciones de Recibo</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowPreview(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Ver Vista Previa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadOrderReceipt(order, repartidorName)}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Compartir</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={() => shareOnWhatsApp(phone, order.order_number)}>
            <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
            WhatsApp {phone ? "" : "(Sin número)"}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => shareViaEmail(email, order.order_number, order.customers.commercial_name)}>
            <Mail className="mr-2 h-4 w-4 text-blue-600" />
            Email {email ? "" : "(Sin email)"}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => shareViaGmail(email, order.order_number, order.customers.commercial_name)}>
            <ExternalLink className="mr-2 h-4 w-4 text-red-600" />
            Gmail {email ? "" : "(Sin email)"}
          </DropdownMenuItem>

          {typeof navigator !== "undefined" && typeof navigator.share === 'function' && (
            <DropdownMenuItem onClick={handleNativeShare} disabled={isSharing}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartir Archivo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReceiptPreviewDialog 
        open={showPreview} 
        onOpenChange={setShowPreview} 
        order={order} 
        repartidorName={repartidorName}
      />
    </>
  )
}

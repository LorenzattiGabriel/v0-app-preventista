"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, Mail, Share2, ExternalLink } from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { shareNative, shareOnWhatsApp, shareViaEmail, shareViaGmail } from "@/lib/share-utils"
import { getReceiptBlob } from "@/lib/receipt-generator"

interface ShareButtonsProps {
  order: any
  phone?: string | null
  email?: string | null
  layout?: "row" | "column" | "icon-only"
  className?: string
  blob?: Blob | null // Optional pre-generated blob
}

export function ShareButtons({ order, phone, email, layout = "row", className, blob: propBlob }: ShareButtonsProps) {
  const [canShareNative, setCanShareNative] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      setCanShareNative(true)
    }
  }, [])

  const handleNativeShare = async () => {
    try {
      setIsSharing(true)
      await shareNative(order, propBlob)
    } finally {
      setIsSharing(false)
    }
  }

  const handleWhatsApp = () => {
    shareOnWhatsApp(phone, order.order_number)
  }

  const handleEmail = () => {
    shareViaEmail(email, order.order_number, order.customers.commercial_name)
  }

  const handleGmail = () => {
    shareViaGmail(email, order.order_number, order.customers.commercial_name)
  }

  // Remove early return
  // if (!phone && !email && !canShareNative) return null

  const iconSize = layout === "icon-only" ? "h-4 w-4" : "h-4 w-4 mr-2"
  const buttonVariant = "outline"
  const buttonSize = "sm"

  return (
    <div className={`flex ${layout === "column" ? "flex-col" : "flex-row"} gap-2 ${className}`}>
      {canShareNative && (
         <Button 
            variant={buttonVariant} 
            size={buttonSize} 
            onClick={handleNativeShare}
            disabled={isSharing}
            title="Compartir archivo"
         >
           <Share2 className={iconSize} />
           {layout !== "icon-only" && "Compartir"}
         </Button>
      )}

      {/* WhatsApp Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={buttonVariant} 
              size={buttonSize} 
              onClick={handleWhatsApp}
              className={`
                ${phone 
                  ? "text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-900/20" 
                  : "text-muted-foreground border-dashed" // Visual hint for missing phone
                }
              `}
            >
              <MessageCircle className={iconSize} />
              {layout !== "icon-only" && "WhatsApp"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{phone ? `Enviar mensaje a ${phone}` : "Sin teléfono registrado - Abrir WhatsApp"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Email Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
              variant={buttonVariant} 
              size={buttonSize}
              className={`
                ${email
                  ? "text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  : "text-muted-foreground border-dashed" // Visual hint for missing email
                }
              `}
          >
            <Mail className={iconSize} />
            {layout !== "icon-only" && "Email"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEmail}>
            <Mail className="mr-2 h-4 w-4" />
            {email ? "Enviar correo (Default)" : "Enviar correo (Sin destinatario)"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGmail}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir en Gmail {email ? "" : "(Sin destinatario)"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

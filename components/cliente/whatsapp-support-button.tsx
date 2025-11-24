'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'

interface WhatsAppSupportButtonProps {
  orderNumber?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

/**
 * WhatsApp Support Button Component
 * Opens WhatsApp with pre-filled message for support/complaints
 */
export function WhatsAppSupportButton({ 
  orderNumber, 
  variant = 'outline',
  size = 'default',
  className 
}: WhatsAppSupportButtonProps) {
  // Número de soporte de WhatsApp (configurar en variables de entorno)
  const supportNumber = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT || '5493516660000'
  
  const handleWhatsAppClick = () => {
    const message = orderNumber
      ? `Hola, necesito ayuda con mi pedido ${orderNumber}.`
      : 'Hola, necesito ayuda con un pedido.'
    
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodedMessage}`
    
    window.open(whatsappUrl, '_blank')
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsAppClick}
      className={className}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Soporte WhatsApp
    </Button>
  )
}


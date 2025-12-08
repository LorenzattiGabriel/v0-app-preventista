import { getReceiptBlob } from "@/lib/receipt-generator"

export const shareOnWhatsApp = (phone: string | null | undefined, orderNumber: string) => {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
  const message = `Hola, le envío el recibo del pedido #${orderNumber}.`
  
  const url = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
  
  window.open(url, '_blank')
}

export const shareViaEmail = (email: string | null | undefined, orderNumber: string, commercialName: string) => {
  const subject = `Recibo Pedido #${orderNumber} - ${commercialName}`
  const body = `Hola,\n\nAdjunto el recibo del pedido #${orderNumber}.\n\nSaludos.`
  const emailTo = email || ''
  window.location.href = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export const shareViaGmail = (email: string | null | undefined, orderNumber: string, commercialName: string) => {
  const subject = `Recibo Pedido #${orderNumber} - ${commercialName}`
  const body = `Hola,\n\nAdjunto el recibo del pedido #${orderNumber}.\n\nSaludos.`
  const emailTo = email || ''
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emailTo}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(gmailUrl, '_blank')
}

export const shareNative = async (order: any, blob?: Blob | null) => {
  try {
    let fileBlob = blob
    if (!fileBlob) {
      fileBlob = getReceiptBlob(order)
    }

    const file = new File([fileBlob!], `Recibo_Pedido_${order.order_number}.pdf`, { type: 'application/pdf' })

    const shareData = {
      title: `Recibo Pedido #${order.order_number}`,
      text: `Adjunto el recibo del pedido #${order.order_number} de ${order.customers.commercial_name}`,
      files: [file]
    }

    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData)
      return true
    } else {
      console.warn("Native sharing not supported for this file type")
      return false
    }
  } catch (err) {
    console.error("Error sharing:", err)
    return false
  }
}

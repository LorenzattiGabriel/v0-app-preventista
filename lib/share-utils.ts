import { getReceiptBlob } from "@/lib/receipt-generator"

/**
 * Comparte por WhatsApp intentando adjuntar el PDF via Web Share API.
 * En mobile abre el selector nativo (incluye WhatsApp con el archivo pre-cargado).
 * En desktop o si la API no está disponible, descarga el PDF y abre WhatsApp con texto.
 */
export const shareOnWhatsApp = async (
  phone: string | null | undefined,
  orderNumber: string,
  blob?: Blob | null,
  customMessage?: string,
) => {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
  const message = customMessage ?? `Hola, le envío el comprobante del pedido #${orderNumber}.`
  const fileName = `Comprobante_Pedido_${orderNumber}.pdf`

  // Intentar Web Share API con archivo (funciona en mobile con WhatsApp instalado)
  if (blob && typeof navigator !== 'undefined' && navigator.canShare) {
    const file = new File([blob], fileName, { type: 'application/pdf' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ text: message, files: [file] })
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return // usuario canceló
        // otro error → continuar con fallback
      }
    }
  }

  // Fallback: descargar PDF automáticamente + abrir WhatsApp con texto
  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(waUrl, '_blank')
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

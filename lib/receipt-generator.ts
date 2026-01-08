import jsPDF from "jspdf"

export const generateOrderReceipt = (order: any, repartidorName?: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15
  let yPos = 20
  
  // Helper to center text
  const centerText = (text: string, y: number, fontSize = 12, font = "helvetica", style = "normal") => {
    doc.setFont(font, style)
    doc.setFontSize(fontSize)
    const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor
    const x = (pageWidth - textWidth) / 2
    doc.text(text, x, y)
    return y + (fontSize * 0.5) // approximate line height
  }

  // --- Header ---
  yPos = centerText("COMPROBANTE DE ENTREGA", yPos, 16, "helvetica", "bold")
  yPos += 5
  yPos = centerText("Reparto Preventista", yPos, 10, "helvetica", "normal")
  yPos += 10
  
  // --- Order Info ---
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR")}`, margin, yPos)
  yPos += 6
  doc.text(`Pedido N°: ${order.order_number || "S/N"}`, margin, yPos)
  yPos += 6
  if (repartidorName) {
    doc.text(`Repartidor: ${repartidorName}`, margin, yPos)
    yPos += 6
  }
  yPos += 4

  // --- Customer Info ---
  doc.setDrawColor(200)
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5) // separator
  
  doc.setFont("helvetica", "bold")
  doc.text("DATOS DEL CLIENTE", margin, yPos)
  yPos += 6
  doc.setFont("helvetica", "normal")
  doc.text(`Cliente: ${order.customers.commercial_name}`, margin, yPos)
  yPos += 6
  doc.text(`Dirección: ${order.customers.street} ${order.customers.street_number || ""}`, margin, yPos)
  yPos += 6
  if (order.customers.locality) {
      doc.text(`Localidad: ${order.customers.locality}, ${order.customers.province || ""}`, margin, yPos)
      yPos += 6
  }
  yPos += 4

  // --- Items ---
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5) // separator
  doc.setFont("helvetica", "bold")
  doc.text("DETALLE DEL PEDIDO", margin, yPos)
  yPos += 8
  
  // Table Header
  const col1 = margin
  const col2 = margin + 80
  const col3 = pageWidth - margin - 20
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("Producto", col1, yPos)
  doc.text("Cant.", col2, yPos)
  doc.text("Total", col3, yPos, { align: "right" })
  yPos += 4
  doc.line(col1, yPos - 1, pageWidth - margin, yPos - 1)
  yPos += 5
  
  // Table Body
  doc.setFont("helvetica", "normal")
  const items = order.order_items || []
  
  items.forEach((item: any) => {
    const productName = `${item.products.name} ${item.products.brand || ""}`.substring(0, 40)
    const quantity = item.quantity_assembled || item.quantity_requested || 0
    const price = (item.unit_price * quantity).toFixed(2)
    
    // Check page break
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }

    doc.text(productName, col1, yPos)
    doc.text(quantity.toString(), col2 + 2, yPos, { align: "center" })
    doc.text(`$${price}`, col3, yPos, { align: "right" })
    yPos += 6
  })
  
  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // --- Totals ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  const total = order.total || 0
  const collected = order.was_collected ? (order.collected_amount || 0) : 0
  
  doc.text(`TOTAL: $${total.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" })
  yPos += 8
  
  // Payment Status
  doc.setFontSize(10)
  if (order.was_collected) {
      doc.setTextColor(0, 100, 0) // Green
      doc.text(`COBRADO: $${collected.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" })
      
      // Payment Method
      yPos += 5
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50) // Dark Gray
      const paymentMethod = order.payment_method || "Efectivo"
      doc.text(`Forma de Pago: ${paymentMethod}`, pageWidth - margin, yPos, { align: "right" })
  } else {
      doc.setTextColor(150, 0, 0) // Red
      doc.text("NO COBRADO", pageWidth - margin, yPos, { align: "right" })
  }
  doc.setTextColor(0) // Reset color
  yPos += 15

  // --- Signatures / Footer ---
  if (order.received_by_name) {
      doc.text(`Recibido por: ${order.received_by_name}`, margin, yPos)
  }
  
  
  
  // Return the doc instance so we can choose to save or get blob
  return doc
}

export const downloadOrderReceipt = (order: any, repartidorName?: string) => {
  const doc = generateOrderReceipt(order, repartidorName)
  doc.save(`Recibo_Pedido_${order.order_number}.pdf`)
}

export const getReceiptBlob = (order: any, repartidorName?: string): Blob => {
  const doc = generateOrderReceipt(order, repartidorName)
  return doc.output('blob')
}

// 🆕 Generar comprobante de armado (diferente al de entrega)
export const generateAssemblyReceipt = (order: any, armadorName?: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15
  let yPos = 20
  
  // Helper to center text
  const centerText = (text: string, y: number, fontSize = 12, font = "helvetica", style = "normal") => {
    doc.setFont(font, style)
    doc.setFontSize(fontSize)
    const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor
    const x = (pageWidth - textWidth) / 2
    doc.text(text, x, y)
    return y + (fontSize * 0.5)
  }

  // --- Header ---
  yPos = centerText("COMPROBANTE DE ARMADO", yPos, 16, "helvetica", "bold")
  yPos += 5
  yPos = centerText("Pedido Listo para Despacho", yPos, 10, "helvetica", "normal")
  yPos += 10
  
  // --- Order Info ---
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha de Armado: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR")}`, margin, yPos)
  yPos += 6
  doc.text(`Pedido N°: ${order.order_number || "S/N"}`, margin, yPos)
  yPos += 6
  if (armadorName) {
    doc.text(`Armado por: ${armadorName}`, margin, yPos)
    yPos += 6
  }
  yPos += 4

  // --- Customer Info ---
  doc.setDrawColor(200)
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5)
  
  doc.setFont("helvetica", "bold")
  doc.text("DATOS DEL CLIENTE", margin, yPos)
  yPos += 6
  doc.setFont("helvetica", "normal")
  doc.text(`Cliente: ${order.customers.commercial_name}`, margin, yPos)
  yPos += 6
  doc.text(`Dirección: ${order.customers.street} ${order.customers.street_number || ""}`, margin, yPos)
  yPos += 6
  if (order.customers.locality) {
    doc.text(`Localidad: ${order.customers.locality}, ${order.customers.province || ""}`, margin, yPos)
    yPos += 6
  }
  yPos += 4

  // --- Items ---
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5)
  doc.setFont("helvetica", "bold")
  doc.text("DETALLE DEL PEDIDO ARMADO", margin, yPos)
  yPos += 8
  
  const col1 = margin
  const col2 = margin + 70
  const col3 = margin + 90
  const col4 = pageWidth - margin - 20
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("Producto", col1, yPos)
  doc.text("Solic.", col2, yPos)
  doc.text("Armado", col3, yPos)
  doc.text("Total", col4, yPos, { align: "right" })
  yPos += 4
  doc.line(col1, yPos - 1, pageWidth - margin, yPos - 1)
  yPos += 5
  
  doc.setFont("helvetica", "normal")
  const items = order.order_items || []
  
  items.forEach((item: any) => {
    const productName = `${item.products.name} ${item.products.brand || ""}`.substring(0, 35)
    const quantityRequested = item.quantity_requested || 0
    const quantityAssembled = item.quantity_assembled ?? item.quantity_requested ?? 0
    const price = (item.unit_price * quantityAssembled).toFixed(2)
    // Solo marcar como faltante si is_shortage es true o si hay cantidad armada definida que es menor
    const hasShortage = item.is_shortage === true || 
      (item.quantity_assembled !== null && item.quantity_assembled !== undefined && item.quantity_assembled < quantityRequested)
    
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }

    if (hasShortage) {
      doc.setTextColor(200, 100, 0) // Orange for shortages
    }
    
    doc.text(productName, col1, yPos)
    doc.text(quantityRequested.toString(), col2 + 5, yPos, { align: "center" })
    doc.text(quantityAssembled.toString(), col3 + 8, yPos, { align: "center" })
    doc.text(`$${price}`, col4, yPos, { align: "right" })
    
    if (hasShortage) {
      doc.setTextColor(0) // Reset
    }
    yPos += 6
  })
  
  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // --- Totals ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  const total = order.total || 0
  
  doc.text(`TOTAL: $${total.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" })
  yPos += 10

  // --- Status ---
  // Verificar faltantes correctamente: solo hay faltante si is_shortage es true 
  // o si quantity_assembled existe y es menor que quantity_requested
  const hasShortages = items.some((item: any) => {
    if (item.is_shortage === true) return true
    // Solo comparar si quantity_assembled tiene un valor definido
    if (item.quantity_assembled !== null && item.quantity_assembled !== undefined) {
      return item.quantity_assembled < item.quantity_requested
    }
    return false
  })
  
  doc.setFontSize(10)
  if (hasShortages) {
    doc.setTextColor(200, 100, 0) // Orange
    doc.text("⚠ PEDIDO CON FALTANTES", margin, yPos)
  } else {
    doc.setTextColor(0, 100, 0) // Green
    doc.text("✓ PEDIDO COMPLETO", margin, yPos)
  }
  doc.setTextColor(0)
  yPos += 10

  // --- Footer ---
  doc.setFontSize(9)
  doc.setTextColor(100)
  yPos = centerText("Este pedido está listo para ser despachado", yPos + 10, 9)
  doc.setTextColor(0)
  
  return doc
}

export const getAssemblyReceiptBlob = (order: any, armadorName?: string): Blob => {
  const doc = generateAssemblyReceipt(order, armadorName)
  return doc.output('blob')
}

export const downloadAssemblyReceipt = (order: any, armadorName?: string) => {
  const doc = generateAssemblyReceipt(order, armadorName)
  doc.save(`Comprobante_Armado_${order.order_number}.pdf`)
}
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
    const quantity = Number(item.quantity_assembled || item.quantity_requested || 0)
    const price = (item.unit_price * quantity).toFixed(2)
    const byWeight = item.sale_unit === "peso"
    const refKg = item.assembled_weight_kg != null ? Number(item.assembled_weight_kg) : null
    const qtyText = byWeight
      ? `${quantity.toFixed(3)} kg`
      : Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2)

    // Check page break
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }

    doc.text(productName, col1, yPos)
    doc.text(qtyText, col2 + 2, yPos, { align: "center" })
    doc.text(`$${price}`, col3, yPos, { align: "right" })

    // Peso real opcional como referencia para el cliente
    if (refKg && refKg > 0) {
      yPos += 4
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(`  Peso real: ${refKg.toFixed(3)} kg`, col1, yPos)
      doc.setFontSize(9)
      doc.setTextColor(0)
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

  // Resolver cantidad armada con shortage explícito: si is_shortage=true, fuerza 0
  const resolveAssembled = (item: any) => {
    if (item.is_shortage === true) {
      return item.quantity_assembled ?? 0
    }
    if (item.quantity_assembled !== null && item.quantity_assembled !== undefined) {
      return item.quantity_assembled
    }
    return item.quantity_requested || 0
  }

  let assembledTotal = 0
  let totalWeightRequested = 0
  let totalWeightAssembled = 0
  const fmtQty = (v: number, byWeight: boolean) =>
    byWeight ? `${v.toFixed(3)} kg` : Number.isInteger(v) ? v.toString() : v.toFixed(2)
  items.forEach((item: any) => {
    const productName = `${item.products.name} ${item.products.brand || ""}`.substring(0, 35)
    const quantityRequested = Number(item.quantity_requested) || 0
    const quantityAssembled = Number(resolveAssembled(item)) || 0
    const lineTotal = item.unit_price * quantityAssembled - (item.discount || 0)
    const price = Math.max(0, lineTotal).toFixed(2)
    assembledTotal += Math.max(0, lineTotal)
    const hasShortage = item.is_shortage === true || quantityAssembled < quantityRequested

    const saleUnit: "unidad" | "peso" = item.sale_unit || "unidad"
    const byWeight = saleUnit === "peso"
    const refWeightKg = item.assembled_weight_kg != null ? Number(item.assembled_weight_kg) : null

    // Acumular peso del pedido
    if (byWeight) {
      totalWeightRequested += quantityRequested
      totalWeightAssembled += quantityAssembled
    } else if (refWeightKg && refWeightKg > 0) {
      // Peso real cargado por el armador para producto vendido por unidad
      totalWeightAssembled += refWeightKg
      const allowsDecimal = item.products.allows_decimal_quantity === true
      const unitWeight = !allowsDecimal && item.products.weight ? Number(item.products.weight) : 0
      if (unitWeight > 0) totalWeightRequested += quantityRequested * unitWeight
    } else {
      // Fallback al peso unitario fijo del producto
      const allowsDecimal = item.products.allows_decimal_quantity === true
      const unitWeight = !allowsDecimal && item.products.weight ? Number(item.products.weight) : 0
      if (unitWeight > 0) {
        totalWeightRequested += quantityRequested * unitWeight
        totalWeightAssembled += quantityAssembled * unitWeight
      }
    }

    if (yPos > 265) {
      doc.addPage()
      yPos = 20
    }

    if (hasShortage) {
      doc.setTextColor(200, 100, 0) // Orange for shortages
    }

    doc.text(productName, col1, yPos)
    doc.text(fmtQty(quantityRequested, byWeight), col2 + 5, yPos, { align: "center" })
    doc.text(fmtQty(quantityAssembled, byWeight), col3 + 8, yPos, { align: "center" })
    doc.text(`$${price}`, col4, yPos, { align: "right" })

    if (hasShortage) {
      doc.setTextColor(0) // Reset
      // Línea adicional con motivo del faltante
      yPos += 4
      doc.setFontSize(8)
      doc.setTextColor(150, 80, 0)
      const faltante = quantityRequested - quantityAssembled
      const motivo = item.shortage_reason ? ` (${item.shortage_reason})` : ""
      doc.text(`  Faltante: ${fmtQty(faltante, byWeight)}${motivo}`, col1, yPos)
      doc.setFontSize(9)
      doc.setTextColor(0)
    }

    // Línea de peso real (referencia opcional cargada por el armador)
    if (refWeightKg && refWeightKg > 0) {
      yPos += 4
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(`  Peso real: ${refWeightKg.toFixed(3)} kg`, col1, yPos)
      doc.setFontSize(9)
      doc.setTextColor(0)
    } else if (!byWeight) {
      // Fallback: peso aprox. en base al peso unitario del producto
      const allowsDecimal = item.products.allows_decimal_quantity === true
      const unitWeight = !allowsDecimal && item.products.weight ? Number(item.products.weight) : 0
      if (unitWeight > 0) {
        yPos += 4
        doc.setFontSize(8)
        doc.setTextColor(120)
        doc.text(
          `  Peso aprox.: ${(quantityAssembled * unitWeight).toFixed(2)} kg (${unitWeight.toFixed(2)} kg c/u)`,
          col1,
          yPos,
        )
        doc.setFontSize(9)
        doc.setTextColor(0)
      }
    }
    yPos += 6
  })

  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // --- Totals ---
  // Usar el total armado real, con fallback al total del pedido
  const generalDiscount = order.general_discount || 0
  const finalAssembledTotal = order.total ?? Math.max(0, assembledTotal - generalDiscount)
  const originalTotal = order.original_total ?? order.total ?? 0
  const difference = originalTotal - finalAssembledTotal
  const hasDifference = Math.abs(difference) > 0.01

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)

  if (hasDifference) {
    doc.setTextColor(80, 80, 80)
    doc.text(`Total Original: $${originalTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" })
    yPos += 6
    doc.setTextColor(0)
    doc.text(`Total Armado: $${finalAssembledTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" })
    yPos += 6
    doc.setTextColor(200, 100, 0)
    const diffSign = difference > 0 ? "-" : "+"
    doc.text(
      `Diferencia: ${diffSign}$${Math.abs(difference).toFixed(2)}`,
      pageWidth - margin,
      yPos,
      { align: "right" },
    )
    doc.setTextColor(0)
    yPos += 8
  }

  doc.setFontSize(11)
  doc.text(`TOTAL: $${finalAssembledTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" })
  yPos += 10

  // --- Peso del pedido (solo si hay productos con peso configurado) ---
  if (totalWeightRequested > 0 || totalWeightAssembled > 0) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    if (Math.abs(totalWeightRequested - totalWeightAssembled) > 0.01) {
      doc.text(
        `Peso solicitado: ${totalWeightRequested.toFixed(2)} kg`,
        pageWidth - margin,
        yPos,
        { align: "right" },
      )
      yPos += 5
    }
    doc.setTextColor(0)
    doc.setFont("helvetica", "bold")
    doc.text(
      `Peso armado: ${totalWeightAssembled.toFixed(2)} kg`,
      pageWidth - margin,
      yPos,
      { align: "right" },
    )
    yPos += 8
  }

  // --- Status ---
  const hasShortages = order.has_shortages === true || items.some((item: any) => {
    if (item.is_shortage === true) return true
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
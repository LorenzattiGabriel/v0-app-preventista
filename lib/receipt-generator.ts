import jsPDF from "jspdf"

const ALEF_LOGO_URL =
  "https://ojghwcbliucsntrbqvaw.supabase.co/storage/v1/object/public/logos/alef-logo.png"

async function fetchLogoBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

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
    const p = item.products || {}
    const productName = `${p.name || "Producto"} ${p.brand || ""}`.substring(0, 40)
    const quantity = Number(item.quantity_assembled || item.quantity_requested || 0)
    const unitPrice = Number(item.unit_price) || 0
    const byWeight = item.sale_unit === "peso"
    const refKg = item.assembled_weight_kg != null ? Number(item.assembled_weight_kg) : null

    // Para items por peso: precio = kg_balanza × precio/kg; para unidad: cantidad × precio
    const linePrice = byWeight
      ? (refKg ?? 0) * unitPrice
      : quantity * unitPrice
    const qtyText = byWeight
      ? `${quantity}pz · ${refKg != null ? refKg.toFixed(3) + "kg" : "N/A"}`
      : Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2)

    // Check page break
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }

    doc.text(productName, col1, yPos)
    doc.text(qtyText, col2 + 2, yPos, { align: "center" })
    doc.text(`$${linePrice.toFixed(2)}`, col3, yPos, { align: "right" })
    yPos += 6
  })

  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // --- Totals ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  const total = Number(order.total) || 0
  const collected = order.was_collected ? (Number(order.collected_amount) || 0) : 0

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

// Comprobante de armado (REMITO)
export const generateAssemblyReceipt = async (order: any, armadorName?: string) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 15
  let yPos = 10

  // --- Logo + Header ---
  const logoBase64 = await fetchLogoBase64(ALEF_LOGO_URL)
  if (logoBase64) {
    const fmt = logoBase64.startsWith("data:image/png") ? "PNG" : "JPEG"
    doc.addImage(logoBase64, fmt, margin, yPos, 36, 18)
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("REMITO", pageWidth / 2, yPos + 10, { align: "center" })

  const deliveryDate = order.delivery_date
    ? new Date(order.delivery_date + "T00:00:00").toLocaleDateString("es-AR")
    : new Date().toLocaleDateString("es-AR")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Fecha de entrega: ${deliveryDate}`, pageWidth - margin, yPos + 5, { align: "right" })
  doc.text(`Pedido N°: ${order.order_number || "S/N"}`, pageWidth - margin, yPos + 11, { align: "right" })

  yPos += 24

  // Armado info
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Armado el ${new Date().toLocaleDateString("es-AR")}${armadorName ? ` por ${armadorName}` : ""}`,
    margin,
    yPos,
  )
  doc.setTextColor(0)
  yPos += 6

  // --- Separator ---
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 7

  // --- Customer Info ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("DATOS DEL CLIENTE", margin, yPos)
  yPos += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)

  const customers = order.customers || {}
  doc.text(`Cliente: ${customers.commercial_name || "Sin nombre"}`, margin, yPos)
  yPos += 5
  if (customers.street) {
    doc.text(`Dirección: ${customers.street} ${customers.street_number || ""}`, margin, yPos)
    yPos += 5
  }
  if (customers.locality) {
    doc.text(
      `Localidad: ${customers.locality}${customers.province ? `, ${customers.province}` : ""}`,
      margin,
      yPos,
    )
    yPos += 5
  }

  // Forma de pago
  const paymentMethods = order.payment_methods_json as Array<{ method: string; amount: number }> | null
  let paymentText = ""
  if (paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
    paymentText = paymentMethods
      .map((p) => `${p.method}: $${Number(p.amount).toFixed(2)}`)
      .join(" + ")
  } else if (order.payment_method) {
    paymentText = order.payment_method
  }
  if (paymentText) {
    doc.text(`Forma de pago: ${paymentText}`, margin, yPos)
    yPos += 5
  }

  yPos += 4

  // --- Items Table ---
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("DETALLE DEL PEDIDO", margin, yPos)
  yPos += 8

  // Column positions (A4 = 210mm, margins = 15mm each side → 180mm usable)
  const col1 = margin            // Product (left-aligned)
  const colPriceRight = 82       // Unit price (right-aligned)
  const colSolic = 102           // Solicited (center)
  const colAssembled = 128       // Assembled (center)
  const colTotalRight = pageWidth - margin  // Total (right-aligned)

  doc.setFontSize(8)
  doc.text("Producto", col1, yPos)
  doc.text("P. Unit.", colPriceRight, yPos, { align: "right" })
  doc.text("Solic.", colSolic, yPos, { align: "center" })
  doc.text("Armado", colAssembled, yPos, { align: "center" })
  doc.text("Total", colTotalRight, yPos, { align: "right" })
  yPos += 3
  doc.line(col1, yPos, pageWidth - margin, yPos)
  yPos += 5

  doc.setFont("helvetica", "normal")
  const items = order.order_items || []

  const resolveAssembled = (item: any) => {
    if (item.is_shortage === true) return item.quantity_assembled ?? 0
    if (item.quantity_assembled !== null && item.quantity_assembled !== undefined) return item.quantity_assembled
    return item.quantity_requested || 0
  }

  const fmtQty = (v: number, byWeight: boolean) =>
    byWeight ? `${v.toFixed(3)} kg` : Number.isInteger(v) ? v.toString() : v.toFixed(2)

  let assembledTotal = 0
  let totalWeightRequested = 0
  let totalWeightAssembled = 0

  items.forEach((item: any) => {
    const prod = item.products || {}
    const productName = `${prod.name || "Producto"} ${prod.brand || ""}`.trim().substring(0, 28)
    const quantityRequested = Number(item.quantity_requested) || 0
    const quantityAssembled = Number(resolveAssembled(item)) || 0
    const unitPrice = Number(item.unit_price) || 0
    const discount = Number(item.discount) || 0
    const byWeight = item.sale_unit === "peso"
    const refWeightKg = item.assembled_weight_kg != null ? Number(item.assembled_weight_kg) : null

    // Para items por peso: total = kg_balanza × precio/kg (no cantidad × precio)
    const lineTotal = byWeight
      ? Math.max(0, unitPrice * (refWeightKg ?? 0) - discount)
      : Math.max(0, unitPrice * quantityAssembled - discount)
    assembledTotal += lineTotal

    // Faltante: para items peso, comparar piezas; para unidad, comparar cantidades
    const hasShortage = item.is_shortage === true || quantityAssembled < quantityRequested

    // Acumulado de pesos para footer
    if (byWeight) {
      const estKg = prod.estimated_weight_kg ? Number(prod.estimated_weight_kg) : 0
      totalWeightRequested += quantityRequested * estKg
      totalWeightAssembled += refWeightKg ?? 0
    } else if (refWeightKg && refWeightKg > 0) {
      totalWeightAssembled += refWeightKg
      const unitWeight = !prod.allows_decimal_quantity && prod.weight ? Number(prod.weight) : 0
      if (unitWeight > 0) totalWeightRequested += quantityRequested * unitWeight
    } else {
      const unitWeight = !prod.allows_decimal_quantity && prod.weight ? Number(prod.weight) : 0
      if (unitWeight > 0) {
        totalWeightRequested += quantityRequested * unitWeight
        totalWeightAssembled += quantityAssembled * unitWeight
      }
    }

    if (yPos > 262) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(8)
    if (hasShortage) doc.setTextColor(200, 100, 0)
    doc.text(productName, col1, yPos)
    // Para items por peso: precio/kg; para unidad: precio/unidad
    doc.text(`$${unitPrice.toFixed(2)}${byWeight ? "/kg" : ""}`, colPriceRight, yPos, { align: "right" })
    // "Solic.": para items peso muestra piezas; para unidad muestra cantidad
    doc.text(byWeight ? `${quantityRequested}pz` : fmtQty(quantityRequested, false), colSolic, yPos, { align: "center" })
    // "Armado": para items peso muestra kg de balanza; para unidad muestra cantidad armada
    doc.text(byWeight ? (refWeightKg != null ? `${refWeightKg.toFixed(3)}kg` : "-") : fmtQty(quantityAssembled, false), colAssembled, yPos, { align: "center" })
    doc.text(`$${lineTotal.toFixed(2)}`, colTotalRight, yPos, { align: "right" })
    if (hasShortage) doc.setTextColor(0)

    if (hasShortage) {
      yPos += 4
      doc.setFontSize(7)
      doc.setTextColor(150, 80, 0)
      const motivo = item.shortage_reason ? ` (${item.shortage_reason})` : ""
      if (byWeight) {
        doc.text(`  Faltante: ${quantityRequested - quantityAssembled} pieza(s)${motivo}`, col1, yPos)
      } else {
        const faltante = quantityRequested - quantityAssembled
        doc.text(`  Faltante: ${fmtQty(faltante, false)}${motivo}`, col1, yPos)
      }
      doc.setFontSize(8)
      doc.setTextColor(0)
    }

    // Sub-línea de peso para items por peso
    if (byWeight && refWeightKg && refWeightKg > 0) {
      const estKg = prod.estimated_weight_kg ? Number(prod.estimated_weight_kg) : null
      yPos += 4
      doc.setFontSize(7)
      doc.setTextColor(120)
      let weightLine = `  Balanza: ${refWeightKg.toFixed(3)} kg`
      if (estKg && estKg > 0) {
        weightLine += ` (est. ${(quantityAssembled * estKg).toFixed(3)} kg)`
      } else {
        weightLine += ` (est. N/A)`
      }
      doc.text(weightLine, col1, yPos)
      doc.setFontSize(8)
      doc.setTextColor(0)
    } else if (!byWeight && refWeightKg && refWeightKg > 0) {
      yPos += 4
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text(`  Peso real: ${refWeightKg.toFixed(3)} kg`, col1, yPos)
      doc.setFontSize(8)
      doc.setTextColor(0)
    } else if (!byWeight) {
      const unitWeight = !prod.allows_decimal_quantity && prod.weight ? Number(prod.weight) : 0
      if (unitWeight > 0) {
        yPos += 4
        doc.setFontSize(7)
        doc.setTextColor(120)
        doc.text(
          `  Peso aprox.: ${(quantityAssembled * unitWeight).toFixed(2)} kg (${unitWeight.toFixed(2)} kg c/u)`,
          col1,
          yPos,
        )
        doc.setFontSize(8)
        doc.setTextColor(0)
      }
    }
    yPos += 6
  })

  yPos += 3
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 7

  // --- Totals ---
  const generalDiscount = Number(order.general_discount) || 0
  const finalAssembledTotal =
    order.total != null ? Number(order.total) : Math.max(0, assembledTotal - generalDiscount)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(`TOTAL: $${finalAssembledTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" })
  yPos += 8

  // --- Peso del pedido ---
  if (totalWeightAssembled > 0) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0)
    doc.text(`Peso armado: ${totalWeightAssembled.toFixed(2)} kg`, pageWidth - margin, yPos, { align: "right" })
    yPos += 8
  }

  // --- Status ---
  const hasShortages =
    order.has_shortages === true ||
    items.some((item: any) => {
      if (item.is_shortage === true) return true
      if (item.quantity_assembled !== null && item.quantity_assembled !== undefined) {
        return Number(item.quantity_assembled) < Number(item.quantity_requested)
      }
      return false
    })

  doc.setFontSize(10)
  if (hasShortages) {
    doc.setTextColor(200, 100, 0)
    doc.text("⚠ PEDIDO CON FALTANTES", margin, yPos)
  } else {
    doc.setTextColor(0, 100, 0)
    doc.text("✓ PEDIDO COMPLETO", margin, yPos)
  }
  doc.setTextColor(0)
  yPos += 10

  // Asegurar espacio para disclaimer + firmas (necesita ~35mm)
  if (yPos > 240) {
    doc.addPage()
    yPos = 20
  }

  // --- Disclaimer legal ---
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(90, 90, 90)
  const disclaimer =
    "Una vez verificado y firmado el presente documento, la distribuidora no aceptará reclamos por faltantes."
  const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - margin * 2)
  doc.text(splitDisclaimer, margin, yPos)
  yPos += splitDisclaimer.length * 5 + 10

  // --- Líneas de firma ---
  doc.setTextColor(0)
  doc.setFont("helvetica", "normal")
  doc.setDrawColor(0)
  const firmaY = yPos + 12
  doc.line(margin, firmaY, margin + 68, firmaY)
  doc.line(pageWidth - margin - 68, firmaY, pageWidth - margin, firmaY)
  doc.setFontSize(9)
  doc.text("Firma", margin + 34, firmaY + 5, { align: "center" })
  doc.text("Aclaración", pageWidth - margin - 34, firmaY + 5, { align: "center" })

  return doc
}

export const getAssemblyReceiptBlob = async (order: any, armadorName?: string): Promise<Blob> => {
  const doc = await generateAssemblyReceipt(order, armadorName)
  return doc.output("blob")
}

export const downloadAssemblyReceipt = async (order: any, armadorName?: string) => {
  const doc = await generateAssemblyReceipt(order, armadorName)
  doc.save(`Remito_${order.order_number}.pdf`)
}

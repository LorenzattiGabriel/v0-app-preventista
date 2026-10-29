import jsPDF from "jspdf"
import { ALEF_LOGO_URL, fetchLogoBase64 } from "./receipt-generator"

const toNum = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const fmtMoney = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const paymentMethodLabels: Record<string, string> = {
  Efectivo: "Efectivo",
  Transferencia: "Transferencia",
  "Tarjeta de Débito": "Tarjeta Débito",
  "Tarjeta de Crédito": "Tarjeta Crédito",
  "Cuenta Corriente": "Cta. Corriente",
  Cheque: "Cheque",
  Otro: "Otro",
}

export interface RouteSheetStop {
  position: number
  orderNumber: string
  customerName: string
  address: string
  locality?: string | null
  phone?: string | null
  hasTimeRestriction?: boolean
  windowStart?: string | null
  windowEnd?: string | null
  total: number
  status: string
  noDeliveryReason?: string | null
  paymentMethod?: string | null
}

export interface RouteSheetInfo {
  routeCode: string
  scheduledDate: string
  driverName?: string | null
  zoneName?: string | null
  status: string
}

export async function generateRouteSheetPDF(
  route: RouteSheetInfo,
  stops: RouteSheetStop[],
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  const ml = 13
  const mr = 13
  const usable = pageW - ml - mr
  let y = 12

  const logoBase64 = await fetchLogoBase64(ALEF_LOGO_URL)

  // ---- HEADER ----
  if (logoBase64) {
    const fmt = logoBase64.startsWith("data:image/png") ? "PNG" : "JPEG"
    doc.addImage(logoBase64, fmt, ml, y, 20, 20)
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(`Hoja de Ruta — ${route.routeCode}`, pageW / 2, y + 6, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(60)
  const infoLine = [
    `Fecha: ${new Date(route.scheduledDate + "T00:00:00").toLocaleDateString("es-AR")}`,
    route.driverName ? `Repartidor: ${route.driverName}` : null,
    route.zoneName ? `Zona: ${route.zoneName}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ")
  doc.text(infoLine, pageW / 2, y + 12, { align: "center" })

  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(`Impreso el ${new Date().toLocaleDateString("es-AR")}`, pageW / 2, y + 17, { align: "center" })
  doc.setTextColor(0)

  y += 26
  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(ml, y, pageW - mr, y)
  y += 2

  // ---- COLUMN POSITIONS ----
  const colPos = ml
  const colOrder = ml + 8
  const colCustomer = ml + 30
  const colTotal = pageW - mr - 2

  const drawTableHeader = (yy: number) => {
    doc.setFillColor(50, 50, 50)
    doc.rect(ml, yy, usable, 6.5, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text("#", colPos + 2, yy + 4.5)
    doc.text("Pedido", colOrder, yy + 4.5)
    doc.text("Cliente / Dirección", colCustomer, yy + 4.5)
    doc.text("Importe", colTotal, yy + 4.5, { align: "right" })
    doc.setTextColor(0)
    return yy + 8
  }

  y = drawTableHeader(y)

  const rowH = 12
  let rowIndex = 0

  const fitText = (text: string, maxWidthMm: number, fontSize: number): string => {
    doc.setFontSize(fontSize)
    const scale = fontSize / doc.internal.scaleFactor
    if (doc.getStringUnitWidth(text) * scale <= maxWidthMm) return text
    let t = text
    while (t.length > 0 && doc.getStringUnitWidth(t + "…") * scale > maxWidthMm) {
      t = t.slice(0, -1)
    }
    return t + "…"
  }

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageH - 14) {
      doc.addPage()
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text(`Hoja de Ruta — ${route.routeCode}`, pageW / 2, 8, { align: "center" })
      doc.setTextColor(0)
      doc.setLineWidth(0.3)
      doc.line(ml, 10, pageW - mr, 10)
      y = drawTableHeader(12)
      rowIndex = 0
    }
  }

  let totalValue = 0
  let deliveredCount = 0

  for (const stop of stops) {
    checkPageBreak(rowH)

    const isDelivered = stop.status === "ENTREGADO"
    const isNotDelivered = !!stop.noDeliveryReason && !isDelivered
    totalValue += stop.total
    if (isDelivered) deliveredCount++

    if (isDelivered) {
      doc.setFillColor(235, 250, 240)
    } else if (isNotDelivered) {
      doc.setFillColor(253, 237, 237)
    } else if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
    } else {
      doc.setFillColor(255, 255, 255)
    }
    doc.rect(ml, y - 4.5, usable, rowH, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(20)
    doc.text(String(stop.position), colPos + 2, y)

    doc.setFontSize(7.5)
    doc.text(stop.orderNumber, colOrder, y)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(20)
    const nameWidth = colTotal - 20 - colCustomer
    doc.text(fitText(stop.customerName, nameWidth, 8), colCustomer, y)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(90)
    const addressLine = [stop.address, stop.locality].filter(Boolean).join(", ")
    doc.text(fitText(addressLine, nameWidth, 7), colCustomer, y + 3.5)

    const detailParts: string[] = []
    if (stop.phone) detailParts.push(`Tel: ${stop.phone}`)
    if (stop.hasTimeRestriction && (stop.windowStart || stop.windowEnd)) {
      detailParts.push(`Horario: ${stop.windowStart ?? "?"}–${stop.windowEnd ?? "?"}`)
    }
    if (isDelivered && stop.paymentMethod) {
      detailParts.push(`Pago: ${paymentMethodLabels[stop.paymentMethod] || stop.paymentMethod}`)
    }
    if (isNotDelivered) detailParts.push(`No entregado: ${stop.noDeliveryReason}`)
    if (detailParts.length) {
      doc.setTextColor(120)
      doc.text(fitText(detailParts.join("  ·  "), nameWidth, 7), colCustomer, y + 7)
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(0)
    doc.text(fmtMoney(stop.total), colTotal, y, { align: "right" })

    if (isDelivered) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(0, 130, 60)
      doc.text("Entregado", colTotal, y + 4, { align: "right" })
    } else if (isNotDelivered) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(180, 0, 0)
      doc.text("No entregado", colTotal, y + 4, { align: "right" })
    }

    doc.setTextColor(0)
    y += rowH
    rowIndex++
  }

  // ---- SUMMARY ----
  checkPageBreak(18)
  y += 3
  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(ml, y, pageW - mr, y)
  y += 6

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60)
  doc.text(`Paradas: ${stops.length}  ·  Entregadas: ${deliveredCount}`, ml, y)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(0)
  doc.text(`TOTAL: ${fmtMoney(totalValue)}`, pageW - mr, y, { align: "right" })
  doc.setTextColor(0)

  // ---- FOOTER ----
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(140)
    doc.setLineWidth(0.2)
    doc.line(ml, pageH - 10, pageW - mr, pageH - 10)
    doc.text(`Página ${i} / ${totalPages}`, pageW / 2, pageH - 6, { align: "center" })
  }
  doc.setTextColor(0)

  return doc
}

import jsPDF from "jspdf"
import { ALEF_LOGO_URL, fetchLogoBase64 } from "./receipt-generator"

const fmtMoney = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export interface CierreCajaTotals {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  accountReceivable: number
}

export interface CierreCajaPaymentRow {
  method: string
  amount: number
  count: number
}

export interface CierreCajaSellerRow {
  sellerName: string
  sales: number
  revenue: number
}

export interface CierreCajaSaleRow {
  orderNumber: string
  createdAt: string
  sellerName: string
  customerName: string
  total: number
  paymentMethod: string
}

export async function generateCierreCajaPDF(
  dateLabel: string,
  totals: CierreCajaTotals,
  paymentBreakdown: CierreCajaPaymentRow[],
  sellerRanking: CierreCajaSellerRow[],
  sales: CierreCajaSaleRow[],
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
  doc.text("Cierre de Caja · Venta Directa", pageW / 2, y + 6, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(dateLabel, pageW / 2, y + 12, { align: "center" })

  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`Impreso el ${new Date().toLocaleDateString("es-AR")}`, pageW / 2, y + 17, { align: "center" })
  doc.setTextColor(0)

  y += 26
  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(ml, y, pageW - mr, y)
  y += 8

  // ---- TOTALES ----
  const boxW = (usable - 2 * 4) / 3
  const totalsBoxes: Array<[string, string]> = [
    ["Total vendido", fmtMoney(totals.totalRevenue)],
    [`Ventas (tkt. prom. ${fmtMoney(totals.averageTicket)})`, String(totals.totalSales)],
    ["A cuenta corriente", fmtMoney(totals.accountReceivable)],
  ]
  totalsBoxes.forEach(([label, value], i) => {
    const x = ml + i * (boxW + 4)
    doc.setDrawColor(200)
    doc.roundedRect(x, y, boxW, 18, 1.5, 1.5)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(100)
    doc.text(label, x + 3, y + 6, { maxWidth: boxW - 6 })
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(value, x + 3, y + 14)
  })
  y += 26

  // ---- DESGLOSE POR MÉTODO DE PAGO ----
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Desglose por método de pago", ml, y)
  y += 6

  if (paymentBreakdown.length === 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text("Sin ventas este día", ml, y)
    doc.setTextColor(0)
    y += 8
  } else {
    const cols = 3
    const pBoxW = (usable - (cols - 1) * 4) / cols
    paymentBreakdown.forEach((p, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = ml + col * (pBoxW + 4)
      const yy = y + row * 16
      doc.setDrawColor(210)
      doc.rect(x, yy, pBoxW, 14)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(100)
      doc.text(p.method, x + 2.5, yy + 5, { maxWidth: pBoxW - 5 })
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9.5)
      doc.setTextColor(0)
      doc.text(fmtMoney(p.amount), x + 2.5, yy + 11)
    })
    y += Math.ceil(paymentBreakdown.length / cols) * 16 + 6
  }

  // ---- POR VENDEDOR ----
  if (sellerRanking.length > 1) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Por vendedor", ml, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    sellerRanking.forEach((s) => {
      doc.setTextColor(20)
      doc.text(s.sellerName, ml + 2, y)
      doc.setTextColor(90)
      doc.text(`${s.sales} venta${s.sales !== 1 ? "s" : ""}`, ml + 70, y)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0)
      doc.text(fmtMoney(s.revenue), pageW - mr, y, { align: "right" })
      doc.setFont("helvetica", "normal")
      y += 5.5
    })
    y += 4
  }

  // ---- TABLA DE VENTAS ----
  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(ml, y, pageW - mr, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(`Ventas del día (${sales.length})`, ml, y)
  y += 4

  const colHora = ml
  const colPedido = ml + 16
  const colCliente = ml + 42
  const colVendedor = ml + 95
  const colMetodo = ml + 130
  const colTotal = pageW - mr - 2

  const drawTableHeader = (yy: number) => {
    doc.setFillColor(50, 50, 50)
    doc.rect(ml, yy, usable, 6.5, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.text("Hora", colHora + 2, yy + 4.5)
    doc.text("Pedido", colPedido + 2, yy + 4.5)
    doc.text("Cliente", colCliente + 2, yy + 4.5)
    doc.text("Vendedor", colVendedor + 2, yy + 4.5)
    doc.text("Método", colMetodo + 2, yy + 4.5)
    doc.text("Total", colTotal, yy + 4.5, { align: "right" })
    doc.setTextColor(0)
    // Mismo ajuste que en el resto de los PDFs: la franja de la primera fila
    // se dibuja 4.5mm arriba de su baseline, así que el header necesita
    // 11.5mm de alto total (no 8) para que no se pisen.
    return yy + 11.5
  }

  y = drawTableHeader(y)

  const rowH = 6
  let rowIndex = 0

  const fitText = (text: string, maxWidthMm: number): string => {
    const scale = doc.getFontSize() / doc.internal.scaleFactor
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
      doc.text(`Cierre de Caja · ${dateLabel}`, pageW / 2, 8, { align: "center" })
      doc.setTextColor(0)
      doc.setLineWidth(0.3)
      doc.line(ml, 10, pageW - mr, 10)
      y = drawTableHeader(12)
      rowIndex = 0
    }
  }

  if (sales.length === 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text("No hay ventas registradas este día", ml, y + 2)
    doc.setTextColor(0)
  }

  for (const s of sales) {
    checkPageBreak(rowH)

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(ml, y - 4.2, usable, rowH, "F")
    }

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(20)
    const hora = new Date(s.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    doc.text(hora, colHora + 2, y)
    doc.text(fitText(s.orderNumber, colCliente - colPedido - 4), colPedido + 2, y)
    doc.text(fitText(s.customerName, colVendedor - colCliente - 4), colCliente + 2, y)
    doc.text(fitText(s.sellerName, colMetodo - colVendedor - 4), colVendedor + 2, y)
    doc.text(fitText(s.paymentMethod, colTotal - colMetodo - 24), colMetodo + 2, y)
    doc.setFont("helvetica", "bold")
    doc.text(fmtMoney(s.total), colTotal, y, { align: "right" })

    y += rowH
    rowIndex++
  }

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

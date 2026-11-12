import jsPDF from "jspdf"
import { ALEF_LOGO_URL, fetchLogoBase64 } from "./receipt-generator"

const toNum = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const fmtMoney = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const movementTypeLabels: Record<string, string> = {
  DEUDA_PEDIDO: "Deuda por pedido",
  VENTA: "Venta",
  PAGO_EFECTIVO: "Pago (efectivo)",
  PAGO_TRANSFERENCIA: "Pago (transferencia)",
  PAGO_TARJETA: "Pago (tarjeta)",
  PAGO_CHEQUE: "Pago (cheque)",
  PAGO_CUENTA_CORRIENTE: "Pago (cta. cte.)",
  PAGO_OTRO: "Pago (otro)",
  AJUSTE_CREDITO: "Ajuste a favor",
  AJUSTE_DEBITO: "Ajuste en contra",
  NOTA_CREDITO: "Nota de crédito",
  PAGO_ADELANTADO: "Pago adelantado",
}

export interface AccountMovementForStatement {
  id: string
  movement_type: string
  description?: string | null
  notes?: string | null
  debit_amount?: number | string | null
  credit_amount?: number | string | null
  balance_after?: number | string | null
  created_at: string
  orders?: { order_number?: string } | null
}

export interface CustomerForStatement {
  commercial_name: string
  code?: string | null
  contact_name?: string | null
  tax_id?: string | null
  phone?: string | null
  current_balance?: number | string | null
  credit_limit?: number | string | null
}

export async function generateAccountStatementPDF(
  customer: CustomerForStatement,
  movements: AccountMovementForStatement[],
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
  doc.text("Estado de Cuenta Corriente", pageW / 2, y + 6, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(80)
  doc.text(`Impreso el ${new Date().toLocaleDateString("es-AR")}`, pageW / 2, y + 11, { align: "center" })
  doc.setTextColor(0)

  y += 24

  // ---- CUSTOMER INFO BOX ----
  doc.setDrawColor(200)
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(ml, y, usable, 20, 1.5, 1.5, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(20)
  doc.text(customer.commercial_name, ml + 3, y + 7)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(90)
  const infoLine = [
    customer.code ? `Código: ${customer.code}` : null,
    customer.contact_name ? `Contacto: ${customer.contact_name}` : null,
    customer.tax_id ? `CUIT/CUIL: ${customer.tax_id}` : null,
    customer.phone ? `Tel: ${customer.phone}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ")
  doc.text(infoLine, ml + 3, y + 13)
  doc.setTextColor(0)
  y += 25

  // ---- COLUMN POSITIONS ----
  // Debe/Haber/Saldo están alineados a la derecha: el ancla (colX) es el borde
  // DERECHO del número, que se extiende hacia la izquierda según su propio
  // ancho (hasta ~18.4mm para "$ -1.234.567,89" en bold 7.5pt, medido con
  // jsPDF). Si el cap de "Detalle" no deja ese espacio libre antes del ancla,
  // el texto se superpone con el monto — por eso cada columna de plata
  // reserva 23mm (20 de ancho + 3 de aire) antes de la siguiente.
  const colDate = ml
  const colType = ml + 19
  const colDetail = ml + 51
  const colBalance = pageW - mr - 2
  const colCredit = colBalance - 23
  const colDebit = colCredit - 23

  const drawTableHeader = (yy: number) => {
    doc.setFillColor(50, 50, 50)
    doc.rect(ml, yy, usable, 6.5, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text("Fecha", colDate + 2, yy + 4.5)
    doc.text("Movimiento", colType + 2, yy + 4.5)
    doc.text("Detalle", colDetail + 2, yy + 4.5)
    doc.text("Debe", colDebit, yy + 4.5, { align: "right" })
    doc.text("Haber", colCredit, yy + 4.5, { align: "right" })
    doc.text("Saldo", colBalance, yy + 4.5, { align: "right" })
    doc.setTextColor(0)
    return yy + 8
  }

  y = drawTableHeader(y)

  const rowH = 6.5
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
      doc.text(`Estado de Cuenta · ${customer.commercial_name}`, pageW / 2, 8, { align: "center" })
      doc.setTextColor(0)
      doc.setLineWidth(0.3)
      doc.line(ml, 10, pageW - mr, 10)
      y = drawTableHeader(12)
      rowIndex = 0
    }
  }

  // Movimientos vienen de más nuevo a más viejo; para leer el estado de cuenta
  // de forma cronológica los invertimos (más viejo primero).
  const chronological = [...movements].reverse()

  let totalDebit = 0
  let totalCredit = 0

  for (const m of chronological) {
    checkPageBreak(rowH)

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(ml, y - 4.5, usable, rowH, "F")
    }

    const debit = toNum(m.debit_amount)
    const credit = toNum(m.credit_amount)
    const balance = toNum(m.balance_after)
    totalDebit += debit
    totalCredit += credit

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(20)
    doc.text(new Date(m.created_at).toLocaleDateString("es-AR"), colDate + 2, y)

    const typeLabel = movementTypeLabels[m.movement_type] || m.movement_type
    doc.text(fitText(typeLabel, colDetail - colType - 4), colType + 2, y)

    const detailParts = [
      m.orders?.order_number ? `Pedido ${m.orders.order_number}` : null,
      m.description || null,
    ].filter(Boolean)
    doc.setTextColor(90)
    // -23 reserva el espacio que ocupa el número de "Debe" hacia la izquierda
    // de su propia ancla (ver comentario en COLUMN POSITIONS).
    doc.text(fitText(detailParts.join(" · "), colDebit - 23 - colDetail - 2), colDetail + 2, y)

    doc.setFont("helvetica", "bold")
    doc.setTextColor(debit > 0 ? 180 : 180, debit > 0 ? 0 : 180, debit > 0 ? 0 : 180)
    doc.text(debit > 0 ? fmtMoney(debit) : "-", colDebit, y, { align: "right" })

    doc.setTextColor(credit > 0 ? 0 : 180, credit > 0 ? 120 : 180, credit > 0 ? 0 : 180)
    doc.text(credit > 0 ? fmtMoney(credit) : "-", colCredit, y, { align: "right" })

    doc.setTextColor(0)
    doc.text(fmtMoney(balance), colBalance, y, { align: "right" })

    y += rowH
    rowIndex++
  }

  // ---- SUMMARY ----
  checkPageBreak(26)
  y += 3
  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(ml, y, pageW - mr, y)
  y += 6

  const finalBalance = toNum(customer.current_balance)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60)
  doc.text(`Total Debe: ${fmtMoney(totalDebit)}`, ml, y)
  doc.text(`Total Haber: ${fmtMoney(totalCredit)}`, ml + 65, y)
  y += 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(finalBalance > 0 ? 180 : finalBalance < 0 ? 0 : 60, finalBalance > 0 ? 0 : finalBalance < 0 ? 120 : 60, 0)
  const balanceLabel = finalBalance > 0 ? "SALDO: DEBE" : finalBalance < 0 ? "SALDO: A FAVOR" : "SALDO: $ 0,00"
  doc.text(
    finalBalance !== 0 ? `${balanceLabel} ${fmtMoney(Math.abs(finalBalance))}` : balanceLabel,
    ml,
    y,
  )
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
    doc.text(
      `${movements.length} movimiento${movements.length !== 1 ? "s" : ""} · Página ${i} / ${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" },
    )
  }
  doc.setTextColor(0)

  return doc
}

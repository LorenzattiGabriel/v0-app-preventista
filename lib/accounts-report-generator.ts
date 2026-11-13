import jsPDF from "jspdf"
import { ALEF_LOGO_URL, fetchLogoBase64 } from "./receipt-generator"

const toNum = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const fmtMoney = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export interface CustomerForAccountsReport {
  id: string
  code?: string | null
  commercial_name: string
  contact_name?: string | null
  customer_type?: string | null
  current_balance?: number | string | null
  credit_limit?: number | string | null
}

export async function generateAccountsReportPDF(
  customers: CustomerForAccountsReport[],
  filterLabel?: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  const ml = 13
  const mr = 13
  const usable = pageW - ml - mr
  let y = 12

  const logoBase64 = await fetchLogoBase64(ALEF_LOGO_URL)

  const sorted = [...customers].sort((a, b) => toNum(b.current_balance) - toNum(a.current_balance))

  const totalDebt = sorted.reduce((s, c) => s + Math.max(0, toNum(c.current_balance)), 0)
  const totalCredit = sorted.reduce((s, c) => s + Math.max(0, -toNum(c.current_balance)), 0)
  const customersWithDebt = sorted.filter((c) => toNum(c.current_balance) > 0).length
  const customersWithCredit = sorted.filter((c) => toNum(c.current_balance) < 0).length

  // ---- HEADER ----
  const headerH = filterLabel ? 27 : 22
  if (logoBase64) {
    const fmt = logoBase64.startsWith("data:image/png") ? "PNG" : "JPEG"
    doc.addImage(logoBase64, fmt, ml, y, 20, 20)
  }

  // El título refleja si hay un filtro activo — antes decía siempre
  // "Reporte General" aunque se hubiera filtrado por localidad/tipo/saldo,
  // lo que hacía parecer que el PDF ignoraba el filtro aunque los datos de
  // adentro sí estuvieran filtrados.
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(
    filterLabel ? "Reporte de Cuentas Corrientes (filtrado)" : "Reporte General de Cuentas Corrientes",
    pageW / 2,
    y + 6,
    { align: "center" },
  )

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(80)
  doc.text(`Impreso el ${new Date().toLocaleDateString("es-AR")}`, pageW / 2, y + 11, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(40)
  doc.text(
    `Clientes con deuda: ${customersWithDebt}  ·  Total a cobrar: ${fmtMoney(totalDebt)}  ·  Total a favor: ${fmtMoney(totalCredit)}`,
    pageW / 2,
    y + 17,
    { align: "center" },
  )

  if (filterLabel) {
    // Más visible que antes (7.5pt gris pasaba desapercibido): el filtro
    // aplicado es la parte más importante de este reporte cuando existe.
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(180, 40, 40)
    doc.text(`Filtros: ${filterLabel}`, pageW / 2, y + 22, { align: "center" })
  }
  doc.setTextColor(0)

  y += headerH
  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(ml, y, pageW - mr, y)
  y += 2

  // ---- COLUMN POSITIONS ----
  const colCustomer = ml
  const colType = pageW - mr - 85
  const colBalance = pageW - mr - 40
  const colLimit = pageW - mr - 2

  const drawTableHeader = (yy: number) => {
    doc.setFillColor(50, 50, 50)
    doc.rect(ml, yy, usable, 6.5, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text("Cliente", colCustomer + 2, yy + 4.5)
    doc.text("Tipo", colType, yy + 4.5, { align: "right" })
    doc.text("Saldo", colBalance, yy + 4.5, { align: "right" })
    doc.text("Límite crédito", colLimit, yy + 4.5, { align: "right" })
    doc.setTextColor(0)
    // La barra del header mide 6.5mm (yy a yy+6.5). La cebra de cada fila se
    // dibuja 4.5mm *arriba* de su baseline (ver loop de filas) para quedar
    // centrada — con solo +8 acá, la cebra de la primera fila arrancaba en
    // yy+3.5, pisando 3mm del header y arruinando el texto de las columnas.
    return yy + 11.5
  }

  y = drawTableHeader(y)

  const rowH = 7.5
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
      doc.text("Reporte General de Cuentas Corrientes", pageW / 2, 8, { align: "center" })
      doc.setTextColor(0)
      doc.setLineWidth(0.3)
      doc.line(ml, 10, pageW - mr, 10)
      y = drawTableHeader(12)
      rowIndex = 0
    }
  }

  for (const c of sorted) {
    checkPageBreak(rowH)

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(ml, y - 4.5, usable, rowH, "F")
    }

    const balance = toNum(c.current_balance)
    const creditLimit = toNum(c.credit_limit)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(20)
    const nameWidth = colType - 6 - (colCustomer + 2)
    doc.text(fitText(c.commercial_name, nameWidth), colCustomer + 2, y)

    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    const subLabel = [c.code, c.contact_name].filter(Boolean).join(" · ")
    if (subLabel) doc.text(fitText(subLabel, nameWidth), colCustomer + 2, y + 3.2)

    doc.setTextColor(90)
    doc.text(c.customer_type === "mayorista" ? "Mayorista" : "Minorista", colType, y, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setTextColor(balance > 0 ? 180 : balance < 0 ? 0 : 120, balance > 0 ? 0 : balance < 0 ? 120 : 120, balance > 0 ? 0 : balance < 0 ? 0 : 120)
    doc.text(balance !== 0 ? fmtMoney(balance) : "-", colBalance, y, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(creditLimit > 0 ? fmtMoney(creditLimit) : "-", colLimit, y, { align: "right" })

    doc.setTextColor(0)
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
    doc.text(
      `${sorted.length} cliente${sorted.length !== 1 ? "s" : ""} · Página ${i} / ${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" },
    )
  }
  doc.setTextColor(0)

  return doc
}

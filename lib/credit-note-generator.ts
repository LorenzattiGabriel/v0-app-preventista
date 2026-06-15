import jsPDF from "jspdf"
import { ALEF_LOGO_URL, fetchLogoBase64 } from "@/lib/receipt-generator"
import type { CreditNote, CreditNoteDisposition, CreditNoteItem, CreditNoteResolution } from "@/lib/types/database"

/**
 * Comprobante PDF de Nota de Crédito.
 * Replica el formato del REMITO (logo, cabecera, datos del cliente, tabla, totales)
 * para mantener consistencia visual con el resto de los comprobantes.
 */

const RESOLUTION_LABELS: Record<CreditNoteResolution, string> = {
  reemplazo: "Reemplazo de producto",
  saldo_favor: "Saldo a favor en cuenta",
  devolucion_dinero: "Devolución de dinero",
}

const DISPOSITION_LABELS: Record<CreditNoteDisposition, string> = {
  reintegrar: "Reintegra al stock",
  dejar_cliente: "Queda con el cliente",
  desechar: "Desecho",
}

interface CreditNoteCustomer {
  commercial_name?: string
  street?: string
  street_number?: string
  locality?: string
  province?: string
  phone?: string
  tax_id?: string
}

/** Datos mínimos que el generador necesita (la NC + cliente + nº de pedido de referencia). */
export interface CreditNoteForPdf extends CreditNote {
  customer?: CreditNoteCustomer
  order_number?: string | null
}

const fmtCurrency = (n: number) => `$${(Number(n) || 0).toFixed(2)}`

const fmtQty = (n: number) => (Number.isInteger(n) ? n.toString() : Number(n).toFixed(2))

export const generateCreditNote = async (creditNote: CreditNoteForPdf) => {
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
  doc.setFontSize(18)
  doc.text("NOTA DE CRÉDITO", pageWidth / 2, yPos + 10, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Nº: ${creditNote.credit_note_number}`, pageWidth - margin, yPos + 5, { align: "right" })
  doc.text(
    `Fecha: ${new Date(creditNote.created_at).toLocaleDateString("es-AR")}`,
    pageWidth - margin,
    yPos + 11,
    { align: "right" },
  )
  if (creditNote.invoice_type) {
    doc.text(`Tipo: ${creditNote.invoice_type}`, pageWidth - margin, yPos + 17, { align: "right" })
  }

  yPos += 24

  if (creditNote.order_number) {
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Pedido de referencia: ${creditNote.order_number}`, margin, yPos)
    doc.setTextColor(0)
    yPos += 6
  }

  // --- Separator ---
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 7

  // --- Datos del cliente ---
  const customer = creditNote.customer || {}
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("DATOS DEL CLIENTE", margin, yPos)
  yPos += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Cliente: ${customer.commercial_name || "Sin nombre"}`, margin, yPos)
  yPos += 5
  if (customer.street) {
    doc.text(`Dirección: ${customer.street} ${customer.street_number || ""}`, margin, yPos)
    yPos += 5
  }
  if (customer.locality) {
    doc.text(
      `Localidad: ${customer.locality}${customer.province ? `, ${customer.province}` : ""}`,
      margin,
      yPos,
    )
    yPos += 5
  }
  if (customer.phone) {
    doc.text(`Tel: ${customer.phone}`, margin, yPos)
    yPos += 5
  }
  yPos += 4

  // --- Motivo / resolución ---
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 7
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text(`Resolución: ${RESOLUTION_LABELS[creditNote.resolution_type]}`, margin, yPos)
  yPos += 5
  doc.setFont("helvetica", "normal")
  doc.text(`Motivo: ${creditNote.reason}`, margin, yPos)
  yPos += 5
  if (creditNote.authorized_by) {
    doc.text(`Autorizado por: ${creditNote.authorized_by}`, margin, yPos)
    yPos += 5
  }
  yPos += 3

  const items: CreditNoteItem[] = creditNote.items || []
  const returned = items.filter((i) => i.line_type === "devuelto")
  const replacements = items.filter((i) => i.line_type === "reemplazo")

  // --- Tabla: productos devueltos ---
  const col1 = margin
  const colQty = 110
  const colPrice = 150
  const colTotal = pageWidth - margin

  const drawTableHeader = (title: string) => {
    doc.setDrawColor(180)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(title, margin, yPos)
    yPos += 7
    doc.setFontSize(8)
    doc.text("Producto", col1, yPos)
    doc.text("Cant.", colQty, yPos, { align: "center" })
    doc.text("P. Unit.", colPrice, yPos, { align: "right" })
    doc.text("Total", colTotal, yPos, { align: "right" })
    yPos += 3
    doc.line(col1, yPos, pageWidth - margin, yPos)
    yPos += 5
    doc.setFont("helvetica", "normal")
  }

  const drawRow = (item: CreditNoteItem, extra?: string) => {
    if (yPos > 262) {
      doc.addPage()
      yPos = 20
    }
    doc.setFontSize(8)
    doc.text(item.product_name.substring(0, 40), col1, yPos)
    doc.text(fmtQty(item.quantity), colQty, yPos, { align: "center" })
    doc.text(fmtCurrency(item.unit_price), colPrice, yPos, { align: "right" })
    doc.text(fmtCurrency(item.subtotal), colTotal, yPos, { align: "right" })
    if (extra) {
      yPos += 4
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text(`  ${extra}`, col1, yPos)
      doc.setTextColor(0)
    }
    yPos += 6
  }

  drawTableHeader("PRODUCTOS DEVUELTOS")
  returned.forEach((item) =>
    drawRow(item, item.disposition ? DISPOSITION_LABELS[item.disposition] : undefined),
  )

  // --- Total devuelto ---
  yPos += 1
  doc.setDrawColor(120)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`TOTAL: ${fmtCurrency(creditNote.amount)}`, colTotal, yPos, { align: "right" })
  doc.setFont("helvetica", "normal")
  yPos += 8

  // --- Tabla: productos de reemplazo (si aplica) ---
  if (replacements.length > 0) {
    drawTableHeader("PRODUCTOS DE REEMPLAZO ENTREGADOS")
    replacements.forEach((item) => drawRow(item))
    yPos += 2
  }

  // --- Nota de impacto en cuenta ---
  doc.setFontSize(8)
  doc.setTextColor(120)
  const accountNote = creditNote.affects_account
    ? "Esta nota de crédito acreditó el monto en la cuenta corriente del cliente."
    : "Esta nota de crédito no genera movimiento en la cuenta corriente."
  doc.text(accountNote, margin, yPos)
  doc.setTextColor(0)

  return doc
}

export const downloadCreditNote = async (creditNote: CreditNoteForPdf) => {
  const doc = await generateCreditNote(creditNote)
  doc.save(`Nota_Credito_${creditNote.credit_note_number}.pdf`)
}

export const getCreditNoteBlob = async (creditNote: CreditNoteForPdf): Promise<Blob> => {
  const doc = await generateCreditNote(creditNote)
  return doc.output("blob")
}

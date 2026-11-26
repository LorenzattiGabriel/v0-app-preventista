import jsPDF from "jspdf"
import { ALEF_LOGO_URL, fetchLogoBase64 } from "@/lib/receipt-generator"
import type { DebitNote } from "@/lib/types/database"

/**
 * Comprobante PDF de Nota de Débito.
 * Replica el formato de la Nota de Crédito (logo, cabecera, datos del
 * cliente, motivo, monto) para mantener consistencia visual.
 */

interface DebitNoteCustomer {
  commercial_name?: string
  street?: string
  street_number?: string
  locality?: string
  province?: string
  phone?: string
}

/** Datos mínimos que el generador necesita (la ND + cliente + nº de pedido de referencia). */
export interface DebitNoteForPdf extends DebitNote {
  customer?: DebitNoteCustomer
  order_number?: string | null
}

const fmtCurrency = (n: number) => `$${(Number(n) || 0).toFixed(2)}`

export const generateDebitNote = async (debitNote: DebitNoteForPdf) => {
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
  doc.text("NOTA DE DÉBITO", pageWidth / 2, yPos + 10, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Nº: ${debitNote.debit_note_number}`, pageWidth - margin, yPos + 5, { align: "right" })
  doc.text(
    `Fecha: ${new Date(debitNote.created_at).toLocaleDateString("es-AR")}`,
    pageWidth - margin,
    yPos + 11,
    { align: "right" },
  )

  yPos += 24

  if (debitNote.order_number) {
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Pedido de referencia: ${debitNote.order_number}`, margin, yPos)
    doc.setTextColor(0)
    yPos += 6
  }

  // --- Separator ---
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 7

  // --- Datos del cliente ---
  const customer = debitNote.customer || {}
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

  // --- Motivo ---
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 7
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Motivo", margin, yPos)
  yPos += 5
  doc.setFont("helvetica", "normal")
  const reasonLines = doc.splitTextToSize(debitNote.reason, pageWidth - margin * 2)
  doc.text(reasonLines, margin, yPos)
  yPos += reasonLines.length * 5 + 4

  if (debitNote.notes) {
    doc.setFontSize(8)
    doc.setTextColor(120)
    const notesLines = doc.splitTextToSize(`Notas: ${debitNote.notes}`, pageWidth - margin * 2)
    doc.text(notesLines, margin, yPos)
    doc.setTextColor(0)
    yPos += notesLines.length * 4.5 + 4
  }

  // --- Total ---
  yPos += 2
  doc.setDrawColor(120)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(`TOTAL: ${fmtCurrency(debitNote.amount)}`, pageWidth - margin, yPos, { align: "right" })
  doc.setFont("helvetica", "normal")
  yPos += 10

  // --- Nota de impacto en cuenta ---
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    "Esta nota de débito incrementó la deuda en la cuenta corriente del cliente.",
    margin,
    yPos,
  )
  doc.setTextColor(0)

  return doc
}

export const downloadDebitNote = async (debitNote: DebitNoteForPdf) => {
  const doc = await generateDebitNote(debitNote)
  doc.save(`Nota_Debito_${debitNote.debit_note_number}.pdf`)
}

export const getDebitNoteBlob = async (debitNote: DebitNoteForPdf): Promise<Blob> => {
  const doc = await generateDebitNote(debitNote)
  return doc.output("blob")
}

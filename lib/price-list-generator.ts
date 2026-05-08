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

export interface PriceListProduct {
  code?: string
  name: string
  brand?: string
  category?: string
  unit_of_measure?: string
  base_price: number
  wholesale_price?: number | null
  retail_price?: number | null
}

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toFixed(2)}` : "-"

export async function generatePriceListPDF(
  products: PriceListProduct[],
  filterLabel?: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 12
  let yPos = 12

  const logoBase64 = await fetchLogoBase64(ALEF_LOGO_URL)

  // --- Header ---
  if (logoBase64) {
    const fmt2 = logoBase64.startsWith("data:image/png") ? "PNG" : "JPEG"
    doc.addImage(logoBase64, fmt2, margin, yPos, 32, 16)
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("LISTA DE PRECIOS", pageWidth / 2, yPos + 8, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    `Fecha: ${new Date().toLocaleDateString("es-AR")}`,
    pageWidth - margin,
    yPos + 5,
    { align: "right" },
  )
  doc.text(
    `${products.length} producto${products.length !== 1 ? "s" : ""}`,
    pageWidth - margin,
    yPos + 11,
    { align: "right" },
  )
  if (filterLabel) {
    doc.text(filterLabel, pageWidth - margin, yPos + 17, { align: "right" })
  }
  doc.setTextColor(0)

  yPos += 22
  doc.setDrawColor(180)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 6

  // --- Column layout (portrait 210mm, margins 12mm each = 186mm usable) ---
  // Código(15) | Producto(62) | Marca(32) | Categoría(28) | U.M.(12) | P.Base(18) | P.Mayor(19)
  const cols = {
    code:      margin,           // left-aligned
    name:      margin + 15,      // left-aligned
    brand:     margin + 77,      // left-aligned
    category:  margin + 109,     // left-aligned
    um:        margin + 137,     // center
    base:      margin + 152,     // right-aligned → +18
    wholesale: margin + 174,     // right-aligned → +12 = 186 → pageWidth-margin
  }

  // Table header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, yPos - 4, pageWidth - margin * 2, 7, "F")
  doc.text("Código", cols.code, yPos)
  doc.text("Producto", cols.name, yPos)
  doc.text("Marca", cols.brand, yPos)
  doc.text("Categoría", cols.category, yPos)
  doc.text("U.M.", cols.um, yPos, { align: "center" })
  doc.text("P. Base", cols.base + 9, yPos, { align: "right" })
  doc.text("P. Mayor", cols.wholesale + 12, yPos, { align: "right" })
  yPos += 4
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 4

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)

  let rowIndex = 0
  for (const product of products) {
    // Page break
    if (yPos > pageHeight - 20) {
      doc.addPage()
      yPos = 15

      // Repeat header on new page
      doc.setFont("helvetica", "bold")
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 7, "F")
      doc.text("Código", cols.code, yPos)
      doc.text("Producto", cols.name, yPos)
      doc.text("Marca", cols.brand, yPos)
      doc.text("Categoría", cols.category, yPos)
      doc.text("U.M.", cols.um, yPos, { align: "center" })
      doc.text("P. Base", cols.base + 9, yPos, { align: "right" })
      doc.text("P. Mayor", cols.wholesale + 12, yPos, { align: "right" })
      yPos += 4
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 4
      doc.setFont("helvetica", "normal")
    }

    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, yPos - 3.5, pageWidth - margin * 2, 5.5, "F")
    }

    const name = (product.name || "").substring(0, 34)
    const brand = (product.brand || "").substring(0, 16)
    const category = (product.category || "").substring(0, 14)
    const um = (product.unit_of_measure || "").substring(0, 6)

    doc.setTextColor(80)
    doc.text(product.code || "-", cols.code, yPos)
    doc.setTextColor(0)
    doc.text(name, cols.name, yPos)
    doc.setTextColor(60)
    doc.text(brand, cols.brand, yPos)
    doc.text(category, cols.category, yPos)
    doc.setTextColor(0)
    doc.text(um, cols.um, yPos, { align: "center" })
    doc.setFont("helvetica", "bold")
    doc.text(fmt(product.base_price), cols.base + 9, yPos, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.setTextColor(product.wholesale_price ? 0 : 150)
    doc.text(fmt(product.wholesale_price), cols.wholesale + 12, yPos, { align: "right" })
    doc.setTextColor(0)

    yPos += 5.5
    rowIndex++
  }

  // Footer line
  doc.setDrawColor(180)
  doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2)
  yPos += 7
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    `Lista de precios generada el ${new Date().toLocaleDateString("es-AR")} — ${products.length} productos`,
    pageWidth / 2,
    yPos,
    { align: "center" },
  )

  return doc
}

export function generatePriceListCSV(products: PriceListProduct[]): string {
  const headers = ["Código", "Nombre", "Marca", "Categoría", "Unidad", "Precio Base", "Precio Mayorista", "Precio Minorista"]
  const rows = products.map((p) => [
    p.code || "",
    p.name,
    p.brand || "",
    p.category || "",
    p.unit_of_measure || "",
    Number(p.base_price).toFixed(2),
    p.wholesale_price != null ? Number(p.wholesale_price).toFixed(2) : "",
    p.retail_price != null ? Number(p.retail_price).toFixed(2) : "",
  ])

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

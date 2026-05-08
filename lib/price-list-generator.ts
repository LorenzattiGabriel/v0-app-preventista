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

const fmtPrice = (n: number | null | undefined) =>
  n != null ? `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"

export type GroupBy = "category" | "brand"

function groupProducts(products: PriceListProduct[], groupBy: GroupBy): Map<string, PriceListProduct[]> {
  const map = new Map<string, PriceListProduct[]>()
  for (const p of products) {
    const key = groupBy === "brand"
      ? (p.brand || "SIN MARCA").toUpperCase()
      : (p.category || "SIN CATEGORÍA").toUpperCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.name.localeCompare(b.name, "es"))
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b, "es")))
}

export async function generatePriceListPDF(
  products: PriceListProduct[],
  filterLabel?: string,
  groupBy: GroupBy = "category",
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.width   // 210
  const pageH = doc.internal.pageSize.height  // 297
  const ml = 13  // left margin
  const mr = 13  // right margin
  const usable = pageW - ml - mr            // 184mm
  let y = 12

  const logoBase64 = await fetchLogoBase64(ALEF_LOGO_URL)

  // ---- HEADER ----
  const headerH = 22
  if (logoBase64) {
    const fmt2 = logoBase64.startsWith("data:image/png") ? "PNG" : "JPEG"
    doc.addImage(logoBase64, fmt2, ml, y, 20, 20)
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("Listado de Precios", pageW / 2, y + 7, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(80)
  const groupLabel = groupBy === "brand" ? "Agrupado por marca" : "Agrupado por categoría"
  doc.text(`Impreso el ${new Date().toLocaleDateString("es-AR")} · ${groupLabel}`, pageW / 2, y + 13, { align: "center" })
  if (filterLabel) {
    doc.text(filterLabel, pageW / 2, y + 18, { align: "center" })
  }
  doc.setTextColor(0)

  y += headerH
  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(ml, y, pageW - mr, y)
  y += 2

  // ---- COLUMN POSITIONS ----
  // Usable: 184mm. Two price cols of 32mm each on the right, rest is product name.
  const colProduct = ml
  const colBase = pageW - mr - 34       // right-align anchor for P.Base
  const colWholesale = pageW - mr - 2   // right-align anchor for P.Mayor (2mm inner padding)

  const drawTableHeader = (yy: number) => {
    doc.setFillColor(50, 50, 50)
    doc.rect(ml, yy, usable, 6.5, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text("Producto", colProduct + 2, yy + 4.5)
    doc.text("P. Base", colBase, yy + 4.5, { align: "right" })
    doc.text("P. Mayor", colWholesale, yy + 4.5, { align: "right" })
    doc.setTextColor(0)
    return yy + 8
  }

  y = drawTableHeader(y)

  // ---- ROWS ----
  const grouped = groupProducts(products, groupBy)
  const rowH = 5.5
  let rowIndex = 0

  // Trunca texto al ancho disponible (en mm) agregando "…" si no entra
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
      // page header repeat
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text("Listado de Precios", pageW / 2, 8, { align: "center" })
      doc.setTextColor(0)
      doc.setLineWidth(0.3)
      doc.line(ml, 10, pageW - mr, 10)
      y = drawTableHeader(12)
      rowIndex = 0
    }
  }

  for (const [category, items] of grouped) {
    // Category header — ensure it fits with at least 1 product below it
    checkPageBreak(8 + rowH)

    doc.setFillColor(80, 80, 80)
    doc.rect(ml, y, usable, 7, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(category, pageW / 2, y + 5, { align: "center" })
    doc.setTextColor(0)
    y += 8
    rowIndex = 0  // reset alternating on each category

    for (const p of items) {
      checkPageBreak(rowH)

      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(ml, y - 3.5, usable, rowH, "F")
      }

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(20, 20, 20)

      const maxNameWidth = colBase - 6 - (colProduct + 2)  // espacio hasta columna P.Base con padding
      const name = fitText(p.name || "", maxNameWidth)
      doc.text(name, colProduct + 2, y)

      doc.setFont("helvetica", "bold")
      doc.setTextColor(0)
      doc.text(fmtPrice(p.base_price), colBase, y, { align: "right" })

      doc.setFont("helvetica", "normal")
      doc.setTextColor(p.wholesale_price != null ? 60 : 160)
      doc.text(p.wholesale_price != null ? fmtPrice(p.wholesale_price) : "-", colWholesale, y, { align: "right" })
      doc.setTextColor(0)

      y += rowH
      rowIndex++
    }

    y += 1  // small gap between categories
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
      `${products.length} producto${products.length !== 1 ? "s" : ""} · Página ${i} / ${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" },
    )
  }
  doc.setTextColor(0)

  return doc
}

export function generatePriceListCSV(products: PriceListProduct[]): string {
  const sorted = [...products].sort((a, b) => {
    const ca = (a.category || "").localeCompare(b.category || "", "es")
    if (ca !== 0) return ca
    return a.name.localeCompare(b.name, "es")
  })

  const headers = ["Categoría", "Nombre", "Marca", "Código", "Unidad", "Precio Base", "Precio Mayorista"]
  const rows = sorted.map((p) => [
    p.category || "",
    p.name,
    p.brand || "",
    p.code || "",
    p.unit_of_measure || "",
    Number(p.base_price).toFixed(2),
    p.wholesale_price != null ? Number(p.wholesale_price).toFixed(2) : "",
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

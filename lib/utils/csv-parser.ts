/**
 * Utilidades para parsear y generar archivos CSV
 */

export interface CSVProductRow {
  code: string
  name: string
  current_stock: string
  min_stock: string
}

export interface ParsedProduct {
  code: string
  name: string
  currentStock: number
  minStock: number
  isValid: boolean
  error?: string
}

/**
 * Parsea el contenido de un archivo CSV de productos
 */
export function parseCSV(content: string): ParsedProduct[] {
  const lines = content.trim().split('\n')
  
  if (lines.length < 2) {
    throw new Error('El archivo CSV debe tener al menos una fila de encabezado y una de datos')
  }

  // Parsear encabezados
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
  
  // Validar encabezados requeridos
  const requiredHeaders = ['code', 'current_stock']
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  
  if (missingHeaders.length > 0) {
    throw new Error(`Columnas requeridas faltantes: ${missingHeaders.join(', ')}`)
  }

  // Obtener índices de columnas
  const codeIndex = headers.indexOf('code')
  const nameIndex = headers.indexOf('name')
  const stockIndex = headers.indexOf('current_stock')
  const minStockIndex = headers.indexOf('min_stock')

  // Parsear filas de datos
  const products: ParsedProduct[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Saltar líneas vacías

    const values = parseCSVLine(line)
    
    const code = values[codeIndex]?.trim() || ''
    const name = nameIndex >= 0 ? values[nameIndex]?.trim() || '' : ''
    const stockStr = values[stockIndex]?.trim() || ''
    const minStockStr = minStockIndex >= 0 ? values[minStockIndex]?.trim() || '' : '0'

    const currentStock = parseFloat(stockStr)
    const minStock = parseFloat(minStockStr)

    let isValid = true
    let error: string | undefined

    if (!code) {
      isValid = false
      error = 'Código vacío'
    } else if (isNaN(currentStock)) {
      isValid = false
      error = 'Stock no es un número válido'
    } else if (currentStock < 0) {
      isValid = false
      error = 'Stock no puede ser negativo'
    }

    products.push({
      code,
      name,
      currentStock: isNaN(currentStock) ? 0 : currentStock,
      minStock: isNaN(minStock) ? 0 : minStock,
      isValid,
      error,
    })
  }

  return products
}

/**
 * Parsea una línea CSV respetando comillas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * Genera contenido CSV desde una lista de productos
 */
export function generateCSV(products: Array<{
  code: string
  name: string
  current_stock: number
  min_stock: number
}>): string {
  const headers = ['code', 'name', 'current_stock', 'min_stock']
  const lines = [headers.join(',')]

  for (const product of products) {
    const values = [
      escapeCSVValue(product.code),
      escapeCSVValue(product.name),
      product.current_stock.toString(),
      product.min_stock.toString(),
    ]
    lines.push(values.join(','))
  }

  return lines.join('\n')
}

/**
 * Escapa un valor para CSV (agrega comillas si es necesario)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Descarga un string como archivo CSV
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}


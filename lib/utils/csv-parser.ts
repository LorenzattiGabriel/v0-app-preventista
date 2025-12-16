/**
 * Utilidades para parsear y generar archivos CSV de productos
 * Soporta actualización de stock Y precios
 */

export interface CSVProductRow {
  code: string
  name: string
  current_stock: string
  min_stock: string
  base_price: string
  wholesale_price: string
  retail_price: string
}

export interface ParsedProduct {
  code: string
  name: string
  currentStock: number
  minStock: number
  basePrice: number | null
  wholesalePrice: number | null
  retailPrice: number | null
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
  const requiredHeaders = ['code']
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  
  if (missingHeaders.length > 0) {
    throw new Error(`Columnas requeridas faltantes: ${missingHeaders.join(', ')}`)
  }

  // Obtener índices de columnas
  const codeIndex = headers.indexOf('code')
  const nameIndex = headers.indexOf('name')
  const stockIndex = headers.indexOf('current_stock')
  const minStockIndex = headers.indexOf('min_stock')
  const basePriceIndex = headers.indexOf('base_price')
  const wholesalePriceIndex = headers.indexOf('wholesale_price')
  const retailPriceIndex = headers.indexOf('retail_price')

  // Parsear filas de datos
  const products: ParsedProduct[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Saltar líneas vacías

    const values = parseCSVLine(line)
    
    const code = values[codeIndex]?.trim() || ''
    const name = nameIndex >= 0 ? values[nameIndex]?.trim() || '' : ''
    const stockStr = stockIndex >= 0 ? values[stockIndex]?.trim() || '' : ''
    const minStockStr = minStockIndex >= 0 ? values[minStockIndex]?.trim() || '' : '0'
    const basePriceStr = basePriceIndex >= 0 ? values[basePriceIndex]?.trim() || '' : ''
    const wholesalePriceStr = wholesalePriceIndex >= 0 ? values[wholesalePriceIndex]?.trim() || '' : ''
    const retailPriceStr = retailPriceIndex >= 0 ? values[retailPriceIndex]?.trim() || '' : ''

    const currentStock = stockStr ? parseFloat(stockStr) : 0
    const minStock = parseFloat(minStockStr)
    const basePrice = basePriceStr ? parseFloat(basePriceStr) : null
    const wholesalePrice = wholesalePriceStr ? parseFloat(wholesalePriceStr) : null
    const retailPrice = retailPriceStr ? parseFloat(retailPriceStr) : null

    let isValid = true
    let error: string | undefined

    if (!code) {
      isValid = false
      error = 'Código vacío'
    } else if (stockStr && isNaN(currentStock)) {
      isValid = false
      error = 'Stock no es un número válido'
    } else if (stockStr && currentStock < 0) {
      isValid = false
      error = 'Stock no puede ser negativo'
    } else if (basePriceStr && (isNaN(basePrice!) || basePrice! < 0)) {
      isValid = false
      error = 'Precio base inválido'
    } else if (wholesalePriceStr && (isNaN(wholesalePrice!) || wholesalePrice! < 0)) {
      isValid = false
      error = 'Precio mayorista inválido'
    } else if (retailPriceStr && (isNaN(retailPrice!) || retailPrice! < 0)) {
      isValid = false
      error = 'Precio minorista inválido'
    }

    products.push({
      code,
      name,
      currentStock: isNaN(currentStock) ? 0 : currentStock,
      minStock: isNaN(minStock) ? 0 : minStock,
      basePrice,
      wholesalePrice,
      retailPrice,
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
 * Genera contenido CSV desde una lista de productos (incluye precios)
 */
export function generateCSV(products: Array<{
  code: string
  name: string
  current_stock: number
  min_stock: number
  base_price?: number | null
  wholesale_price?: number | null
  retail_price?: number | null
}>): string {
  const headers = ['code', 'name', 'current_stock', 'min_stock', 'base_price', 'wholesale_price', 'retail_price']
  const lines = [headers.join(',')]

  for (const product of products) {
    const values = [
      escapeCSVValue(product.code),
      escapeCSVValue(product.name),
      product.current_stock.toString(),
      product.min_stock.toString(),
      product.base_price?.toString() || '',
      product.wholesale_price?.toString() || '',
      product.retail_price?.toString() || '',
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

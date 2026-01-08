/**
 * Script para comparar productos del CSV con la base de datos
 * Genera SQL para insertar productos faltantes
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Leer variables de entorno desde .env.local
function loadEnvFile() {
  const envPath = join(__dirname, '..', '.env.local')
  const content = readFileSync(envPath, 'utf-8')
  const lines = content.split('\n')
  
  for (const line of lines) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  }
}

loadEnvFile()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Parsear línea CSV respetando comillas
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Parsear CSV
function parseCSV(content) {
  const lines = content.trim().split('\n')
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
  
  const products = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const product = {}
    headers.forEach((header, idx) => {
      product[header] = values[idx] || ''
    })
    products.push(product)
  }
  
  return products
}

// Normalizar nombre para comparación
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, '') // Quitar caracteres especiales
    .replace(/\s+/g, ' ')
    .trim()
}

// Escapar string para SQL
function escapeSQLString(str) {
  return str.replace(/'/g, "''")
}

async function main() {
  console.log('📄 Leyendo archivo CSV...')
  
  const csvPath = join(__dirname, '..', 'excel', 'productos_2025-12-22.csv')
  const csvContent = readFileSync(csvPath, 'utf-8')
  const csvProducts = parseCSV(csvContent)
  
  console.log(`   → ${csvProducts.length} productos en el CSV`)
  
  console.log('\n📦 Obteniendo productos de la base de datos...')
  
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('id, code, name')
    .order('name')
  
  if (error) {
    console.error('❌ Error obteniendo productos:', error)
    process.exit(1)
  }
  
  console.log(`   → ${dbProducts.length} productos en la base de datos`)
  
  // Crear mapa de nombres normalizados de la BD
  const dbNamesMap = new Map()
  for (const product of dbProducts) {
    const normalizedName = normalizeName(product.name)
    dbNamesMap.set(normalizedName, product)
  }
  
  // También crear mapa por código
  const dbCodesMap = new Map()
  for (const product of dbProducts) {
    dbCodesMap.set(product.code.toUpperCase(), product)
  }
  
  console.log('\n🔍 Comparando productos...')
  
  const missingProducts = []
  const duplicatesInCSV = []
  const existingProducts = []
  
  const seenNames = new Set()
  
  for (const csvProduct of csvProducts) {
    const normalizedName = normalizeName(csvProduct.name)
    const codeUpper = csvProduct.code.toUpperCase()
    
    // Verificar duplicados en el CSV (mismo nombre normalizado)
    if (seenNames.has(normalizedName)) {
      duplicatesInCSV.push(csvProduct)
      continue
    }
    seenNames.add(normalizedName)
    
    // Verificar si existe en BD por nombre O por código
    const existsByName = dbNamesMap.has(normalizedName)
    const existsByCode = dbCodesMap.has(codeUpper)
    
    if (existsByName || existsByCode) {
      existingProducts.push({
        csv: csvProduct,
        db: existsByName ? dbNamesMap.get(normalizedName) : dbCodesMap.get(codeUpper),
        matchedBy: existsByName ? 'nombre' : 'código'
      })
    } else {
      missingProducts.push(csvProduct)
    }
  }
  
  console.log('\n📊 RESULTADOS:')
  console.log(`   ✅ Productos que ya existen: ${existingProducts.length}`)
  console.log(`   🆕 Productos NUEVOS (no existen): ${missingProducts.length}`)
  console.log(`   ⚠️  Duplicados en CSV (ignorados): ${duplicatesInCSV.length}`)
  
  if (missingProducts.length === 0) {
    console.log('\n✅ Todos los productos del CSV ya existen en la base de datos.')
    return
  }
  
  console.log('\n📝 PRODUCTOS NUEVOS A INSERTAR:')
  console.log('─'.repeat(80))
  
  for (const p of missingProducts) {
    console.log(`   • ${p.code}: ${p.name}`)
  }
  
  // Generar SQL para insertar
  console.log('\n📄 Generando script SQL...')
  
  let sql = `-- Script generado automáticamente para insertar productos faltantes
-- Fecha: ${new Date().toISOString()}
-- Total de productos a insertar: ${missingProducts.length}

BEGIN;

INSERT INTO products (
  code, 
  name, 
  current_stock, 
  min_stock, 
  base_price, 
  wholesale_price, 
  retail_price,
  is_active,
  allows_decimal_quantity,
  unit_of_measure,
  iva_aliquot,
  category_margin,
  product_margin
) VALUES
`

  const values = missingProducts.map(p => {
    const code = escapeSQLString(p.code)
    const name = escapeSQLString(p.name)
    const currentStock = parseFloat(p.current_stock) || 0
    const minStock = parseFloat(p.min_stock) || 0
    const basePrice = parseFloat(p.base_price) || 0
    const wholesalePrice = parseFloat(p.wholesale_price) || basePrice
    const retailPrice = parseFloat(p.retail_price) || wholesalePrice
    
    return `  ('${code}', '${name}', ${currentStock}, ${minStock}, ${basePrice}, ${wholesalePrice}, ${retailPrice}, true, false, 'unidad', 21, 0, 0)`
  })
  
  sql += values.join(',\n') + ';\n'
  
  sql += `
-- Verificar inserción
SELECT COUNT(*) as productos_insertados FROM products 
WHERE code IN (${missingProducts.map(p => `'${escapeSQLString(p.code)}'`).join(', ')});

COMMIT;
`

  const outputPath = join(__dirname, 'insert_missing_products.sql')
  writeFileSync(outputPath, sql, 'utf-8')
  
  console.log(`   → Script guardado en: scripts/insert_missing_products.sql`)
  
  // También mostrar un resumen de duplicados si hay
  if (duplicatesInCSV.length > 0) {
    console.log('\n⚠️  DUPLICADOS EN EL CSV (mismo nombre, ignorados):')
    for (const p of duplicatesInCSV.slice(0, 10)) {
      console.log(`   • ${p.code}: ${p.name}`)
    }
    if (duplicatesInCSV.length > 10) {
      console.log(`   ... y ${duplicatesInCSV.length - 10} más`)
    }
  }
  
  console.log('\n✅ Proceso completado.')
  console.log('   Para insertar los productos, ejecuta el script SQL en Supabase SQL Editor.')
}

main().catch(console.error)



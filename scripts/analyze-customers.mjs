#!/usr/bin/env node
import {createClient} from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('❌ Error: Variables de entorno no configuradas')
  console.log('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Analizando clientes en la base de datos...\n')
console.log('='.repeat(80))

// Obtener todos los clientes
const { data: customers, error, count } = await supabase
  .from('customers')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })

if (error) {
  console.log(`❌ Error al obtener clientes: ${JSON.stringify(error)}`)
  process.exit(1)
}

console.log(`\n📊 RESUMEN GENERAL`)
console.log('='.repeat(80))
console.log(`   Total de clientes: ${customers.length}`)

// Análisis por tipo de cliente
const byType = customers.reduce((acc, c) => {
  acc[c.customer_type] = (acc[c.customer_type] || 0) + 1
  return acc
}, {})
console.log(`\n📦 Por tipo de cliente:`)
Object.entries(byType).forEach(([type, count]) => {
  console.log(`   - ${type}: ${count}`)
})

// Análisis por condición IVA
const byIva = customers.reduce((acc, c) => {
  const iva = c.iva_condition || 'sin_especificar'
  acc[iva] = (acc[iva] || 0) + 1
  return acc
}, {})
console.log(`\n💰 Por condición IVA:`)
Object.entries(byIva).forEach(([iva, count]) => {
  console.log(`   - ${iva}: ${count}`)
})

// Análisis por localidad
const byLocality = customers.reduce((acc, c) => {
  const loc = c.locality || 'sin_especificar'
  acc[loc] = (acc[loc] || 0) + 1
  return acc
}, {})
console.log(`\n📍 Por localidad:`)
Object.entries(byLocality)
  .sort((a, b) => b[1] - a[1])
  .forEach(([loc, count]) => {
    console.log(`   - ${loc}: ${count}`)
  })

// Análisis por provincia
const byProvince = customers.reduce((acc, c) => {
  const prov = c.province || 'sin_especificar'
  acc[prov] = (acc[prov] || 0) + 1
  return acc
}, {})
console.log(`\n🗺️  Por provincia:`)
Object.entries(byProvince)
  .sort((a, b) => b[1] - a[1])
  .forEach(([prov, count]) => {
    console.log(`   - ${prov}: ${count}`)
  })

// Clientes activos vs inactivos
const active = customers.filter(c => c.is_active).length
const inactive = customers.filter(c => !c.is_active).length
console.log(`\n✅ Estado de clientes:`)
console.log(`   - Activos: ${active}`)
console.log(`   - Inactivos: ${inactive}`)

// Clientes con coordenadas de geolocalización
const withCoords = customers.filter(c => c.latitude && c.longitude).length
const withoutCoords = customers.filter(c => !c.latitude || !c.longitude).length
console.log(`\n🌍 Geolocalización:`)
console.log(`   - Con coordenadas: ${withCoords}`)
console.log(`   - Sin coordenadas: ${withoutCoords}`)

// Análisis de crédito
const avgCreditDays = customers.reduce((acc, c) => acc + (c.credit_days || 0), 0) / customers.length
const avgCreditLimit = customers.reduce((acc, c) => acc + (c.credit_limit || 0), 0) / customers.length
const avgDiscount = customers.reduce((acc, c) => acc + (c.general_discount || 0), 0) / customers.length
console.log(`\n💳 Condiciones comerciales (promedios):`)
console.log(`   - Días de crédito: ${avgCreditDays.toFixed(1)}`)
console.log(`   - Límite de crédito: $${avgCreditLimit.toFixed(2)}`)
console.log(`   - Descuento general: ${avgDiscount.toFixed(1)}%`)

// Por zona
const { data: zones } = await supabase.from('zones').select('*')
const zonesMap = zones ? zones.reduce((acc, z) => { acc[z.id] = z.name; return acc }, {}) : {}

const byZone = customers.reduce((acc, c) => {
  const zone = c.zone_id ? (zonesMap[c.zone_id] || c.zone_id) : 'Sin zona asignada'
  acc[zone] = (acc[zone] || 0) + 1
  return acc
}, {})
console.log(`\n🗂️  Por zona:`)
Object.entries(byZone)
  .sort((a, b) => b[1] - a[1])
  .forEach(([zone, count]) => {
    console.log(`   - ${zone}: ${count}`)
  })

// Listado detallado de clientes
console.log('\n' + '='.repeat(80))
console.log('📋 LISTADO DETALLADO DE CLIENTES')
console.log('='.repeat(80))

customers.forEach((c, i) => {
  console.log(`\n${i + 1}. [${c.code}] ${c.commercial_name}`)
  console.log(`   📞 Contacto: ${c.contact_name} - ${c.phone}`)
  console.log(`   📧 Email: ${c.email || 'No especificado'}`)
  console.log(`   📍 Dirección: ${c.street} ${c.street_number}${c.floor_apt ? `, ${c.floor_apt}` : ''}`)
  console.log(`   🏙️  ${c.locality}, ${c.province} ${c.postal_code || ''}`)
  console.log(`   📦 Tipo: ${c.customer_type} | IVA: ${c.iva_condition || 'N/A'}`)
  console.log(`   💰 Crédito: ${c.credit_days} días | Límite: $${c.credit_limit} | Desc: ${c.general_discount}%`)
  console.log(`   🌍 Coords: ${c.latitude && c.longitude ? `${c.latitude}, ${c.longitude}` : 'Sin geolocalizar'}`)
  console.log(`   ✅ Activo: ${c.is_active ? 'Sí' : 'No'}`)
  if (c.observations) {
    console.log(`   📝 Obs: ${c.observations}`)
  }
})

console.log('\n' + '='.repeat(80))
console.log('✅ Análisis completado')
console.log('='.repeat(80))


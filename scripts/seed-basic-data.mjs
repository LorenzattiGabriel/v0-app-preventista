#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('Ejecuta: node scripts/seed-basic-data.mjs TU_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🌱 Cargando datos básicos desde SQL...\n')

// Leer el archivo SQL
const sqlFile = readFileSync('./scripts/006_seed_products_customers_orders.sql', 'utf8')

// No podemos ejecutar SQL directamente desde JS, así que voy a insertar los datos manualmente
console.log('⚠️  Por favor ejecuta el archivo 006_seed_products_customers_orders.sql en Supabase SQL Editor')
console.log('   👉 https://supabase.com/dashboard/project/ojghwcbliucsntrbqvaw/sql\n')

console.log('O puedo intentar insertar los datos básicos desde aquí...\n')

// Insertar clientes básicos
console.log('👥 Insertando 8 clientes...')
const customersBasic = [
  { code: 'CLI-0001', commercial_name: 'Almacén Don José', contact_name: 'José García', phone: '351-5551234', street: 'San Martín', street_number: '450', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '11111111-1111-1111-1111-111111111111', is_active: true },
  { code: 'CLI-0002', commercial_name: 'Despensa La Esquina', contact_name: 'María López', phone: '351-5552345', street: 'Rivadavia', street_number: '780', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '11111111-1111-1111-1111-111111111111', is_active: true },
  { code: 'CLI-0003', commercial_name: 'Super Familia Rodríguez', contact_name: 'Carlos Rodríguez', phone: '351-5553456', street: 'Av. Colón', street_number: '1520', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '22222222-2222-2222-2222-222222222222', is_active: true },
  { code: 'CLI-0004', commercial_name: 'Kiosco El Rápido', contact_name: 'Ana Martínez', phone: '351-5554567', street: '27 de Abril', street_number: '890', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '22222222-2222-2222-2222-222222222222', is_active: true },
  { code: 'CLI-0005', commercial_name: 'Minimercado Los Andes', contact_name: 'Pedro Fernández', phone: '351-5555678', street: 'Duarte Quirós', street_number: '2340', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '33333333-3333-3333-3333-333333333333', is_active: true },
  { code: 'CLI-0006', commercial_name: 'Almacén Central', contact_name: 'Laura Gómez', phone: '351-5556789', street: 'Independencia', street_number: '560', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '11111111-1111-1111-1111-111111111111', is_active: true },
  { code: 'CLI-0007', commercial_name: 'Despensa San Vicente', contact_name: 'Roberto Díaz', phone: '351-5557890', street: 'Av. Vélez Sarsfield', street_number: '3400', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '33333333-3333-3333-3333-333333333333', is_active: true },
  { code: 'CLI-0008', commercial_name: 'Distribuidora El Progreso', contact_name: 'Silvia Torres', phone: '351-5558901', street: 'Bv. San Juan', street_number: '1890', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '22222222-2222-2222-2222-222222222222', is_active: true }
]

for (const customer of customersBasic) {
  const { error } = await supabase.from('customers').upsert(customer, { onConflict: 'code' })
  if (error && !error.message.includes('duplicate')) {
    console.error(`   ❌ Error: ${error.message}`)
  }
}
console.log(`   ✅ Clientes cargados\n`)

// Verificar
const { count: customersCount } = await supabase.from('customers').select('*', { count: 'exact', head: true })
const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true })

console.log('=' .repeat(80))
console.log('\n📊 Estado de la base de datos:')
console.log(`   👥 Clientes: ${customersCount}`)
console.log(`   📦 Productos: ${productsCount}`)
console.log('\n✅ Datos básicos cargados!')
console.log('=' .repeat(80))


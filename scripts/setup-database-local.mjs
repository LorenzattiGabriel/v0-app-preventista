#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
// import createBrowserClient from '@supabase/supabase-js'import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// export const createClient = () =>
//   createBrowserClient(
//     SUPABASE_URL,
//     SUPABASE_ANON_KEY,
//   );

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔌 Conectando a Supabase...')
console.log(`📍 URL: ${SUPABASE_URL}`)

// Test connection
try {
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
  
  if (error) {
    console.log('⚠️  La base de datos está conectada pero las tablas aún no existen.')
    console.log('📝 Necesitas ejecutar los scripts SQL en el SQL Editor de Supabase.')
  } else {
    console.log('✅ Conexión exitosa!')
    console.log(`📊 Tablas encontradas: ${data ? 'Sí' : 'Verificando...'}`)
  }
} catch (err) {
  console.error('❌ Error de conexión:', err.message)
}

console.log('\n📋 PASOS PARA CONFIGURAR LA BASE DE DATOS:\n')
console.log('1. Abre el SQL Editor de Supabase:')
console.log('   👉 https://supabase.com/dashboard/project/ojghwcbliucsntrbqvaw/sql\n')
console.log('2. Ejecuta los siguientes scripts en orden:\n')

const scripts = [
  '001_create_database_schema.sql',
  '002_row_level_security.sql', 
  '005_add_password_column.sql',
  '006_seed_products_customers_orders.sql',
  '007_seed_mock_users_simple.sql'
]

scripts.forEach((script, index) => {
  console.log(`   ${index + 1}. scripts/${script}`)
})

console.log('\n💡 Tip: Puedes copiar el contenido de cada archivo y pegarlo en el SQL Editor.\n')

// Try to check tables
console.log('🔍 Verificando tablas existentes...\n')

const tables = ['profiles', 'zones', 'customers', 'products', 'orders', 'order_items', 'routes', 'route_orders', 'order_ratings', 'order_history']

for (const table of tables) {
  try {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log(`❌ ${table}: No existe`)
    } else {
      console.log(`✅ ${table}: ${count || 0} registros`)
    }
  } catch (err) {
    console.log(`❌ ${table}: Error`)
  }
}

console.log('\n' + '='.repeat(60))


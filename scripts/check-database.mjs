#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Verificando conexión a Supabase...\n')

const tables = [
  { name: 'profiles', description: 'Usuarios del sistema' },
  { name: 'zones', description: 'Zonas de distribución' },
  { name: 'customers', description: 'Clientes' },
  { name: 'products', description: 'Productos' },
  { name: 'orders', description: 'Pedidos' },
  { name: 'order_items', description: 'Items de pedidos' },
  { name: 'routes', description: 'Rutas de entrega' },
  { name: 'route_orders', description: 'Pedidos en rutas' },
  { name: 'order_ratings', description: 'Calificaciones' },
  { name: 'order_history', description: 'Historial de pedidos' }
]

console.log('📊 Estado de las tablas:\n')

let allOk = true
const results = []

for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log(`❌ ${table.name.padEnd(20)} - Error: ${error.message}`)
      results.push({ table: table.name, count: 0, ok: false })
      allOk = false
    } else {
      console.log(`✅ ${table.name.padEnd(20)} - ${count || 0} registros`)
      results.push({ table: table.name, count: count || 0, ok: true })
    }
  } catch (err) {
    console.log(`❌ ${table.name.padEnd(20)} - Error: ${err.message}`)
    results.push({ table: table.name, count: 0, ok: false })
    allOk = false
  }
}

console.log('\n' + '='.repeat(60))

if (allOk) {
  console.log('✅ ¡Base de datos configurada correctamente!\n')
  
  // Mostrar resumen de datos
  const totalProfiles = results.find(r => r.table === 'profiles')?.count || 0
  const totalProducts = results.find(r => r.table === 'products')?.count || 0
  const totalCustomers = results.find(r => r.table === 'customers')?.count || 0
  const totalOrders = results.find(r => r.table === 'orders')?.count || 0
  
  console.log('📈 Resumen de datos:')
  console.log(`   👥 Usuarios: ${totalProfiles}`)
  console.log(`   📦 Productos: ${totalProducts}`)
  console.log(`   🏪 Clientes: ${totalCustomers}`)
  console.log(`   📋 Pedidos: ${totalOrders}`)
  
  // Mostrar usuarios de ejemplo
  if (totalProfiles > 0) {
    console.log('\n👤 Probando lectura de usuarios...')
    const { data: users, error } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .limit(5)
    
    if (!error && users) {
      console.log('\n   Usuarios encontrados:')
      users.forEach(u => {
        console.log(`   - ${u.email.padEnd(35)} [${u.role}] - ${u.full_name}`)
      })
    }
  }
  
  console.log('\n🚀 La aplicación está lista para usar!')
  console.log('   Ejecuta: npm run dev')
  console.log('   Login: http://localhost:3000/auth/simple-login')
  
} else {
  console.log('⚠️  Algunas tablas tienen errores.')
  console.log('   Verifica las políticas RLS en Supabase.')
}

console.log('\n' + '='.repeat(60))


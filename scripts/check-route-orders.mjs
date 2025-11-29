#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

const routeCode = process.argv[2] || 'REC-0001-20257777'

console.log(`🔍 Verificando ruta: ${routeCode}\n`)
console.log('=' .repeat(80))

// 1. Buscar la ruta
const { data: route, error: routeError } = await supabase
  .from('routes')
  .select('*')
  .eq('route_code', routeCode)
  .single()

if (routeError || !route) {
  console.error('❌ Ruta no encontrada:', routeError?.message || 'No existe')
  process.exit(1)
}

console.log('\n✅ Ruta encontrada:')
console.log(`   ID: ${route.id}`)
console.log(`   Código: ${route.route_code}`)
console.log(`   Estado: ${route.status}`)
console.log(`   Repartidor ID: ${route.driver_id}`)
console.log(`   Fecha programada: ${route.scheduled_date}`)
console.log(`   Zona ID: ${route.zone_id}`)

// 2. Buscar route_orders
const { data: routeOrders, error: routeOrdersError } = await supabase
  .from('route_orders')
  .select(`
    *,
    orders (
      order_number,
      status,
      customers (
        commercial_name
      )
    )
  `)
  .eq('route_id', route.id)
  .order('delivery_order')

console.log('\n' + '=' .repeat(80))
console.log(`\n📦 Pedidos asignados a la ruta: ${routeOrders?.length || 0}\n`)

if (routeOrdersError) {
  console.error('❌ Error:', routeOrdersError.message)
  process.exit(1)
}

if (!routeOrders || routeOrders.length === 0) {
  console.log('⚠️  Esta ruta NO tiene pedidos asignados en route_orders')
  console.log('\n💡 Posibles causas:')
  console.log('   1. La ruta fue creada pero no se le asignaron pedidos')
  console.log('   2. Los pedidos fueron eliminados de route_orders')
  console.log('   3. Hay un problema en el proceso de generación de rutas')
  
  // Buscar pedidos que podrían estar en esta zona
  if (route.zone_id) {
    const { data: potentialOrders } = await supabase
      .from('orders')
      .select('id, order_number, status, customers(commercial_name, zone_id)')
      .eq('status', 'PENDIENTE_ENTREGA')
      .order('created_at', { ascending: false })
      .limit(10)
    
    const ordersInZone = potentialOrders?.filter(o => o.customers?.zone_id === route.zone_id)
    
    if (ordersInZone && ordersInZone.length > 0) {
      console.log(`\n📋 Pedidos PENDIENTE_ENTREGA en la misma zona (${ordersInZone.length}):`)
      ordersInZone.forEach(o => {
        console.log(`   - ${o.order_number} - ${o.customers?.commercial_name}`)
      })
    }
  }
} else {
  console.log('Orden | Order Number | Cliente | Estado')
  console.log('-'.repeat(80))
  routeOrders.forEach(ro => {
    console.log(`  ${ro.delivery_order.toString().padStart(2)}  | ${ro.orders?.order_number?.padEnd(15)} | ${(ro.orders?.customers?.commercial_name || 'N/A').padEnd(30)} | ${ro.orders?.status}`)
  })
}

console.log('\n' + '=' .repeat(80) + '\n')


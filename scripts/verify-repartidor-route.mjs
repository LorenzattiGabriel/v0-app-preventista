#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

console.log('🚚 VERIFICACIÓN - VISTA DEL REPARTIDOR')
console.log('=' .repeat(80))

const today = new Date().toISOString().split('T')[0]
const repartidorId = '212729a1-8863-4835-8083-306fe44ecf98'

// Simular lo que verá el repartidor
const { data: routes } = await supabase
  .from('routes')
  .select(`
    *,
    zones(name),
    route_orders(
      id,
      delivery_order,
      orders(
        id,
        order_number,
        status,
        total,
        customers(commercial_name, street, street_number, locality)
      )
    )
  `)
  .eq('driver_id', repartidorId)
  .eq('scheduled_date', today)

console.log(`\n📅 Fecha de hoy: ${today}`)
console.log(`📍 Rutas asignadas para hoy: ${routes?.length || 0}\n`)

if (routes && routes.length > 0) {
  routes.forEach((r, i) => {
    const totalOrders = r.route_orders?.length || 0
    const deliveredOrders = r.route_orders?.filter(ro => ro.orders.status === 'ENTREGADO').length || 0

    console.log(`${i + 1}. RUTA: ${r.route_code}`)
    console.log(`   Estado: ${r.status}`)
    console.log(`   Zona: ${r.zones?.name || 'Sin zona'}`)
    console.log(`   Hora inicio: ${r.scheduled_start_time || 'No especificada'}`)
    console.log(`   Distancia: ${r.total_distance || 0} km`)
    console.log(`   Duración: ${r.estimated_duration || 0} min`)
    console.log(`   Entregas: ${deliveredOrders}/${totalOrders}`)
    console.log(``)
    console.log(`   PEDIDOS:`)

    if (r.route_orders && r.route_orders.length > 0) {
      r.route_orders
        .sort((a, b) => a.delivery_order - b.delivery_order)
        .forEach((ro, j) => {
          const emoji = ro.orders.status === 'ENTREGADO' ? '✅' : '📦'
          console.log(`      ${emoji} Parada ${j + 1}: ${ro.orders.order_number}`)
          console.log(`         Cliente: ${ro.orders.customers.commercial_name}`)
          console.log(`         Dirección: ${ro.orders.customers.street} ${ro.orders.customers.street_number}`)
          console.log(`         Localidad: ${ro.orders.customers.locality}`)
          console.log(`         Total: $${ro.orders.total}`)
          console.log(`         Estado: ${ro.orders.status}`)
          console.log(``)
        })
    }
  })

  console.log('=' .repeat(80))
  console.log('\n✅ EL REPARTIDOR PUEDE:\n')
  console.log('   1. Ver la ruta en su dashboard')
  console.log('   2. Click en "Ver Ruta" para ver el detalle')
  console.log('   3. Ver el mapa con todas las paradas')
  console.log('   4. Click en "Iniciar Ruta" para comenzar las entregas')
  console.log('   5. Marcar cada pedido como entregado')
  console.log('   6. Finalizar la ruta cuando complete todas las entregas')

  console.log('\n🔗 URLS PARA PROBAR:\n')
  console.log('   Dashboard: http://localhost:3000/repartidor/dashboard')
  console.log(`   Ver ruta: http://localhost:3000/repartidor/routes/${routes[0].id}`)

  console.log('\n📋 CREDENCIALES:\n')
  console.log('   Email: repartidor1@distribuidora.com')
  console.log('   Password: repar123')
} else {
  console.log('❌ NO HAY RUTAS PARA HOY')
  console.log('\nPosibles causas:')
  console.log('   - La ruta no está asignada a este repartidor')
  console.log('   - La ruta no es para la fecha de hoy')
  console.log('   - Hay un problema con el driver_id')
}

console.log('\n' + '=' .repeat(80))


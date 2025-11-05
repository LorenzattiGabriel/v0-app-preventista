#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;


if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🗺️  Creando Ruta Demo - Hardcodeada sin Google Maps\n')
console.log('=' .repeat(80))

// Obtener usuarios
const { data: profiles } = await supabase.from('profiles').select('id, email, role')
const repartidor1 = profiles.find(p => p.email === 'repartidor1@distribuidora.com')
const admin = profiles.find(p => p.role === 'administrativo')

console.log('\n👥 Usuarios:')
console.log(`   🚚 Repartidor: Carlos Méndez (${repartidor1?.email})`)
console.log(`   👨‍💼 Admin: ${admin?.email}`)

// Obtener pedido demo
const { data: pedido } = await supabase
  .from('orders')
  .select('*, customers(*, zones(*))')
  .eq('order_number', 'PED-DEMO-001')
  .single()

if (!pedido) {
  console.log('\n❌ No se encontró el pedido PED-DEMO-001')
  console.log('💡 Ejecuta primero: node scripts/create-happy-path-demo.mjs')
  process.exit(1)
}

console.log('\n📦 Pedido encontrado:')
console.log(`   Número: ${pedido.order_number}`)
console.log(`   Cliente: ${pedido.customers?.commercial_name}`)
console.log(`   Estado actual: ${pedido.status}`)
console.log(`   Zona: ${pedido.customers?.zones?.name || 'Sin zona'}`)

// Verificar y actualizar estado del pedido si es necesario
if (pedido.status === 'PENDIENTE_ARMADO') {
  console.log('\n⚠️  El pedido está en PENDIENTE_ARMADO, actualizando a PENDIENTE_ENTREGA...')
  
  // Actualizar pedido
  await supabase
    .from('orders')
    .update({
      status: 'PENDIENTE_ENTREGA',
      assembly_started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
      assembly_completed_at: new Date(Date.now() - 1800000).toISOString(), // 30 min atrás
      assembled_by: profiles.find(p => p.email === 'armado1@distribuidora.com')?.id
    })
    .eq('id', pedido.id)
  
  // Actualizar items
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', pedido.id)
  
  for (const item of items) {
    await supabase
      .from('order_items')
      .update({
        quantity_assembled: item.quantity_requested,
        quantity_delivered: 0
      })
      .eq('id', item.id)
  }
  
  // Crear historial
  await supabase.from('order_history').insert({
    order_id: pedido.id,
    previous_status: 'PENDIENTE_ARMADO',
    new_status: 'PENDIENTE_ENTREGA',
    changed_by: profiles.find(p => p.email === 'armado1@distribuidora.com')?.id,
    change_reason: 'Armado completado automáticamente para demo'
  })
  
  console.log('   ✅ Pedido actualizado a PENDIENTE_ENTREGA')
  
  // Actualizar variable local
  pedido.status = 'PENDIENTE_ENTREGA'
} else if (pedido.status !== 'PENDIENTE_ENTREGA' && pedido.status !== 'EN_RUTA') {
  console.log(`\n⚠️  El pedido está en estado ${pedido.status}`)
  console.log('   Para el demo, debería estar en PENDIENTE_ENTREGA')
}

// Verificar si ya existe una ruta para este pedido
const { data: existingRouteOrder } = await supabase
  .from('route_orders')
  .select('*, routes(*)')
  .eq('order_id', pedido.id)
  .single()

if (existingRouteOrder) {
  console.log('\n⚠️  Ya existe una ruta para este pedido')
  console.log(`   Código de ruta: ${existingRouteOrder.routes.route_code}`)
  console.log(`   Estado: ${existingRouteOrder.routes.status}`)
  console.log(`   Repartidor: ${existingRouteOrder.routes.driver_id === repartidor1?.id ? 'Carlos Méndez' : 'Otro'}`)
  
  // Actualizar la ruta existente si es necesario
  if (existingRouteOrder.routes.driver_id !== repartidor1?.id) {
    console.log('\n   🔄 Actualizando repartidor de la ruta...')
    await supabase
      .from('routes')
      .update({ driver_id: repartidor1?.id })
      .eq('id', existingRouteOrder.routes.id)
    console.log('   ✅ Repartidor actualizado')
  }
  
  console.log('\n✅ Ruta existente configurada correctamente')
  console.log('\n🎯 PRÓXIMO PASO:')
  console.log(`   Login: repartidor1@distribuidora.com / repar123`)
  console.log(`   URL: http://localhost:3000/repartidor/dashboard`)
  console.log(`   Buscar ruta: ${existingRouteOrder.routes.route_code}`)
  process.exit(0)
}

// Crear nueva ruta
console.log('\n📋 Creando nueva ruta...')

const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

// Generar código de ruta
const { data: routeCodeData } = await supabase.rpc('generate_route_code', {
  route_date: tomorrow
})
const routeCode = routeCodeData

console.log(`   Código de ruta: ${routeCode}`)

// Datos mockeados de la ruta (sin Google Maps)
const mockRouteData = {
  origin: {
    address: 'Distribuidora Central - Av. Colón 1234, Córdoba',
    lat: -31.4201,
    lng: -64.1888
  },
  destinations: [
    {
      order_number: pedido.order_number,
      customer: pedido.customers?.commercial_name,
      address: `${pedido.customers?.street} ${pedido.customers?.street_number}, ${pedido.customers?.locality}`,
      lat: -31.4173,
      lng: -64.1833,
      estimated_arrival: '09:30',
      distance_from_previous: 2.5, // km
      duration_from_previous: 8 // minutos
    }
  ],
  total_distance: 2.5, // km
  total_duration: 8, // minutos
  estimated_delivery_time: 10, // minutos por entrega
  waypoints: [],
  polyline: 'mock_polyline_data_for_demo', // No se usa actualmente
  summary: 'Ruta optimizada para demo - 1 parada'
}

// Crear ruta en base de datos
const { data: newRoute, error: routeError } = await supabase
  .from('routes')
  .insert({
    route_code: routeCode,
    driver_id: repartidor1?.id,
    zone_id: pedido.customers?.zone_id,
    scheduled_date: tomorrow,
    scheduled_start_time: '09:00',
    scheduled_end_time: '18:00',
    total_distance: mockRouteData.total_distance,
    estimated_duration: mockRouteData.total_duration + mockRouteData.estimated_delivery_time,
    optimized_route: mockRouteData, // JSONB con datos mockeados
    status: 'PLANIFICADO',
    created_by: admin?.id
  })
  .select()
  .single()

if (routeError) {
  console.log('\n❌ Error creando ruta:', routeError.message)
  process.exit(1)
}

console.log('   ✅ Ruta creada exitosamente')

// Crear route_order
const estimatedArrival = new Date(tomorrow + 'T09:30:00')
const { error: routeOrderError } = await supabase
  .from('route_orders')
  .insert({
    route_id: newRoute.id,
    order_id: pedido.id,
    delivery_order: 1,
    estimated_arrival_time: estimatedArrival.toISOString()
  })

if (routeOrderError) {
  console.log('\n❌ Error asignando pedido a ruta:', routeOrderError.message)
  process.exit(1)
}

console.log('   ✅ Pedido asignado a la ruta')

// Actualizar estado del pedido a EN_RUTA
await supabase
  .from('orders')
  .update({ status: 'EN_RUTA' })
  .eq('id', pedido.id)

// Crear historial
await supabase.from('order_history').insert({
  order_id: pedido.id,
  previous_status: pedido.status,
  new_status: 'EN_RUTA',
  changed_by: admin?.id,
  change_reason: 'Ruta creada y pedido asignado - Demo'
})

console.log('   ✅ Estado del pedido actualizado a EN_RUTA')

console.log('\n' + '=' .repeat(80))
console.log('\n🎉 ¡Ruta Demo Creada Exitosamente!\n')

console.log('📊 RESUMEN DE LA RUTA:\n')
console.log(`   Código: ${routeCode}`)
console.log(`   Repartidor: Carlos Méndez`)
console.log(`   Fecha: ${tomorrow}`)
console.log(`   Estado: PLANIFICADO`)
console.log(`   Zona: ${pedido.customers?.zones?.name || 'Sin zona'}`)
console.log(`   Pedidos: 1 (PED-DEMO-001)`)
console.log(`   Distancia total: ${mockRouteData.total_distance} km`)
console.log(`   Duración estimada: ${mockRouteData.total_duration + mockRouteData.estimated_delivery_time} minutos`)

console.log('\n📍 PARADAS:\n')
console.log(`   1. ${pedido.customers?.commercial_name}`)
console.log(`      Dirección: ${mockRouteData.destinations[0].address}`)
console.log(`      Llegada estimada: ${mockRouteData.destinations[0].estimated_arrival}`)
console.log(`      Pedido: ${pedido.order_number}`)
console.log(`      Total: $${pedido.total}`)

console.log('\n🗺️  DATOS MOCKEADOS (sin Google Maps):\n')
console.log('   ✅ Coordenadas simuladas')
console.log('   ✅ Distancias aproximadas')
console.log('   ✅ Tiempos estimados')
console.log('   ✅ Ruta optimizada (mock)')
console.log('   ⚠️  No requiere API de Google Maps')

console.log('\n' + '=' .repeat(80))
console.log('\n🎯 PRÓXIMO PASO: REPARTIDOR - Entregar el Pedido\n')

console.log('📋 Acciones:')
console.log(`   1. Login: repartidor1@distribuidora.com / repar123`)
console.log(`   2. URL: http://localhost:3000/repartidor/dashboard`)
console.log(`   3. Buscar ruta: ${routeCode}`)
console.log(`   4. Click "Iniciar Ruta"`)
console.log(`   5. Ver pedido PED-DEMO-001`)
console.log(`   6. Click "Marcar como Entregado"`)
console.log(`   7. Completar formulario de entrega`)
console.log(`   8. Confirmar entrega`)

console.log('\n💡 NOTA: La ruta funciona sin API de Google Maps')
console.log('   Usa datos mockeados hardcodeados para el demo')

console.log('\n' + '=' .repeat(80))
console.log('\n✨ ¡Ruta lista para el happy path!\n')


#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('Ejecuta: node scripts/verify-demo-status.mjs TU_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔍 Verificando estado del Demo - PED-DEMO-001\n')
console.log('=' .repeat(80))

// Obtener el pedido demo
const { data: pedido, error: pedidoError } = await supabase
  .from('orders')
  .select(`
    *,
    customers(*),
    order_items(*, products:product_id(*)),
    profiles!orders_created_by_fkey(full_name, email, role),
    assembled_profiles:profiles!orders_assembled_by_fkey(full_name, email),
    delivered_profiles:profiles!orders_delivered_by_fkey(full_name, email)
  `)
  .eq('order_number', 'PED-DEMO-001')
  .single()

if (pedidoError || !pedido) {
  console.log('❌ No se encontró el pedido PED-DEMO-001')
  console.log('💡 Ejecuta primero: node scripts/create-happy-path-demo.mjs')
  process.exit(1)
}

console.log('\n📦 INFORMACIÓN DEL PEDIDO\n')
console.log(`   Número: ${pedido.order_number}`)
console.log(`   Cliente: ${pedido.customers?.commercial_name}`)
console.log(`   Email: ${pedido.customers?.email}`)
console.log(`   Total: $${pedido.total}`)
console.log(`   Fecha Pedido: ${pedido.order_date}`)
console.log(`   Fecha Entrega: ${pedido.delivery_date}`)
console.log(`   Prioridad: ${pedido.priority?.toUpperCase()}`)

// Estado actual
console.log('\n📊 ESTADO ACTUAL\n')
const estadoEmoji = {
  'PENDIENTE_ARMADO': '⏳',
  'EN_ARMADO': '🔨',
  'PENDIENTE_ENTREGA': '📦',
  'EN_RUTA': '🚚',
  'ENTREGADO': '✅',
  'CANCELADO': '❌'
}

console.log(`   ${estadoEmoji[pedido.status] || '❓'} ${pedido.status}`)

// Productos
console.log('\n🛒 PRODUCTOS\n')
if (pedido.order_items && pedido.order_items.length > 0) {
  pedido.order_items.forEach((item, i) => {
    const solicitado = item.quantity_requested
    const armado = item.quantity_assembled || 0
    const entregado = item.quantity_delivered || 0
    
    console.log(`   ${i + 1}. ${item.products?.name}`)
    console.log(`      - Solicitado: ${solicitado}`)
    console.log(`      - Armado: ${armado} ${armado === solicitado ? '✅' : '⚠️'}`)
    console.log(`      - Entregado: ${entregado} ${entregado === solicitado ? '✅' : '⚠️'}`)
    console.log(`      - Precio: $${item.unit_price} x ${solicitado} = $${item.subtotal}`)
  })
} else {
  console.log('   ⚠️  Sin productos')
}

// Timeline
console.log('\n⏱️  TIMELINE\n')
console.log(`   📝 Creado: ${new Date(pedido.created_at).toLocaleString('es-AR')}`)
console.log(`      Por: ${pedido.profiles?.full_name} (${pedido.profiles?.role})`)

if (pedido.assembly_started_at) {
  console.log(`\n   🔨 Armado Iniciado: ${new Date(pedido.assembly_started_at).toLocaleString('es-AR')}`)
  if (pedido.assembled_profiles) {
    console.log(`      Por: ${pedido.assembled_profiles.full_name}`)
  }
}

if (pedido.assembly_completed_at) {
  console.log(`   ✅ Armado Completado: ${new Date(pedido.assembly_completed_at).toLocaleString('es-AR')}`)
}

if (pedido.delivery_started_at) {
  console.log(`\n   🚚 Entrega Iniciada: ${new Date(pedido.delivery_started_at).toLocaleString('es-AR')}`)
}

if (pedido.delivered_at) {
  console.log(`   ✅ Entregado: ${new Date(pedido.delivered_at).toLocaleString('es-AR')}`)
  if (pedido.delivered_profiles) {
    console.log(`      Por: ${pedido.delivered_profiles.full_name}`)
  }
  if (pedido.payment_collected) {
    console.log(`   💰 Cobrado: $${pedido.payment_amount || pedido.total}`)
  }
}

// Verificar ruta
const { data: routeOrder } = await supabase
  .from('route_orders')
  .select('*, routes(*, profiles(full_name, email))')
  .eq('order_id', pedido.id)
  .single()

if (routeOrder) {
  console.log('\n🗺️  RUTA ASIGNADA\n')
  console.log(`   Código: ${routeOrder.routes.route_code}`)
  console.log(`   Fecha: ${routeOrder.routes.route_date}`)
  console.log(`   Estado: ${routeOrder.routes.status}`)
  console.log(`   Repartidor: ${routeOrder.routes.profiles?.full_name}`)
  console.log(`   Secuencia: #${routeOrder.sequence_number}`)
}

// Verificar calificación
const { data: rating } = await supabase
  .from('order_ratings')
  .select('*')
  .eq('order_id', pedido.id)
  .single()

if (rating) {
  console.log('\n⭐ CALIFICACIÓN DEL CLIENTE\n')
  console.log(`   Producto: ${'⭐'.repeat(rating.product_rating)}`)
  console.log(`   Tiempo: ${'⭐'.repeat(rating.delivery_rating)}`)
  console.log(`   Atención: ${'⭐'.repeat(rating.service_rating)}`)
  console.log(`   Promedio: ${rating.overall_rating.toFixed(1)} ⭐`)
  if (rating.comments) {
    console.log(`   Comentario: "${rating.comments}"`)
  }
}

// Historial
const { data: history } = await supabase
  .from('order_history')
  .select('*, profiles(full_name, role)')
  .eq('order_id', pedido.id)
  .order('created_at', { ascending: true })

if (history && history.length > 0) {
  console.log('\n📜 HISTORIAL DE CAMBIOS\n')
  history.forEach((h, i) => {
    const prevStatus = h.previous_status || 'NUEVO'
    const newStatus = h.new_status
    const date = new Date(h.created_at).toLocaleString('es-AR')
    const user = h.profiles?.full_name || 'Sistema'
    
    console.log(`   ${i + 1}. ${prevStatus} → ${newStatus}`)
    console.log(`      ${date} - ${user}`)
    if (h.change_reason) {
      console.log(`      "${h.change_reason}"`)
    }
  })
}

console.log('\n' + '=' .repeat(80))

// Progreso
console.log('\n🎯 PROGRESO DEL DEMO\n')

const pasos = [
  { nombre: 'Pedido Creado', completado: true },
  { nombre: 'Armado Iniciado', completado: !!pedido.assembly_started_at },
  { nombre: 'Armado Completado', completado: !!pedido.assembly_completed_at },
  { nombre: 'Ruta Asignada', completado: !!routeOrder },
  { nombre: 'Entrega Completada', completado: !!pedido.delivered_at },
  { nombre: 'Cliente Calificó', completado: !!rating }
]

pasos.forEach((paso, i) => {
  const emoji = paso.completado ? '✅' : '⏳'
  const estado = paso.completado ? 'COMPLETADO' : 'PENDIENTE'
  console.log(`   ${emoji} Paso ${i + 1}: ${paso.nombre} - ${estado}`)
})

const completados = pasos.filter(p => p.completado).length
const porcentaje = Math.round((completados / pasos.length) * 100)

console.log(`\n   Progreso: ${completados}/${pasos.length} pasos (${porcentaje}%)`)
console.log(`   [${'█'.repeat(Math.floor(porcentaje / 10))}${' '.repeat(10 - Math.floor(porcentaje / 10))}] ${porcentaje}%`)

// Siguiente paso
console.log('\n📋 PRÓXIMO PASO\n')

if (!pedido.assembly_started_at) {
  console.log('   👉 ARMAR EL PEDIDO')
  console.log('      Login: armado1@distribuidora.com / armado123')
  console.log('      URL: http://localhost:3000/armado/dashboard')
} else if (!pedido.assembly_completed_at) {
  console.log('   👉 COMPLETAR EL ARMADO')
  console.log('      Login: armado1@distribuidora.com / armado123')
  console.log('      URL: http://localhost:3000/armado/dashboard')
} else if (!routeOrder) {
  console.log('   👉 GENERAR RUTA')
  console.log('      Login: admin@distribuidora.com / admin123')
  console.log('      URL: http://localhost:3000/admin/routes/generate')
} else if (!pedido.delivered_at) {
  console.log('   👉 ENTREGAR EL PEDIDO')
  console.log('      Login: repartidor1@distribuidora.com / repar123')
  console.log('      URL: http://localhost:3000/repartidor/dashboard')
} else if (!rating) {
  console.log('   👉 CALIFICAR EL PEDIDO')
  console.log('      Login: cliente1@email.com / cliente123')
  console.log('      URL: http://localhost:3000/cliente/dashboard')
} else {
  console.log('   🎉 ¡DEMO COMPLETADO EXITOSAMENTE!')
  console.log('      Todos los pasos fueron ejecutados correctamente.')
  console.log('      El sistema funcionó sin errores en el happy path.')
}

console.log('\n' + '=' .repeat(80))
console.log('\n💡 Para más información, ver: DEMO-GUIDE.md\n')


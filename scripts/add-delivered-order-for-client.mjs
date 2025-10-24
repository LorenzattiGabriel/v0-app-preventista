#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('Ejecuta: node scripts/add-delivered-order-for-client.mjs TU_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('📦 Creando Pedido Entregado para Cliente Demo\n')
console.log('=' .repeat(80))

// Obtener usuarios
const { data: profiles } = await supabase.from('profiles').select('id, email, role')
const preventista1 = profiles.find(p => p.email === 'preventista1@distribuidora.com')
const armado1 = profiles.find(p => p.email === 'armado1@distribuidora.com')
const repartidor1 = profiles.find(p => p.email === 'repartidor1@distribuidora.com')
const cliente1 = profiles.find(p => p.email === 'cliente1@email.com')

console.log('\n👥 Usuarios:')
console.log(`   🛒 Preventista: ${preventista1?.email}`)
console.log(`   📦 Armado: ${armado1?.email}`)
console.log(`   🚚 Repartidor: ${repartidor1?.email}`)
console.log(`   👤 Cliente: ${cliente1?.email}`)

// Obtener cliente demo
const { data: cliente } = await supabase
  .from('customers')
  .select('*')
  .eq('email', 'cliente1@email.com')
  .single()

if (!cliente) {
  console.log('\n❌ No se encontró el cliente demo')
  process.exit(1)
}

console.log('\n📋 Cliente encontrado:')
console.log(`   Nombre: ${cliente.commercial_name}`)
console.log(`   Código: ${cliente.code}`)

// Obtener productos
const { data: products } = await supabase
  .from('products')
  .select('*')
  .limit(4)

console.log('\n📦 Productos seleccionados:')
products.forEach((p, i) => {
  console.log(`   ${i + 1}. ${p.name} - $${p.base_price}`)
})

// Fechas (hace 5 días)
const fiveDaysAgo = new Date(Date.now() - 5 * 86400000)
const fourDaysAgo = new Date(Date.now() - 4 * 86400000)
const threeDaysAgo = new Date(Date.now() - 3 * 86400000)

const orderDate = fiveDaysAgo.toISOString().split('T')[0]
const deliveryDate = threeDaysAgo.toISOString().split('T')[0]

// Calcular totales
const items = [
  { product: products[0], quantity: 2 },
  { product: products[1], quantity: 3 },
  { product: products[2], quantity: 1 },
]

const subtotal = items.reduce((sum, item) => {
  return sum + (parseFloat(item.product.base_price) * item.quantity)
}, 0)

console.log('\n💰 Totales:')
console.log(`   Subtotal: $${subtotal.toFixed(2)}`)
console.log(`   Total: $${subtotal.toFixed(2)}`)

// Crear pedido
console.log('\n📝 Creando pedido...')

const { data: pedido, error: pedidoError } = await supabase
  .from('orders')
  .insert({
    order_number: 'PED-DEMO-ENTREGADO-001',
    customer_id: cliente.id,
    order_date: orderDate,
    delivery_date: deliveryDate,
    priority: 'normal',
    order_type: 'presencial',
    status: 'ENTREGADO',
    subtotal: subtotal,
    total: subtotal,
    created_by: preventista1?.id,
    requires_invoice: false,
    observations: '📦 Pedido de demostración para calificación del cliente',
    // Datos de armado
    assembly_started_at: new Date(Date.now() - 4 * 86400000 - 7200000).toISOString(), // hace 4 días, 2h antes
    assembly_completed_at: new Date(Date.now() - 4 * 86400000 - 3600000).toISOString(), // hace 4 días, 1h antes
    assembled_by: armado1?.id,
    // Datos de entrega
    delivery_started_at: new Date(Date.now() - 3 * 86400000 - 3600000).toISOString(), // hace 3 días, 1h antes
    delivered_at: new Date(Date.now() - 3 * 86400000).toISOString(), // hace 3 días
    delivered_by: repartidor1?.id,
    delivery_notes: 'Entrega exitosa, cliente muy satisfecho con los productos'
  })
  .select()
  .single()

if (pedidoError) {
  console.log('❌ Error creando pedido:', pedidoError.message)
  process.exit(1)
}

console.log('   ✅ Pedido creado:', pedido.order_number)

// Crear items
console.log('\n📦 Agregando productos al pedido...')

for (const item of items) {
  const itemSubtotal = parseFloat(item.product.base_price) * item.quantity
  
  await supabase.from('order_items').insert({
    order_id: pedido.id,
    product_id: item.product.id,
    quantity_requested: item.quantity,
    quantity_assembled: item.quantity,
    quantity_delivered: item.quantity,
    unit_price: item.product.base_price,
    discount: 0,
    subtotal: itemSubtotal,
    is_shortage: false
  })
  
  console.log(`   ✅ ${item.quantity}x ${item.product.name}`)
}

// Crear historial
console.log('\n📜 Creando historial...')

const historyEntries = [
  {
    order_id: pedido.id,
    previous_status: null,
    new_status: 'PENDIENTE_ARMADO',
    changed_by: preventista1?.id,
    change_reason: 'Pedido creado por preventista',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    order_id: pedido.id,
    previous_status: 'PENDIENTE_ARMADO',
    new_status: 'EN_ARMADO',
    changed_by: armado1?.id,
    change_reason: 'Armado iniciado',
    created_at: new Date(Date.now() - 4 * 86400000 - 7200000).toISOString()
  },
  {
    order_id: pedido.id,
    previous_status: 'EN_ARMADO',
    new_status: 'PENDIENTE_ENTREGA',
    changed_by: armado1?.id,
    change_reason: 'Armado completado exitosamente',
    created_at: new Date(Date.now() - 4 * 86400000 - 3600000).toISOString()
  },
  {
    order_id: pedido.id,
    previous_status: 'PENDIENTE_ENTREGA',
    new_status: 'EN_REPARTICION',
    changed_by: repartidor1?.id,
    change_reason: 'Ruta iniciada - En camino al cliente',
    created_at: new Date(Date.now() - 3 * 86400000 - 3600000).toISOString()
  },
  {
    order_id: pedido.id,
    previous_status: 'EN_REPARTICION',
    new_status: 'ENTREGADO',
    changed_by: repartidor1?.id,
    change_reason: 'Pedido entregado y cobrado exitosamente',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  }
]

for (const entry of historyEntries) {
  await supabase.from('order_history').insert(entry)
}

console.log('   ✅ Historial completo creado')

console.log('\n' + '=' .repeat(80))
console.log('\n🎉 ¡Pedido Entregado Creado Exitosamente!\n')

console.log('📊 RESUMEN DEL PEDIDO:\n')
console.log(`   Número: ${pedido.order_number}`)
console.log(`   Cliente: ${cliente.commercial_name}`)
console.log(`   Estado: ENTREGADO ✅`)
console.log(`   Total: $${pedido.total}`)
console.log(`   Fecha del pedido: ${orderDate}`)
console.log(`   Fecha de entrega: ${deliveryDate}`)
console.log(`   Repartidor: ${repartidor1?.email}`)

console.log('\n📦 PRODUCTOS:\n')
items.forEach((item, i) => {
  console.log(`   ${i + 1}. ${item.quantity}x ${item.product.name} - $${(parseFloat(item.product.base_price) * item.quantity).toFixed(2)}`)
})

console.log('\n⏱️  TIMELINE:\n')
console.log(`   📝 Creado: ${fiveDaysAgo.toLocaleDateString('es-AR')}`)
console.log(`   🔨 Armado: ${fourDaysAgo.toLocaleDateString('es-AR')}`)
console.log(`   ✅ Entregado: ${threeDaysAgo.toLocaleDateString('es-AR')}`)
console.log(`   💰 Total: $${pedido.total}`)

console.log('\n' + '=' .repeat(80))
console.log('\n🎯 SIGUIENTE PASO: CALIFICAR EL PEDIDO\n')

console.log('📋 Acciones:')
console.log(`   1. Login: cliente1@email.com / cliente123`)
console.log(`   2. URL: http://localhost:3000/cliente/dashboard`)
console.log(`   3. Ver "Pedidos Entregados"`)
console.log(`   4. Buscar pedido: ${pedido.order_number}`)
console.log(`   5. Click "Ver Detalles"`)
console.log(`   6. Click "Calificar Pedido"`)
console.log(`   7. Dar 5 estrellas ⭐⭐⭐⭐⭐`)
console.log(`   8. Agregar comentario positivo`)

console.log('\n💡 El cliente ahora tiene un pedido listo para calificar!\n')


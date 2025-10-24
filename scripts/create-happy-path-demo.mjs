#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('Ejecuta: node scripts/create-happy-path-demo.mjs TU_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🎬 Creando escenario de demostración - Happy Path\n')
console.log('=' .repeat(80))

// Obtener usuarios
const { data: profiles } = await supabase.from('profiles').select('id, email, role')
const preventista1 = profiles.find(p => p.email === 'preventista1@distribuidora.com')
const armado1 = profiles.find(p => p.email === 'armado1@distribuidora.com')
const repartidor1 = profiles.find(p => p.email === 'repartidor1@distribuidora.com')
const admin = profiles.find(p => p.role === 'administrativo')
const cliente1 = profiles.find(p => p.email === 'cliente1@email.com')

console.log('\n👥 Actores del Demo:')
console.log(`   🛒 Preventista: Juan Preventista (${preventista1?.email})`)
console.log(`   📦 Armado: Pedro Armador (${armado1?.email})`)
console.log(`   🚚 Repartidor: Carlos Méndez (${repartidor1?.email})`)
console.log(`   👨‍💼 Admin: Carlos Administrador (${admin?.email})`)
console.log(`   👤 Cliente: José Pérez (${cliente1?.email})`)

// Obtener productos
const { data: products } = await supabase.from('products').select('*').limit(5)
const producto1 = products[0]
const producto2 = products[1]
const producto3 = products[2]

console.log('\n📦 Productos para el pedido:')
console.log(`   1. ${producto1.name} - $${producto1.base_price}`)
console.log(`   2. ${producto2.name} - $${producto2.base_price}`)
console.log(`   3. ${producto3.name} - $${producto3.base_price}`)

// Obtener zona
const { data: zones } = await supabase.from('zones').select('*').limit(1)
const zona = zones[0]

console.log(`\n🗺️  Zona: ${zona.name}`)

// PASO 1: Crear un cliente demo si no existe
console.log('\n📋 PASO 1: Verificando Cliente Demo...')
let clienteDemo

const { data: existingCliente } = await supabase
  .from('customers')
  .select('*')
  .eq('code', 'CLI-DEMO-001')
  .single()

if (existingCliente) {
  clienteDemo = existingCliente
  console.log('   ✅ Cliente demo ya existe: ' + clienteDemo.commercial_name)
} else {
  const { data: newCliente } = await supabase
    .from('customers')
    .insert({
      code: 'CLI-DEMO-001',
      commercial_name: 'Cliente Demo - Almacén La Prueba',
      contact_name: 'José Pérez',
      phone: '351-9999999',
      email: cliente1?.email || 'cliente1@email.com',
      street: 'Av. Demo',
      street_number: '123',
      locality: 'Córdoba',
      province: 'Córdoba',
      customer_type: 'minorista',
      iva_condition: 'consumidor_final',
      credit_days: 0,
      credit_limit: 10000,
      general_discount: 0,
      zone_id: zona.id,
      created_by: preventista1?.id,
      is_active: true
    })
    .select()
    .single()
  
  clienteDemo = newCliente
  console.log('   ✅ Cliente demo creado: ' + clienteDemo.commercial_name)
}

// PASO 2: Crear un pedido demo
console.log('\n📋 PASO 2: Creando Pedido Demo...')

const today = new Date().toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const subtotal = (producto1.base_price * 3) + (producto2.base_price * 2) + (producto3.base_price * 5)
const total = subtotal

const { data: pedidoDemo, error: pedidoError } = await supabase
  .from('orders')
  .insert({
    order_number: 'PED-DEMO-001',
    customer_id: clienteDemo.id,
    order_date: today,
    delivery_date: tomorrow,
    priority: 'alta',
    order_type: 'presencial',
    status: 'PENDIENTE_ARMADO',
    subtotal: subtotal,
    total: total,
    created_by: preventista1?.id,
    requires_invoice: false,
    observations: '🎬 PEDIDO DEMO - Happy Path para demostración'
  })
  .select()
  .single()

if (pedidoError) {
  // Si ya existe, obtenerlo
  const { data: existingPedido } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', 'PED-DEMO-001')
    .single()
  
  if (existingPedido) {
    console.log('   ⚠️  Pedido demo ya existe, actualizando...')
    await supabase
      .from('orders')
      .update({
        status: 'PENDIENTE_ARMADO',
        assembly_started_at: null,
        assembly_completed_at: null,
        assembled_by: null,
        delivery_started_at: null,
        delivered_at: null,
        delivered_by: null
      })
      .eq('id', existingPedido.id)
    
    console.log('   ✅ Pedido resetado a PENDIENTE_ARMADO')
  }
} else {
  console.log(`   ✅ Pedido creado: ${pedidoDemo.order_number}`)
  console.log(`      Estado: ${pedidoDemo.status}`)
  console.log(`      Total: $${pedidoDemo.total}`)

  // Crear items del pedido
  const items = [
    { product_id: producto1.id, quantity_requested: 3, unit_price: producto1.base_price, discount: 0, subtotal: producto1.base_price * 3 },
    { product_id: producto2.id, quantity_requested: 2, unit_price: producto2.base_price, discount: 0, subtotal: producto2.base_price * 2 },
    { product_id: producto3.id, quantity_requested: 5, unit_price: producto3.base_price, discount: 0, subtotal: producto3.base_price * 5 }
  ]

  await supabase.from('order_items').insert(
    items.map(item => ({
      order_id: pedidoDemo.id,
      ...item
    }))
  )

  console.log(`   ✅ ${items.length} items agregados al pedido`)

  // Crear historial inicial
  await supabase.from('order_history').insert({
    order_id: pedidoDemo.id,
    previous_status: null,
    new_status: 'PENDIENTE_ARMADO',
    changed_by: preventista1?.id,
    change_reason: 'Pedido creado - Demo Happy Path'
  })
}

console.log('\n' + '=' .repeat(80))
console.log('\n🎉 ¡Escenario Demo Creado Exitosamente!\n')

console.log('📝 FLUJO COMPLETO DE DEMOSTRACIÓN:\n')

console.log('┌─────────────────────────────────────────────────────────────────┐')
console.log('│  PASO 1: PREVENTISTA - Crear Pedido                           │')
console.log('└─────────────────────────────────────────────────────────────────┘')
console.log('✅ YA COMPLETADO')
console.log(`   Login: preventista1@distribuidora.com / prev123`)
console.log(`   URL: http://localhost:3000/preventista/dashboard`)
console.log(`   Pedido: PED-DEMO-001`)
console.log(`   Cliente: ${clienteDemo.commercial_name}`)
console.log(`   Total: $${total.toFixed(2)}`)

console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│  PASO 2: ARMADO - Armar el Pedido                             │')
console.log('└─────────────────────────────────────────────────────────────────┘')
console.log('📋 SIGUIENTE ACCIÓN')
console.log(`   1. Login: armado1@distribuidora.com / armado123`)
console.log(`   2. URL: http://localhost:3000/armado/dashboard`)
console.log(`   3. Buscar pedido: PED-DEMO-001`)
console.log(`   4. Click "Armar"`)
console.log(`   5. Click "Iniciar Armado"`)
console.log(`   6. Verificar cantidades (dejar todo OK)`)
console.log(`   7. Click "Confirmar Armado"`)
console.log(`   ✅ Estado cambiará a: PENDIENTE_ENTREGA`)

console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│  PASO 3: ADMIN - Generar Ruta de Entrega                      │')
console.log('└─────────────────────────────────────────────────────────────────┘')
console.log('📋 ACCIÓN REQUERIDA')
console.log(`   1. Login: admin@distribuidora.com / admin123`)
console.log(`   2. URL: http://localhost:3000/admin/dashboard`)
console.log(`   3. Click "Generar Rutas Automáticas"`)
console.log(`   4. Seleccionar zona: ${zona.name}`)
console.log(`   5. Seleccionar fecha: ${tomorrow}`)
console.log(`   6. Asignar repartidor: Carlos Méndez`)
console.log(`   7. Click "Generar Ruta"`)
console.log(`   ✅ Se creará una ruta con PED-DEMO-001`)

console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│  PASO 4: REPARTIDOR - Entregar el Pedido                      │')
console.log('└─────────────────────────────────────────────────────────────────┘')
console.log('📋 ACCIÓN REQUERIDA')
console.log(`   1. Login: repartidor1@distribuidora.com / repar123`)
console.log(`   2. URL: http://localhost:3000/repartidor/dashboard`)
console.log(`   3. Ver "Rutas Asignadas"`)
console.log(`   4. Click en la ruta del día`)
console.log(`   5. Click "Iniciar Ruta"`)
console.log(`   6. Marcar pedido PED-DEMO-001 como entregado`)
console.log(`   7. Indicar si se cobró`)
console.log(`   ✅ Estado cambiará a: ENTREGADO`)

console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│  PASO 5: CLIENTE - Calificar el Servicio                      │')
console.log('└─────────────────────────────────────────────────────────────────┘')
console.log('📋 ACCIÓN REQUERIDA')
console.log(`   1. Login: cliente1@email.com / cliente123`)
console.log(`   2. URL: http://localhost:3000/cliente/dashboard`)
console.log(`   3. Ver pedido PED-DEMO-001 en "Pedidos Entregados"`)
console.log(`   4. Click "Ver Detalles"`)
console.log(`   5. Click "Calificar Pedido"`)
console.log(`   6. Dar 5 estrellas ⭐⭐⭐⭐⭐`)
console.log(`   7. Agregar comentario: "Excelente servicio, todo perfecto"`)
console.log(`   ✅ Demo completado exitosamente!`)

console.log('\n' + '=' .repeat(80))
console.log('\n💡 TIPS PARA LA DEMO:\n')
console.log('   • Abre múltiples ventanas de incógnito para diferentes usuarios')
console.log('   • Sigue el orden de pasos para el happy path')
console.log('   • Cada acción se refleja en tiempo real en los dashboards')
console.log('   • Usa el historial de pedidos para ver el tracking completo')
console.log('   • El sistema valida cada transición de estado')

console.log('\n📊 DATOS DEL DEMO:\n')
console.log(`   Pedido: PED-DEMO-001`)
console.log(`   Cliente: ${clienteDemo.commercial_name}`)
console.log(`   Productos: ${products.slice(0, 3).map(p => p.name).join(', ')}`)
console.log(`   Total: $${total.toFixed(2)}`)
console.log(`   Fecha Entrega: ${tomorrow}`)
console.log(`   Zona: ${zona.name}`)

console.log('\n' + '=' .repeat(80))
console.log('\n🚀 ¡Listo para demostrar!\n')


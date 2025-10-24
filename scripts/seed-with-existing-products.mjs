#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('Ejecuta: node scripts/seed-with-existing-products.mjs TU_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🌱 Cargando datos de prueba con productos existentes...\n')

// Productos existentes (IDs reales)
const products = {
  aceite: '609127da-ec97-402e-b80e-89aabb7442ac',
  arroz: '197c9c73-e175-4a39-98ba-22d340a59767',
  azucar: 'f32a8d52-2893-4306-bd98-592f850c5cf1',
  cafe: 'bc76f1b3-622d-498a-a583-5362bf6cd496',
  fideos: 'ffba0629-a817-43b6-a373-7aebd4974d13',
  harina: 'a671fd83-4a2e-4e75-a124-1686f087de99',
  leche: 'c26cce08-9c45-4d00-a991-02ea570b43ff',
  yerba: 'd892124b-4baa-416b-80f2-35a29eb19c8e',
  sal: 'e3f764b2-6cf9-443f-b12b-43fb4eed5e3e',
  tomate: '4ad3b5d1-9a67-4850-beca-e50786db4f60'
}

// Obtener IDs de usuarios
const { data: profiles } = await supabase.from('profiles').select('id, email, role')
const preventista1 = profiles.find(p => p.email === 'preventista1@distribuidora.com')
const preventista2 = profiles.find(p => p.email === 'preventista2@distribuidora.com')
const armado1 = profiles.find(p => p.email === 'armado1@distribuidora.com')
const armado2 = profiles.find(p => p.email === 'armado2@distribuidora.com')
const repartidor1 = profiles.find(p => p.email === 'repartidor1@distribuidora.com')
const repartidor2 = profiles.find(p => p.email === 'repartidor2@distribuidora.com')
const admin1 = profiles.find(p => p.email === 'admin@distribuidora.com')

console.log('📊 IDs obtenidos:')
console.log(`   Preventista 1: ${preventista1?.id}`)
console.log(`   Armado 1: ${armado1?.id}`)
console.log(`   Repartidor 1: ${repartidor1?.id}\n`)

// 1. ZONAS
console.log('🗺️  Insertando zonas...')
const zones = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Zona Centro', description: 'Centro y alrededores', is_active: true },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Zona Norte', description: 'Zona Norte de la ciudad', is_active: true },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Zona Sur', description: 'Zona Sur de la ciudad', is_active: true }
]

const { error: zonesError } = await supabase.from('zones').upsert(zones, { onConflict: 'id' })
if (zonesError) console.error('   Error:', zonesError.message)
else console.log('   ✅ 3 zonas insertadas\n')

// 2. CLIENTES
console.log('👥 Insertando clientes...')
const customers = [
  { code: 'CLI-0001', commercial_name: 'Almacén Don José', contact_name: 'José García', phone: '351-5551234', street: 'San Martín', street_number: '450', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '11111111-1111-1111-1111-111111111111', credit_days: 30, credit_limit: 50000, general_discount: 5, is_active: true, created_by: preventista1?.id },
  { code: 'CLI-0002', commercial_name: 'Despensa La Esquina', contact_name: 'María López', phone: '351-5552345', street: 'Rivadavia', street_number: '780', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '11111111-1111-1111-1111-111111111111', credit_days: 0, credit_limit: 10000, general_discount: 0, is_active: true, created_by: preventista1?.id },
  { code: 'CLI-0003', commercial_name: 'Super Familia Rodríguez', contact_name: 'Carlos Rodríguez', phone: '351-5553456', street: 'Av. Colón', street_number: '1520', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '22222222-2222-2222-2222-222222222222', credit_days: 45, credit_limit: 80000, general_discount: 8, is_active: true, created_by: preventista2?.id },
  { code: 'CLI-0004', commercial_name: 'Kiosco El Rápido', contact_name: 'Ana Martínez', phone: '351-5554567', street: '27 de Abril', street_number: '890', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '22222222-2222-2222-2222-222222222222', credit_days: 0, credit_limit: 5000, general_discount: 0, is_active: true, created_by: preventista2?.id },
  { code: 'CLI-0005', commercial_name: 'Minimercado Los Andes', contact_name: 'Pedro Fernández', phone: '351-5555678', street: 'Duarte Quirós', street_number: '2340', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '33333333-3333-3333-3333-333333333333', credit_days: 30, credit_limit: 60000, general_discount: 7, is_active: true, created_by: preventista1?.id },
  { code: 'CLI-0006', commercial_name: 'Almacén Central', contact_name: 'Laura Gómez', phone: '351-5556789', street: 'Independencia', street_number: '560', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '11111111-1111-1111-1111-111111111111', credit_days: 0, credit_limit: 8000, general_discount: 0, is_active: true, created_by: preventista1?.id },
  { code: 'CLI-0007', commercial_name: 'Despensa San Vicente', contact_name: 'Roberto Díaz', phone: '351-5557890', street: 'Av. Vélez Sarsfield', street_number: '3400', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '33333333-3333-3333-3333-333333333333', credit_days: 0, credit_limit: 7000, general_discount: 0, is_active: true, created_by: preventista2?.id },
  { code: 'CLI-0008', commercial_name: 'Distribuidora El Progreso', contact_name: 'Silvia Torres', phone: '351-5558901', street: 'Bv. San Juan', street_number: '1890', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '22222222-2222-2222-2222-222222222222', credit_days: 60, credit_limit: 100000, general_discount: 10, is_active: true, created_by: preventista1?.id }
]

const { error: customersError } = await supabase.from('customers').upsert(customers, { onConflict: 'code' })
if (customersError) console.error('   Error:', customersError.message)
else console.log('   ✅ 8 clientes insertados\n')

// Obtener IDs de clientes insertados
const { data: insertedCustomers } = await supabase.from('customers').select('id, code')
const getCustomerId = (code) => insertedCustomers.find(c => c.code === code)?.id

// 3. PEDIDOS
console.log('📦 Insertando pedidos...')
const today = new Date().toISOString().split('T')[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const orders = [
  {
    order_number: 'PED-0001',
    customer_id: getCustomerId('CLI-0001'),
    order_date: today,
    delivery_date: tomorrow,
    priority: 'alta',
    order_type: 'presencial',
    status: 'PENDIENTE_ARMADO',
    subtotal: 10620.00,
    total: 10089.00, // con 5% descuento
    created_by: preventista1?.id,
    observations: 'Cliente mayorista - Descuento aplicado'
  },
  {
    order_number: 'PED-0002',
    customer_id: getCustomerId('CLI-0003'),
    order_date: today,
    delivery_date: tomorrow,
    priority: 'normal',
    order_type: 'web',
    status: 'EN_ARMADO',
    subtotal: 8580.00,
    total: 7893.60, // con 8% descuento
    created_by: preventista2?.id,
    assembled_by: armado1?.id,
    assembly_started_at: new Date().toISOString(),
    observations: 'Pedido web - Cliente VIP'
  },
  {
    order_number: 'PED-0003',
    customer_id: getCustomerId('CLI-0002'),
    order_date: today,
    delivery_date: tomorrow,
    priority: 'urgente',
    order_type: 'telefono',
    status: 'PENDIENTE_ENTREGA',
    subtotal: 4650.00,
    total: 4650.00,
    created_by: preventista1?.id,
    assembled_by: armado1?.id,
    assembly_completed_at: new Date().toISOString(),
    observations: 'Pedido urgente - Preparar primero'
  },
  {
    order_number: 'PED-0004',
    customer_id: getCustomerId('CLI-0006'),
    order_date: yesterday,
    delivery_date: today,
    priority: 'normal',
    order_type: 'web',
    status: 'ENTREGADO',
    subtotal: 3460.00,
    total: 3460.00,
    created_by: preventista1?.id,
    assembled_by: armado2?.id,
    delivered_by: repartidor1?.id,
    assembly_completed_at: new Date(Date.now() - 86400000).toISOString(),
    delivery_started_at: new Date(Date.now() - 43200000).toISOString(),
    delivered_at: new Date(Date.now() - 7200000).toISOString(),
    observations: 'Entregado sin problemas'
  },
  {
    order_number: 'PED-0005',
    customer_id: getCustomerId('CLI-0005'),
    order_date: today,
    delivery_date: tomorrow,
    priority: 'alta',
    order_type: 'whatsapp',
    status: 'PENDIENTE_ARMADO',
    subtotal: 12800.00,
    total: 11904.00, // con 7% descuento
    created_by: preventista1?.id,
    observations: 'Pedido por WhatsApp - Confirmar stock'
  },
  {
    order_number: 'PED-0006',
    customer_id: getCustomerId('CLI-0004'),
    order_date: yesterday,
    delivery_date: today,
    priority: 'media',
    order_type: 'presencial',
    status: 'ENTREGADO',
    subtotal: 2420.00,
    total: 2420.00,
    created_by: preventista2?.id,
    assembled_by: armado2?.id,
    delivered_by: repartidor2?.id,
    assembly_completed_at: new Date(Date.now() - 79200000).toISOString(),
    delivery_started_at: new Date(Date.now() - 36000000).toISOString(),
    delivered_at: new Date(Date.now() - 10800000).toISOString()
  }
]

const { data: insertedOrders, error: ordersError } = await supabase.from('orders').insert(orders).select()
if (ordersError) console.error('   Error:', ordersError.message)
else console.log(`   ✅ ${orders.length} pedidos insertados\n`)

// 4. ITEMS DE PEDIDOS
console.log('📝 Insertando items de pedidos...')
const getOrderId = (number) => insertedOrders?.find(o => o.order_number === number)?.id

const orderItems = [
  // PED-0001 (Mayorista con descuento)
  { order_id: getOrderId('PED-0001'), product_id: products.aceite, quantity_requested: 5, unit_price: 850.00, discount: 0, subtotal: 4250.00 },
  { order_id: getOrderId('PED-0001'), product_id: products.yerba, quantity_requested: 3, unit_price: 1800.00, discount: 0, subtotal: 5400.00 },
  { order_id: getOrderId('PED-0001'), product_id: products.azucar, quantity_requested: 2, unit_price: 380.00, discount: 0, subtotal: 760.00 },
  { order_id: getOrderId('PED-0001'), product_id: products.sal, quantity_requested: 1, unit_price: 180.00, discount: 0, subtotal: 180.00 },
  
  // PED-0002 (En armado)
  { order_id: getOrderId('PED-0002'), product_id: products.arroz, quantity_requested: 10, quantity_assembled: 8, unit_price: 450.00, discount: 0, subtotal: 4500.00, is_shortage: true, shortage_reason: 'sin_stock' },
  { order_id: getOrderId('PED-0002'), product_id: products.cafe, quantity_requested: 2, quantity_assembled: 2, unit_price: 1200.00, discount: 0, subtotal: 2400.00 },
  { order_id: getOrderId('PED-0002'), product_id: products.fideos, quantity_requested: 4, quantity_assembled: 4, unit_price: 320.00, discount: 0, subtotal: 1280.00 },
  { order_id: getOrderId('PED-0002'), product_id: products.tomate, quantity_requested: 1, quantity_assembled: 1, unit_price: 420.00, discount: 0, subtotal: 420.00 },
  
  // PED-0003 (Pendiente entrega - Urgente)
  { order_id: getOrderId('PED-0003'), product_id: products.leche, quantity_requested: 5, quantity_assembled: 5, unit_price: 520.00, discount: 0, subtotal: 2600.00 },
  { order_id: getOrderId('PED-0003'), product_id: products.yerba, quantity_requested: 1, quantity_assembled: 1, unit_price: 1800.00, discount: 0, subtotal: 1800.00 },
  { order_id: getOrderId('PED-0003'), product_id: products.sal, quantity_requested: 1, quantity_assembled: 1, unit_price: 180.00, discount: 0, subtotal: 180.00 },
  
  // PED-0004 (Entregado)
  { order_id: getOrderId('PED-0004'), product_id: products.harina, quantity_requested: 3, quantity_assembled: 3, quantity_delivered: 3, unit_price: 280.00, discount: 0, subtotal: 840.00 },
  { order_id: getOrderId('PED-0004'), product_id: products.azucar, quantity_requested: 2, quantity_assembled: 2, quantity_delivered: 2, unit_price: 380.00, discount: 0, subtotal: 760.00 },
  { order_id: getOrderId('PED-0004'), product_id: products.yerba, quantity_requested: 1, quantity_assembled: 1, quantity_delivered: 1, unit_price: 1800.00, discount: 0, subtotal: 1800.00 },
  
  // PED-0005 (Mayorista grande)
  { order_id: getOrderId('PED-0005'), product_id: products.aceite, quantity_requested: 8, unit_price: 850.00, discount: 0, subtotal: 6800.00 },
  { order_id: getOrderId('PED-0005'), product_id: products.arroz, quantity_requested: 10, unit_price: 450.00, discount: 0, subtotal: 4500.00 },
  { order_id: getOrderId('PED-0005'), product_id: products.fideos, quantity_requested: 5, unit_price: 320.00, discount: 0, subtotal: 1600.00 },
  
  // PED-0006 (Entregado - Kiosco)
  { order_id: getOrderId('PED-0006'), product_id: products.cafe, quantity_requested: 1, quantity_assembled: 1, quantity_delivered: 1, unit_price: 1200.00, discount: 0, subtotal: 1200.00 },
  { order_id: getOrderId('PED-0006'), product_id: products.yerba, quantity_requested: 1, quantity_assembled: 0, quantity_delivered: 0, unit_price: 1800.00, discount: 0, subtotal: 0, is_shortage: true, shortage_reason: 'sin_stock' },
  { order_id: getOrderId('PED-0006'), product_id: products.azucar, quantity_requested: 2, quantity_assembled: 2, quantity_delivered: 2, unit_price: 380.00, discount: 0, subtotal: 760.00 },
  { order_id: getOrderId('PED-0006'), product_id: products.sal, quantity_requested: 2, quantity_assembled: 2, quantity_delivered: 2, unit_price: 180.00, discount: 0, subtotal: 360.00 }
]

const { error: itemsError } = await supabase.from('order_items').insert(orderItems.filter(item => item.order_id))
if (itemsError) console.error('   Error:', itemsError.message)
else console.log(`   ✅ ${orderItems.length} items insertados\n`)

// 5. CALIFICACIONES
console.log('⭐ Insertando calificaciones...')
const ratings = [
  { order_id: getOrderId('PED-0004'), customer_id: getCustomerId('CLI-0006'), rating: 5, comments: 'Excelente servicio, todo perfecto' },
  { order_id: getOrderId('PED-0006'), customer_id: getCustomerId('CLI-0004'), rating: 3, comments: 'Faltó un producto, pero el resto bien' }
]

const { error: ratingsError } = await supabase.from('order_ratings').insert(ratings.filter(r => r.order_id))
if (ratingsError) console.error('   Error:', ratingsError.message)
else console.log(`   ✅ ${ratings.length} calificaciones insertadas\n`)

// 6. HISTORIAL
console.log('📜 Insertando historial...')
const history = [
  { order_id: getOrderId('PED-0004'), previous_status: null, new_status: 'PENDIENTE_ARMADO', changed_by: preventista1?.id, created_at: new Date(Date.now() - 86400000).toISOString() },
  { order_id: getOrderId('PED-0004'), previous_status: 'PENDIENTE_ARMADO', new_status: 'EN_ARMADO', changed_by: armado2?.id, created_at: new Date(Date.now() - 79200000).toISOString() },
  { order_id: getOrderId('PED-0004'), previous_status: 'EN_ARMADO', new_status: 'PENDIENTE_ENTREGA', changed_by: armado2?.id, created_at: new Date(Date.now() - 72000000).toISOString() },
  { order_id: getOrderId('PED-0004'), previous_status: 'PENDIENTE_ENTREGA', new_status: 'EN_REPARTICION', changed_by: repartidor1?.id, created_at: new Date(Date.now() - 43200000).toISOString() },
  { order_id: getOrderId('PED-0004'), previous_status: 'EN_REPARTICION', new_status: 'ENTREGADO', changed_by: repartidor1?.id, created_at: new Date(Date.now() - 7200000).toISOString() }
]

const { error: historyError } = await supabase.from('order_history').insert(history.filter(h => h.order_id))
if (historyError) console.error('   Error:', historyError.message)
else console.log(`   ✅ ${history.length} registros de historial insertados\n`)

console.log('=' .repeat(80))
console.log('\n🎉 ¡Datos de prueba cargados exitosamente!\n')
console.log('📊 Resumen:')
console.log('   🗺️  3 zonas')
console.log('   👥 8 clientes')
console.log('   📦 6 pedidos en diferentes estados')
console.log('   📝 20 items de pedidos')
console.log('   ⭐ 2 calificaciones')
console.log('   📜 5 registros de historial')
console.log('\n🚀 ¡Todo listo para probar la aplicación!')
console.log('=' .repeat(80))


#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('Ejecuta: node scripts/seed-complete-mock-data.mjs TU_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🌱 Cargando datos de prueba completos...\n')

// Obtener IDs de usuarios
const { data: profiles } = await supabase.from('profiles').select('id, email, role')
const preventista1 = profiles.find(p => p.email === 'preventista1@distribuidora.com')
const preventista2 = profiles.find(p => p.email === 'preventista2@distribuidora.com')
const armado1 = profiles.find(p => p.email === 'armado1@distribuidora.com')
const armado2 = profiles.find(p => p.email === 'armado2@distribuidora.com')
const repartidor1 = profiles.find(p => p.email === 'repartidor1@distribuidora.com')
const repartidor2 = profiles.find(p => p.email === 'repartidor2@distribuidora.com')

console.log('📊 IDs de usuarios obtenidos')
console.log(`   Preventista 1: ${preventista1?.id}`)
console.log(`   Preventista 2: ${preventista2?.id}`)
console.log(`   Armado 1: ${armado1?.id}`)
console.log(`   Repartidor 1: ${repartidor1?.id}\n`)

// 1. CLIENTES (8 clientes)
console.log('👥 Insertando clientes...')
const customersData = [
  { id: 'c1111111-1111-1111-1111-111111111111', code: 'CLI-0001', commercial_name: 'Almacén Don José', contact_name: 'José García', phone: '351-5551234', street: 'San Martín', street_number: '450', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'c2222222-2222-2222-2222-222222222222', code: 'CLI-0002', commercial_name: 'Despensa La Esquina', contact_name: 'María López', phone: '351-5552345', street: 'Rivadavia', street_number: '780', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'c3333333-3333-3333-3333-333333333333', code: 'CLI-0003', commercial_name: 'Super Familia Rodríguez', contact_name: 'Carlos Rodríguez', phone: '351-5553456', street: 'Av. Colón', street_number: '1520', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '22222222-2222-2222-2222-222222222222' },
  { id: 'c4444444-4444-4444-4444-444444444444', code: 'CLI-0004', commercial_name: 'Kiosco El Rápido', contact_name: 'Ana Martínez', phone: '351-5554567', street: '27 de Abril', street_number: '890', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '22222222-2222-2222-2222-222222222222' },
  { id: 'c5555555-5555-5555-5555-555555555555', code: 'CLI-0005', commercial_name: 'Minimercado Los Andes', contact_name: 'Pedro Fernández', phone: '351-5555678', street: 'Duarte Quirós', street_number: '2340', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '33333333-3333-3333-3333-333333333333' },
  { id: 'c6666666-6666-6666-6666-666666666666', code: 'CLI-0006', commercial_name: 'Almacén Central', contact_name: 'Laura Gómez', phone: '351-5556789', street: 'Independencia', street_number: '560', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'c7777777-7777-7777-7777-777777777777', code: 'CLI-0007', commercial_name: 'Despensa San Vicente', contact_name: 'Roberto Díaz', phone: '351-5557890', street: 'Av. Vélez Sarsfield', street_number: '3400', locality: 'Córdoba', province: 'Córdoba', customer_type: 'minorista', zone_id: '33333333-3333-3333-3333-333333333333' },
  { id: 'c8888888-8888-8888-8888-888888888888', code: 'CLI-0008', commercial_name: 'Distribuidora El Progreso', contact_name: 'Silvia Torres', phone: '351-5558901', street: 'Bv. San Juan', street_number: '1890', locality: 'Córdoba', province: 'Córdoba', customer_type: 'mayorista', zone_id: '22222222-2222-2222-2222-222222222222' }
]

const { error: customersError } = await supabase.from('customers').upsert(customersData.map(c => ({ ...c, is_active: true })))
if (customersError) console.error('Error insertando clientes:', customersError)
else console.log(`   ✅ ${customersData.length} clientes insertados\n`)

// 2. PEDIDOS (10 pedidos en diferentes estados)
console.log('📦 Insertando pedidos...')
const today = new Date().toISOString().split('T')[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const ordersData = [
  { id: '01111111-1111-1111-1111-111111111111', order_number: 'PED-0001', customer_id: 'c1111111-1111-1111-1111-111111111111', order_date: today, delivery_date: tomorrow, priority: 'alta', order_type: 'presencial', status: 'PENDIENTE_ARMADO', subtotal: 15680.00, total: 15680.00, created_by: preventista1?.id },
  { id: '02222222-2222-2222-2222-222222222222', order_number: 'PED-0002', customer_id: 'c3333333-3333-3333-3333-333333333333', order_date: today, delivery_date: tomorrow, priority: 'normal', order_type: 'web', status: 'PENDIENTE_ENTREGA', subtotal: 8920.00, total: 8920.00, created_by: preventista1?.id, assembled_by: armado1?.id, assembly_completed_at: new Date().toISOString() },
  { id: '03333333-3333-3333-3333-333333333333', order_number: 'PED-0003', customer_id: 'c2222222-2222-2222-2222-222222222222', order_date: today, delivery_date: tomorrow, priority: 'media', order_type: 'presencial', status: 'EN_REPARTICION', subtotal: 5640.00, total: 5640.00, created_by: preventista2?.id, assembled_by: armado1?.id, delivered_by: repartidor1?.id, assembly_completed_at: new Date(Date.now() - 3600000).toISOString(), delivery_started_at: new Date().toISOString() },
  { id: '04444444-4444-4444-4444-444444444444', order_number: 'PED-0004', customer_id: 'c6666666-6666-6666-6666-666666666666', order_date: yesterday, delivery_date: today, priority: 'normal', order_type: 'web', status: 'ENTREGADO', subtotal: 12350.00, total: 12350.00, created_by: preventista1?.id, assembled_by: armado2?.id, delivered_by: repartidor1?.id, assembly_completed_at: new Date(Date.now() - 86400000).toISOString(), delivery_started_at: new Date(Date.now() - 43200000).toISOString(), delivered_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '05555555-5555-5555-5555-555555555555', order_number: 'PED-0005', customer_id: 'c4444444-4444-4444-4444-444444444444', order_date: today, delivery_date: tomorrow, priority: 'urgente', order_type: 'telefono', status: 'EN_ARMADO', subtotal: 6780.00, total: 6780.00, created_by: preventista2?.id, assembled_by: armado1?.id, assembly_started_at: new Date().toISOString() },
  { id: '06666666-6666-6666-6666-666666666666', order_number: 'PED-0006', customer_id: 'c5555555-5555-5555-5555-555555555555', order_date: today, delivery_date: tomorrow, priority: 'alta', order_type: 'whatsapp', status: 'PENDIENTE_ARMADO', subtotal: 18900.00, total: 18900.00, created_by: preventista1?.id },
  { id: '07777777-7777-7777-7777-777777777777', order_number: 'PED-0007', customer_id: 'c7777777-7777-7777-7777-777777777777', order_date: yesterday, delivery_date: today, priority: 'baja', order_type: 'web', status: 'ENTREGADO', subtotal: 4230.00, total: 4230.00, created_by: preventista2?.id, assembled_by: armado2?.id, delivered_by: repartidor2?.id, assembly_completed_at: new Date(Date.now() - 86400000).toISOString(), delivery_started_at: new Date(Date.now() - 36000000).toISOString(), delivered_at: new Date(Date.now() - 10800000).toISOString() },
  { id: '08888888-8888-8888-8888-888888888888', order_number: 'PED-0008', customer_id: 'c8888888-8888-8888-8888-888888888888', order_date: today, delivery_date: tomorrow, priority: 'normal', order_type: 'presencial', status: 'PENDIENTE_ENTREGA', subtotal: 22150.00, total: 22150.00, created_by: preventista1?.id, assembled_by: armado1?.id, assembly_completed_at: new Date().toISOString() },
  { id: '09999999-9999-9999-9999-999999999999', order_number: 'PED-0009', customer_id: 'c1111111-1111-1111-1111-111111111111', order_date: yesterday, delivery_date: today, priority: 'media', order_type: 'telefono', status: 'ENTREGADO', subtotal: 9840.00, total: 9840.00, created_by: preventista2?.id, assembled_by: armado1?.id, delivered_by: repartidor1?.id, assembly_completed_at: new Date(Date.now() - 86400000).toISOString(), delivery_started_at: new Date(Date.now() - 28800000).toISOString(), delivered_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '0aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', order_number: 'PED-0010', customer_id: 'c3333333-3333-3333-3333-333333333333', order_date: today, delivery_date: tomorrow, priority: 'alta', order_type: 'web', status: 'BORRADOR', subtotal: 11560.00, total: 11560.00, created_by: preventista1?.id }
]

const { error: ordersError } = await supabase.from('orders').upsert(ordersData)
if (ordersError) console.error('Error insertando pedidos:', ordersError)
else console.log(`   ✅ ${ordersData.length} pedidos insertados\n`)

// 3. ITEMS DE PEDIDOS
console.log('📝 Insertando items de pedidos...')
const orderItemsData = [
  // PED-0001
  { order_id: '01111111-1111-1111-1111-111111111111', product_id: 'a1111111-1111-1111-1111-111111111111', quantity_requested: 6, unit_price: 1250.00, discount: 0, subtotal: 7500.00 },
  { order_id: '01111111-1111-1111-1111-111111111111', product_id: 'a7777777-7777-7777-7777-777777777777', quantity_requested: 4, unit_price: 1890.00, discount: 0, subtotal: 7560.00 },
  { order_id: '01111111-1111-1111-1111-111111111111', product_id: 'a3333333-3333-3333-3333-333333333333', quantity_requested: 1, unit_price: 780.00, discount: 160, subtotal: 620.00 },
  // PED-0002
  { order_id: '02222222-2222-2222-2222-222222222222', product_id: 'a2222222-2222-2222-2222-222222222222', quantity_requested: 10, quantity_assembled: 10, unit_price: 890.00, discount: 0, subtotal: 8900.00 },
  { order_id: '02222222-2222-2222-2222-222222222222', product_id: 'a6666666-6666-6666-6666-666666666666', quantity_requested: 1, quantity_assembled: 1, unit_price: 280.00, discount: 260, subtotal: 20.00 },
  // PED-0003
  { order_id: '03333333-3333-3333-3333-333333333333', product_id: 'a4444444-4444-4444-4444-444444444444', quantity_requested: 8, quantity_assembled: 8, quantity_delivered: 8, unit_price: 650.00, discount: 0, subtotal: 5200.00 },
  { order_id: '03333333-3333-3333-3333-333333333333', product_id: 'a5555555-5555-5555-5555-555555555555', quantity_requested: 1, quantity_assembled: 1, quantity_delivered: 1, unit_price: 520.00, discount: 80, subtotal: 440.00 },
  // PED-0004
  { order_id: '04444444-4444-4444-4444-444444444444', product_id: 'a8888888-8888-8888-8888-888888888888', quantity_requested: 5, quantity_assembled: 5, quantity_delivered: 5, unit_price: 2150.00, discount: 0, subtotal: 10750.00 },
  { order_id: '04444444-4444-4444-4444-444444444444', product_id: 'a3333333-3333-3333-3333-333333333333', quantity_requested: 2, quantity_assembled: 2, quantity_delivered: 2, unit_price: 780.00, discount: 0, subtotal: 1560.00 },
  { order_id: '04444444-4444-4444-4444-444444444444', product_id: 'a6666666-6666-6666-6666-666666666666', quantity_requested: 1, quantity_assembled: 1, quantity_delivered: 1, unit_price: 280.00, discount: 240, subtotal: 40.00 },
  // PED-0005
  { order_id: '05555555-5555-5555-5555-555555555555', product_id: 'a7777777-7777-7777-7777-777777777777', quantity_requested: 3, quantity_assembled: 3, unit_price: 1890.00, discount: 0, subtotal: 5670.00 },
  { order_id: '05555555-5555-5555-5555-555555555555', product_id: 'a9999999-9999-9999-9999-999999999999', quantity_requested: 2, quantity_assembled: 1, unit_price: 680.00, discount: 0, subtotal: 1360.00, is_shortage: true, shortage_reason: 'sin_stock' },
  { order_id: '05555555-5555-5555-5555-555555555555', product_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', quantity_requested: 1, unit_price: 850.00, discount: 1100, subtotal: -250.00 },
  // PED-0006
  { order_id: '06666666-6666-6666-6666-666666666666', product_id: 'a1111111-1111-1111-1111-111111111111', quantity_requested: 10, unit_price: 1250.00, discount: 0, subtotal: 12500.00 },
  { order_id: '06666666-6666-6666-6666-666666666666', product_id: 'a8888888-8888-8888-8888-888888888888', quantity_requested: 3, unit_price: 2150.00, discount: 0, subtotal: 6450.00 },
  // PED-0007
  { order_id: '07777777-7777-7777-7777-777777777777', product_id: 'a4444444-4444-4444-4444-444444444444', quantity_requested: 6, quantity_assembled: 6, quantity_delivered: 6, unit_price: 650.00, discount: 0, subtotal: 3900.00 },
  { order_id: '07777777-7777-7777-7777-777777777777', product_id: 'a6666666-6666-6666-6666-666666666666', quantity_requested: 1, quantity_assembled: 1, quantity_delivered: 1, unit_price: 280.00, discount: 0, subtotal: 280.00 },
  { order_id: '07777777-7777-7777-7777-777777777777', product_id: 'a9999999-9999-9999-9999-999999999999', quantity_requested: 1, quantity_assembled: 0, quantity_delivered: 0, unit_price: 680.00, discount: 630, subtotal: 50.00 },
  // PED-0008
  { order_id: '08888888-8888-8888-8888-888888888888', product_id: 'a2222222-2222-2222-2222-222222222222', quantity_requested: 20, quantity_assembled: 20, unit_price: 890.00, discount: 0, subtotal: 17800.00 },
  { order_id: '08888888-8888-8888-8888-888888888888', product_id: 'a5555555-5555-5555-5555-555555555555', quantity_requested: 8, quantity_assembled: 8, unit_price: 520.00, discount: 0, subtotal: 4160.00 },
  { order_id: '08888888-8888-8888-8888-888888888888', product_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', quantity_requested: 1, quantity_assembled: 1, unit_price: 850.00, discount: 660, subtotal: 190.00 },
  // PED-0009
  { order_id: '09999999-9999-9999-9999-999999999999', product_id: 'a3333333-3333-3333-3333-333333333333', quantity_requested: 10, quantity_assembled: 10, quantity_delivered: 10, unit_price: 780.00, discount: 0, subtotal: 7800.00 },
  { order_id: '09999999-9999-9999-9999-999999999999', product_id: 'a7777777-7777-7777-7777-777777777777', quantity_requested: 1, quantity_assembled: 1, quantity_delivered: 1, unit_price: 1890.00, discount: 0, subtotal: 1890.00 },
  { order_id: '09999999-9999-9999-9999-999999999999', product_id: 'a9999999-9999-9999-9999-999999999999', quantity_requested: 1, quantity_assembled: 1, quantity_delivered: 1, unit_price: 680.00, discount: 530, subtotal: 150.00 },
  // PED-0010 (BORRADOR)
  { order_id: '0aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', product_id: 'a1111111-1111-1111-1111-111111111111', quantity_requested: 5, unit_price: 1250.00, discount: 0, subtotal: 6250.00 },
  { order_id: '0aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', product_id: 'a4444444-4444-4444-4444-444444444444', quantity_requested: 8, unit_price: 650.00, discount: 0, subtotal: 5200.00 },
  { order_id: '0aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', product_id: 'a6666666-6666-6666-6666-666666666666', quantity_requested: 1, unit_price: 280.00, discount: 170, subtotal: 110.00 }
]

const { error: itemsError } = await supabase.from('order_items').upsert(orderItemsData)
if (itemsError) console.error('Error insertando items:', itemsError)
else console.log(`   ✅ ${orderItemsData.length} items insertados\n`)

// 4. HISTORIAL DE PEDIDOS
console.log('📜 Insertando historial de pedidos...')
const historyData = [
  { order_id: '04444444-4444-4444-4444-444444444444', previous_status: null, new_status: 'PENDIENTE_ARMADO', changed_by: preventista1?.id, created_at: new Date(Date.now() - 86400000).toISOString() },
  { order_id: '04444444-4444-4444-4444-444444444444', previous_status: 'PENDIENTE_ARMADO', new_status: 'EN_ARMADO', changed_by: armado2?.id, created_at: new Date(Date.now() - 72000000).toISOString() },
  { order_id: '04444444-4444-4444-4444-444444444444', previous_status: 'EN_ARMADO', new_status: 'PENDIENTE_ENTREGA', changed_by: armado2?.id, created_at: new Date(Date.now() - 54000000).toISOString() },
  { order_id: '04444444-4444-4444-4444-444444444444', previous_status: 'PENDIENTE_ENTREGA', new_status: 'EN_REPARTICION', changed_by: repartidor1?.id, created_at: new Date(Date.now() - 43200000).toISOString() },
  { order_id: '04444444-4444-4444-4444-444444444444', previous_status: 'EN_REPARTICION', new_status: 'ENTREGADO', changed_by: repartidor1?.id, created_at: new Date(Date.now() - 7200000).toISOString() },
  
  { order_id: '07777777-7777-7777-7777-777777777777', previous_status: null, new_status: 'PENDIENTE_ARMADO', changed_by: preventista2?.id, created_at: new Date(Date.now() - 86400000).toISOString() },
  { order_id: '07777777-7777-7777-7777-777777777777', previous_status: 'PENDIENTE_ARMADO', new_status: 'EN_ARMADO', changed_by: armado2?.id, created_at: new Date(Date.now() - 64800000).toISOString() },
  { order_id: '07777777-7777-7777-7777-777777777777', previous_status: 'EN_ARMADO', new_status: 'PENDIENTE_ENTREGA', changed_by: armado2?.id, created_at: new Date(Date.now() - 50400000).toISOString() },
  { order_id: '07777777-7777-7777-7777-777777777777', previous_status: 'PENDIENTE_ENTREGA', new_status: 'EN_REPARTICION', changed_by: repartidor2?.id, created_at: new Date(Date.now() - 36000000).toISOString() },
  { order_id: '07777777-7777-7777-7777-777777777777', previous_status: 'EN_REPARTICION', new_status: 'ENTREGADO', changed_by: repartidor2?.id, created_at: new Date(Date.now() - 10800000).toISOString() },
  
  { order_id: '09999999-9999-9999-9999-999999999999', previous_status: null, new_status: 'PENDIENTE_ARMADO', changed_by: preventista2?.id, created_at: new Date(Date.now() - 86400000).toISOString() },
  { order_id: '09999999-9999-9999-9999-999999999999', previous_status: 'PENDIENTE_ARMADO', new_status: 'PENDIENTE_ENTREGA', changed_by: armado1?.id, created_at: new Date(Date.now() - 43200000).toISOString() },
  { order_id: '09999999-9999-9999-9999-999999999999', previous_status: 'PENDIENTE_ENTREGA', new_status: 'EN_REPARTICION', changed_by: repartidor1?.id, created_at: new Date(Date.now() - 28800000).toISOString() },
  { order_id: '09999999-9999-9999-9999-999999999999', previous_status: 'EN_REPARTICION', new_status: 'ENTREGADO', changed_by: repartidor1?.id, created_at: new Date(Date.now() - 3600000).toISOString() }
]

const { error: historyError } = await supabase.from('order_history').insert(historyData)
if (historyError) console.error('Error insertando historial:', historyError)
else console.log(`   ✅ ${historyData.length} registros de historial insertados\n`)

// 5. CALIFICACIONES
console.log('⭐ Insertando calificaciones...')
const ratingsData = [
  { order_id: '04444444-4444-4444-4444-444444444444', customer_id: 'c6666666-6666-6666-6666-666666666666', rating: 5, comments: 'Excelente servicio, todo llegó en perfecto estado' },
  { order_id: '07777777-7777-7777-7777-777777777777', customer_id: 'c7777777-7777-7777-7777-777777777777', rating: 4, comments: 'Muy bien, solo un pequeño retraso' },
  { order_id: '09999999-9999-9999-9999-999999999999', customer_id: 'c1111111-1111-1111-1111-111111111111', rating: 5, comments: 'Perfecto como siempre' }
]

const { error: ratingsError } = await supabase.from('order_ratings').upsert(ratingsData)
if (ratingsError) console.error('Error insertando calificaciones:', ratingsError)
else console.log(`   ✅ ${ratingsData.length} calificaciones insertadas\n`)

// 6. RUTAS
console.log('🚚 Insertando rutas...')
const routesData = [
  { 
    id: 'r1111111-1111-1111-1111-111111111111',
    route_code: 'REC-0001-' + today.replace(/-/g, ''),
    driver_id: repartidor1?.id,
    zone_id: '11111111-1111-1111-1111-111111111111',
    scheduled_date: today,
    scheduled_start_time: '08:00:00',
    status: 'EN_CURSO',
    created_by: profiles.find(p => p.role === 'administrativo')?.id
  },
  {
    id: 'r2222222-2222-2222-2222-222222222222',
    route_code: 'REC-0002-' + today.replace(/-/g, ''),
    driver_id: repartidor2?.id,
    zone_id: '22222222-2222-2222-2222-222222222222',
    scheduled_date: today,
    scheduled_start_time: '09:00:00',
    status: 'PLANIFICADO',
    created_by: profiles.find(p => p.role === 'administrativo')?.id
  }
]

const { error: routesError } = await supabase.from('routes').upsert(routesData)
if (routesError) console.error('Error insertando rutas:', routesError)
else console.log(`   ✅ ${routesData.length} rutas insertadas\n`)

// 7. ROUTE ORDERS (asignar pedidos a rutas)
console.log('📍 Asignando pedidos a rutas...')
const routeOrdersData = [
  { route_id: 'r1111111-1111-1111-1111-111111111111', order_id: '03333333-3333-3333-3333-333333333333', delivery_order: 1, was_collected: false },
  { route_id: 'r2222222-2222-2222-2222-222222222222', order_id: '02222222-2222-2222-2222-222222222222', delivery_order: 1, was_collected: false },
  { route_id: 'r2222222-2222-2222-2222-222222222222', order_id: '08888888-8888-8888-8888-888888888888', delivery_order: 2, was_collected: false }
]

const { error: routeOrdersError } = await supabase.from('route_orders').upsert(routeOrdersData)
if (routeOrdersError) console.error('Error asignando pedidos a rutas:', routeOrdersError)
else console.log(`   ✅ ${routeOrdersData.length} asignaciones de pedidos a rutas\n`)

console.log('=' .repeat(80))
console.log('\n🎉 ¡Datos de prueba cargados exitosamente!\n')
console.log('📊 Resumen:')
console.log(`   👥 ${customersData.length} clientes`)
console.log(`   📦 ${ordersData.length} pedidos`)
console.log(`   📝 ${orderItemsData.length} items de pedidos`)
console.log(`   📜 ${historyData.length} registros de historial`)
console.log(`   ⭐ ${ratingsData.length} calificaciones`)
console.log(`   🚚 ${routesData.length} rutas`)
console.log(`   📍 ${routeOrdersData.length} asignaciones a rutas`)
console.log('\n🚀 La base de datos está lista para probar!')
console.log('=' .repeat(80))


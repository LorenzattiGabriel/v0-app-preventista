#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Necesitas la SERVICE_ROLE_KEY para crear usuarios
// La puedes encontrar en: Settings -> API -> service_role (secret)
// const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('')
  console.log('📋 Pasos:')
  console.log('1. Ve a: https://supabase.com/dashboard/project/ojghwcbliucsntrbqvaw/settings/api')
  console.log('2. Copia la "service_role" key (secret)')
  console.log('3. Ejecuta: node scripts/migrate-to-supabase-auth.mjs TU_SERVICE_ROLE_KEY')
  console.log('')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🚀 Migrando usuarios a Supabase Auth...\n')

const users = [
  // Administrativos
  { id: '10000000-0000-0000-0000-000000000001', email: 'admin@distribuidora.com', password: 'admin123', full_name: 'Carlos Administrador', role: 'administrativo', phone: '351-6660001' },
  { id: '10000000-0000-0000-0000-000000000002', email: 'admin2@distribuidora.com', password: 'admin123', full_name: 'María Supervisora', role: 'administrativo', phone: '351-6660002' },
  
  // Preventistas
  { id: '20000000-0000-0000-0000-000000000001', email: 'preventista1@distribuidora.com', password: 'prev123', full_name: 'Juan Preventista', role: 'preventista', phone: '351-6660003' },
  { id: '20000000-0000-0000-0000-000000000002', email: 'preventista2@distribuidora.com', password: 'prev123', full_name: 'Laura Vendedora', role: 'preventista', phone: '351-6660004' },
  { id: '20000000-0000-0000-0000-000000000003', email: 'preventista3@distribuidora.com', password: 'prev123', full_name: 'Roberto Ventas', role: 'preventista', phone: '351-6660005' },
  
  // Encargados de Armado
  { id: '30000000-0000-0000-0000-000000000001', email: 'armado1@distribuidora.com', password: 'armado123', full_name: 'Pedro Armador', role: 'encargado_armado', phone: '351-6660006' },
  { id: '30000000-0000-0000-0000-000000000002', email: 'armado2@distribuidora.com', password: 'armado123', full_name: 'Ana Depósito', role: 'encargado_armado', phone: '351-6660007' },
  { id: '30000000-0000-0000-0000-000000000003', email: 'armado3@distribuidora.com', password: 'armado123', full_name: 'Jorge Preparador', role: 'encargado_armado', phone: '351-6660008' },
  
  // Repartidores
  { id: '40000000-0000-0000-0000-000000000001', email: 'repartidor1@distribuidora.com', password: 'repar123', full_name: 'Carlos Méndez', role: 'repartidor', phone: '351-6661111' },
  { id: '40000000-0000-0000-0000-000000000002', email: 'repartidor2@distribuidora.com', password: 'repar123', full_name: 'Roberto Díaz', role: 'repartidor', phone: '351-6662222' },
  { id: '40000000-0000-0000-0000-000000000003', email: 'repartidor3@distribuidora.com', password: 'repar123', full_name: 'Martín Gómez', role: 'repartidor', phone: '351-6663333' },
  { id: '40000000-0000-0000-0000-000000000004', email: 'repartidor4@distribuidora.com', password: 'repar123', full_name: 'Diego Transportista', role: 'repartidor', phone: '351-6664444' },
  
  // Clientes
  { id: '50000000-0000-0000-0000-000000000001', email: 'cliente1@email.com', password: 'cliente123', full_name: 'José Pérez', role: 'cliente', phone: '351-5551234' },
  { id: '50000000-0000-0000-0000-000000000002', email: 'cliente2@email.com', password: 'cliente123', full_name: 'María González', role: 'cliente', phone: '351-5552345' },
  { id: '50000000-0000-0000-0000-000000000003', email: 'cliente3@email.com', password: 'cliente123', full_name: 'Carlos Rodríguez', role: 'cliente', phone: '351-5553456' },
  { id: '50000000-0000-0000-0000-000000000004', email: 'cliente4@email.com', password: 'cliente123', full_name: 'Ana Martínez', role: 'cliente', phone: '351-5554567' },
  { id: '50000000-0000-0000-0000-000000000005', email: 'cliente5@email.com', password: 'cliente123', full_name: 'Roberto Sánchez', role: 'cliente', phone: '351-5555678' }
]

let success = 0
let errors = 0

for (const user of users) {
  try {
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role
      }
    })

    if (authError) {
      // Si el usuario ya existe, intentar actualizar
      if (authError.message.includes('already registered')) {
        console.log(`⚠️  ${user.email.padEnd(40)} - Ya existe, saltando...`)
        continue
      }
      throw authError
    }

    // Crear/actualizar profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        is_active: true
      })

    if (profileError) throw profileError

    console.log(`✅ ${user.email.padEnd(40)} - ${user.role}`)
    success++

  } catch (error) {
    console.log(`❌ ${user.email.padEnd(40)} - Error: ${error.message}`)
    errors++
  }
}

console.log('\n' + '='.repeat(80))
console.log(`\n✅ Migración completada: ${success} exitosos, ${errors} errores`)
console.log('\n🚀 Ahora puedes usar el login normal de Supabase!')
console.log('   URL: http://localhost:3000/auth/login')
console.log('\n📋 Credenciales de prueba:')
console.log('   Admin: admin@distribuidora.com / admin123')
console.log('   Preventista: preventista1@distribuidora.com / prev123')
console.log('   Armado: armado1@distribuidora.com / armado123')
console.log('   Repartidor: repartidor1@distribuidora.com / repar123')
console.log('   Cliente: cliente1@email.com / cliente123')
console.log('\n' + '='.repeat(80))


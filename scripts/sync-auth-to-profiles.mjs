#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0MDMzMywiZXhwIjoyMDc2ODE2MzMzfQ.eN-D2YwGbT2QJzmB9HSOQbE54QbrbGVBFWzRzhO4LzQ'

// Cliente con SERVICE_ROLE_KEY para administrar auth.users
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔧 SINCRONIZACIÓN: auth.users → profiles (manteniendo IDs de profiles)\n')
console.log('=' .repeat(80))
console.log('\nEste script recreará los usuarios en auth.users usando los IDs de profiles')
console.log('para mantener todas las relaciones (pedidos, rutas, etc.) intactas.\n')
console.log('=' .repeat(80) + '\n')

// Mapeo de usuarios con sus contraseñas
const passwords = {
  'admin@distribuidora.com': 'admin123',
  'preventista1@distribuidora.com': 'prev123',
  'preventista2@distribuidora.com': 'prev123',
  'preventista3@distribuidora.com': 'prev123',
  'armado1@distribuidora.com': 'armado123',
  'armado2@distribuidora.com': 'armado123',
  'repartidor1@distribuidora.com': 'repar123',
  'repartidor2@distribuidora.com': 'repar123',
  'repartidor3@distribuidora.com': 'repar123',
  'repartidor4@distribuidora.com': 'repar123',
  'cliente1@email.com': 'cliente123',
  'cliente2@email.com': 'cliente123',
}

// 1. Obtener todos los perfiles
console.log('📊 1. Obteniendo perfiles de la base de datos...\n')
const { data: profiles, error: profilesError } = await supabaseAdmin
  .from('profiles')
  .select('id, email, full_name, role, phone')
  .order('email')

if (profilesError) {
  console.error('❌ Error:', profilesError.message)
  process.exit(1)
}

console.log(`   Encontrados: ${profiles.length} perfiles\n`)

// 2. Listar usuarios actuales en auth.users
console.log('📊 2. Listando usuarios actuales en auth.users...\n')
const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers()

if (authUsersError) {
  console.error('❌ Error:', authUsersError.message)
  process.exit(1)
}

console.log(`   Encontrados: ${authUsers.users.length} usuarios en auth.users\n`)

let success = 0
let errors = 0
let skipped = 0

console.log('=' .repeat(80))
console.log('\n🔄 3. Procesando usuarios...\n')

for (const profile of profiles) {
  const password = passwords[profile.email]
  
  if (!password) {
    console.log(`⏭️  ${profile.email.padEnd(40)} - Sin contraseña definida, saltando...`)
    skipped++
    continue
  }

  try {
    // Buscar si ya existe un usuario en auth.users con este email
    const existingAuthUser = authUsers.users.find(u => u.email === profile.email)
    
    // Si existe y tiene el ID correcto, saltar
    if (existingAuthUser && existingAuthUser.id === profile.id) {
      console.log(`✅ ${profile.email.padEnd(40)} - Ya sincronizado`)
      success++
      continue
    }

    // Si existe con ID diferente, eliminarlo
    if (existingAuthUser) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
      if (deleteError && !deleteError.message.includes('not found')) {
        console.log(`❌ ${profile.email.padEnd(40)} - Error eliminando usuario viejo: ${deleteError.message}`)
        errors++
        continue
      }
    }

    // Crear nuevo usuario con el ID del perfil
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      id: profile.id, // ⭐ Usar el ID de profiles
      email: profile.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        role: profile.role
      }
    })

    if (createError) {
      console.log(`❌ ${profile.email.padEnd(40)} - Error creando usuario: ${createError.message}`)
      errors++
      continue
    }

    console.log(`✅ ${profile.email.padEnd(40)} - Sincronizado con ID: ${profile.id.slice(0, 8)}...`)
    success++

  } catch (error) {
    console.log(`❌ ${profile.email.padEnd(40)} - Error: ${error.message}`)
    errors++
  }
}

console.log('\n' + '='.repeat(80))
console.log(`\n📊 RESULTADO:`)
console.log(`   ✅ Exitosos: ${success}`)
console.log(`   ❌ Errores: ${errors}`)
console.log(`   ⏭️  Saltados: ${skipped}`)
console.log('\n✅ Sincronización completada!')
console.log('\n🚀 Ahora puedes hacer login con:')
console.log('   👨‍💼 Admin: admin@distribuidora.com / admin123')
console.log('   🛒 Preventista: preventista1@distribuidora.com / prev123')
console.log('   📦 Armado: armado1@distribuidora.com / armado123')
console.log('   🚚 Repartidor: repartidor1@distribuidora.com / repar123')
console.log('   👤 Cliente: cliente1@email.com / cliente123')
console.log('\n' + '='.repeat(80) + '\n')


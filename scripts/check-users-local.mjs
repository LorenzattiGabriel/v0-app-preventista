#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Verificando usuarios en la base de datos...\n')

const { data: users, error } = await supabase
  .from('profiles')
  .select('email, role, full_name, is_active')
  .order('role', { ascending: true })

if (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

console.log('📊 Usuarios encontrados:\n')

const roles = {
  administrativo: '👨‍💼 Admin',
  preventista: '🛒 Preventista',
  encargado_armado: '📦 Armado',
  repartidor: '🚚 Repartidor',
  cliente: '👤 Cliente'
}

users.forEach(user => {
  const roleIcon = roles[user.role] || user.role
  const status = user.is_active ? '✅' : '❌'
  console.log(`${status} ${roleIcon.padEnd(18)} ${user.email.padEnd(40)} ${user.full_name}`)
})

console.log('\n' + '='.repeat(80))
console.log('\n🧪 Probando login con Supabase Auth (admin@distribuidora.com)...\n')

// Test login using Supabase Auth (proper way)
const testEmail = 'admin@distribuidora.com'
const testPassword = 'admin123'

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPassword
})

if (authError) {
  console.log('❌ Login FALLÓ')
  console.log('   Error:', authError.message)
} else {
  console.log('✅ Login EXITOSO con Supabase Auth')
  console.log(`   Usuario: ${authData.user.email}`)
  console.log(`   User ID: ${authData.user.id}`)
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', authData.user.id)
    .single()
  
  if (profile) {
    console.log(`   Nombre: ${profile.full_name}`)
    console.log(`   Rol: ${profile.role}`)
  }
  
  // Sign out
  await supabase.auth.signOut()
}

console.log('\n' + '='.repeat(80))
console.log('\n✅ La autenticación ahora usa Supabase Auth (contraseñas hasheadas con bcrypt)')
console.log('   Las contraseñas NO se guardan en texto plano en la tabla profiles.\n')

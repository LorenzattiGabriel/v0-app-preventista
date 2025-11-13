#!/usr/bin/env node
import createBrowserClient from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
export const supabase = () =>
  createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );

console.log('🔍 Verificando usuarios en la base de datos...\n')

const { data: users, error } = await supabase
  .from('profiles')
  .select('email, pwd, role, full_name')
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
  console.log(`${roleIcon.padEnd(20)} ${user.email.padEnd(40)} pwd: "${user.pwd}"`)
})

console.log('\n' + '='.repeat(80))
console.log('\n🧪 Probando login con admin@distribuidora.com / admin123...\n')

// Test login
const testEmail = 'admin@distribuidora.com'
const testPassword = 'admin123'

const { data: testUser, error: testError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', testEmail)
  .eq('pwd', testPassword)
  .eq('is_active', true)
  .single()

if (testError || !testUser) {
  console.log('❌ Login FALLÓ')
  console.log('   Error:', testError?.message || 'Usuario no encontrado')
  
  // Try without password check
  const { data: userCheck } = await supabase
    .from('profiles')
    .select('email, pwd')
    .eq('email', testEmail)
    .single()
  
  if (userCheck) {
    console.log(`\n   Usuario encontrado: ${userCheck.email}`)
    console.log(`   Password en BD: "${userCheck.pwd}"`)
    console.log(`   Password probado: "${testPassword}"`)
    console.log(`   ¿Coinciden? ${userCheck.pwd === testPassword ? '✅ SÍ' : '❌ NO'}`)
  }
} else {
  console.log('✅ Login EXITOSO')
  console.log(`   Usuario: ${testUser.full_name}`)
  console.log(`   Rol: ${testUser.role}`)
}

console.log('\n' + '='.repeat(80))


#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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


#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

console.log('🔍 VERIFICANDO SINCRONIZACIÓN AUTH.USERS <-> PROFILES\n')
console.log('=' .repeat(80))

// 1. Intentar login
console.log('\n1. Autenticando con admin@distribuidora.com...\n')
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@distribuidora.com',
  password: 'admin123',
})

if (authError) {
  console.error('❌ Error en autenticación:', authError.message)
  process.exit(1)
}

console.log('✅ Autenticación exitosa')
console.log(`   User ID en auth.users: ${authData.user.id}`)
console.log(`   Email: ${authData.user.email}`)

// 2. Buscar perfil con ese ID
console.log('\n2. Buscando perfil con ese ID...\n')
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', authData.user.id)
  .single()

if (profileError) {
  console.error('❌ Error al buscar perfil:', profileError.message)
  console.log('\n⚠️  PROBLEMA DETECTADO:')
  console.log('   El usuario existe en auth.users pero NO en profiles con el mismo ID')
} else {
  console.log('✅ Perfil encontrado:', profile)
  process.exit(0)
}

// 3. Buscar perfil por email
console.log('\n3. Buscando perfil por email...\n')
const { data: profileByEmail, error: profileByEmailError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'admin@distribuidora.com')
  .single()

if (profileByEmailError) {
  console.error('❌ Tampoco existe por email:', profileByEmailError.message)
} else {
  console.log('✅ Perfil encontrado por email:')
  console.log(`   ID en profiles: ${profileByEmail.id}`)
  console.log(`   Email: ${profileByEmail.email}`)
  console.log(`   Role: ${profileByEmail.role}`)
  
  console.log('\n' + '='.repeat(80))
  console.log('\n🔴 PROBLEMA CONFIRMADO:\n')
  console.log(`   ID en auth.users:  ${authData.user.id}`)
  console.log(`   ID en profiles:    ${profileByEmail.id}`)
  console.log('\n   Los IDs NO COINCIDEN ❌')
  console.log('\n💡 SOLUCIÓN: Necesitas sincronizar los IDs o actualizar la tabla profiles')
  console.log('   con los IDs correctos de auth.users\n')
  console.log('='.repeat(80))
}

// Sign out
await supabase.auth.signOut()


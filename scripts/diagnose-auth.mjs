#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Error: Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN\n')
console.log('=' .repeat(80))

// 1. Verificar tabla profiles
console.log('\n📊 1. USUARIOS EN TABLA PROFILES:\n')
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, email, role, full_name, is_active')
  .order('email')

if (profilesError) {
  console.error('❌ Error:', profilesError.message)
} else if (!profiles || profiles.length === 0) {
  console.log('⚠️  No hay usuarios en la tabla profiles')
} else {
  console.log(`Total: ${profiles.length} usuarios\n`)
  profiles.forEach(p => {
    const status = p.is_active ? '✅' : '❌'
    console.log(`${status} ${p.email.padEnd(40)} | ${p.role.padEnd(20)} | ${p.full_name}`)
  })
}

// 2. Intentar login con el usuario admin
console.log('\n' + '='.repeat(80))
console.log('\n🧪 2. PRUEBA DE LOGIN CON admin@distribuidora.com:\n')

const testEmail = 'admin@distribuidora.com'
const testPassword = 'admin123'

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
})

if (signInError) {
  console.log('❌ LOGIN FALLÓ')
  console.log(`   Error: ${signInError.message}`)
  console.log(`   Status: ${signInError.status}`)
  
  // Verificar si el usuario existe en profiles
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('email, role, is_active')
    .eq('email', testEmail)
    .single()
  
  if (profileCheck) {
    console.log('\n   ℹ️  Usuario SÍ existe en profiles:')
    console.log(`      Email: ${profileCheck.email}`)
    console.log(`      Role: ${profileCheck.role}`)
    console.log(`      Activo: ${profileCheck.is_active}`)
    console.log('\n   ⚠️  PROBLEMA: El usuario existe en profiles pero NO en auth.users')
    console.log('   💡 SOLUCIÓN: Necesitas ejecutar el script de migración a Supabase Auth')
  } else {
    console.log('\n   ⚠️  Usuario NO existe en profiles')
  }
} else {
  console.log('✅ LOGIN EXITOSO')
  console.log(`   Usuario: ${signInData.user.email}`)
  console.log(`   ID: ${signInData.user.id}`)
}

// 3. Intentar con admin@admin.com
console.log('\n' + '='.repeat(80))
console.log('\n🧪 3. PRUEBA DE LOGIN CON admin@admin.com:\n')

const { data: signInData2, error: signInError2 } = await supabase.auth.signInWithPassword({
  email: 'admin@admin.com',
  password: 'admin123',
})

if (signInError2) {
  console.log('❌ LOGIN FALLÓ')
  console.log(`   Error: ${signInError2.message}`)
  
  const { data: profileCheck2 } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', 'admin@admin.com')
    .single()
  
  if (profileCheck2) {
    console.log('   ⚠️  Usuario existe en profiles pero no en auth.users')
  } else {
    console.log('   ℹ️  Este email NO existe en la base de datos')
    console.log('   💡 El email correcto es: admin@distribuidora.com')
  }
} else {
  console.log('✅ LOGIN EXITOSO')
}

console.log('\n' + '='.repeat(80))
console.log('\n📋 RESUMEN:\n')
console.log('La app usa Supabase Auth, por lo que los usuarios deben estar en:')
console.log('  1. auth.users (tabla de autenticación de Supabase)')
console.log('  2. profiles (tabla de tu aplicación)')
console.log('\nSi los usuarios solo están en profiles, necesitas migrarlos a auth.users')
console.log('\n' + '='.repeat(80) + '\n')


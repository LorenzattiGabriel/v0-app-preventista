#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'readline'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

console.log('🔧 SINCRONIZACIÓN DE PERFILES\n')
console.log('=' .repeat(80))
console.log('\nEste script actualizará los IDs en la tabla profiles para que coincidan')
console.log('con los IDs de auth.users (basándose en el email)\n')
console.log('⚠️  IMPORTANTE: Esto modificará la base de datos\n')

// Lista de usuarios para sincronizar
const users = [
  { email: 'admin@distribuidora.com', password: 'admin123' },
  { email: 'preventista1@distribuidora.com', password: 'prev123' },
  { email: 'preventista2@distribuidora.com', password: 'prev123' },
  { email: 'preventista3@distribuidora.com', password: 'prev123' },
  { email: 'armado1@distribuidora.com', password: 'armado123' },
  { email: 'armado2@distribuidora.com', password: 'armado123' },
  { email: 'repartidor1@distribuidora.com', password: 'repar123' },
  { email: 'repartidor2@distribuidora.com', password: 'repar123' },
  { email: 'repartidor3@distribuidora.com', password: 'repar123' },
  { email: 'repartidor4@distribuidora.com', password: 'repar123' },
  { email: 'cliente1@email.com', password: 'cliente123' },
  { email: 'cliente2@email.com', password: 'cliente123' },
]

console.log('📋 Usuarios a sincronizar:', users.length)
console.log('\n' + '='.repeat(80) + '\n')

let success = 0
let errors = 0

for (const user of users) {
  try {
    // 1. Autenticar para obtener el ID de auth.users
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    })

    if (authError) {
      console.log(`❌ ${user.email.padEnd(40)} - Error auth: ${authError.message}`)
      errors++
      continue
    }

    const authUserId = authData.user.id

    // 2. Buscar perfil actual por email
    const { data: oldProfile, error: oldProfileError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('email', user.email)
      .maybeSingle()

    if (oldProfileError) {
      console.log(`❌ ${user.email.padEnd(40)} - Error buscando perfil: ${oldProfileError.message}`)
      errors++
      await supabase.auth.signOut()
      continue
    }

    if (!oldProfile) {
      console.log(`⚠️  ${user.email.padEnd(40)} - No existe en profiles, saltando...`)
      await supabase.auth.signOut()
      continue
    }

    const oldId = oldProfile.id

    // 3. Si los IDs ya coinciden, saltar
    if (oldId === authUserId) {
      console.log(`✅ ${user.email.padEnd(40)} - Ya sincronizado`)
      success++
      await supabase.auth.signOut()
      continue
    }

    // 4. Actualizar el ID en profiles
    // Primero, guardamos los datos del perfil
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    // Eliminamos el perfil antiguo
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', oldId)

    if (deleteError) {
      console.log(`❌ ${user.email.padEnd(40)} - Error eliminando perfil viejo: ${deleteError.message}`)
      errors++
      await supabase.auth.signOut()
      continue
    }

    // Insertamos el perfil con el nuevo ID
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        ...fullProfile,
        id: authUserId,
      })

    if (insertError) {
      console.log(`❌ ${user.email.padEnd(40)} - Error insertando perfil nuevo: ${insertError.message}`)
      errors++
      await supabase.auth.signOut()
      continue
    }

    console.log(`✅ ${user.email.padEnd(40)} - Sincronizado (${oldId.slice(0, 8)}... → ${authUserId.slice(0, 8)}...)`)
    success++

    // Sign out
    await supabase.auth.signOut()

  } catch (error) {
    console.log(`❌ ${user.email.padEnd(40)} - Error: ${error.message}`)
    errors++
  }
}

console.log('\n' + '='.repeat(80))
console.log(`\n📊 RESULTADO: ${success} exitosos, ${errors} errores`)
console.log('\n✅ Sincronización completada. Ahora los usuarios podrán hacer login correctamente.\n')
console.log('🚀 Prueba con: admin@distribuidora.com / admin123\n')
console.log('='.repeat(80) + '\n')


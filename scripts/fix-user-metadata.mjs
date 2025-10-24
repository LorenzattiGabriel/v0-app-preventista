#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  console.log('Ejecuta: node scripts/fix-user-metadata.mjs TU_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔧 Actualizando metadata de usuarios...\n')

const usersToFix = [
  { email: 'admin@distribuidora.com', full_name: 'Carlos Administrador', role: 'administrativo' },
  { email: 'admin2@distribuidora.com', full_name: 'María Supervisora', role: 'administrativo' },
  { email: 'preventista1@distribuidora.com', full_name: 'Juan Preventista', role: 'preventista' },
  { email: 'preventista2@distribuidora.com', full_name: 'Laura Vendedora', role: 'preventista' },
  { email: 'preventista3@distribuidora.com', full_name: 'Roberto Ventas', role: 'preventista' }
]

let fixed = 0
let errors = 0

for (const userInfo of usersToFix) {
  try {
    // Obtener el usuario por email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) throw listError
    
    const user = users.find(u => u.email === userInfo.email)
    
    if (!user) {
      console.log(`⚠️  ${userInfo.email.padEnd(40)} - No encontrado en Auth`)
      continue
    }

    // Actualizar metadata del usuario
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          full_name: userInfo.full_name,
          role: userInfo.role
        }
      }
    )

    if (updateError) throw updateError

    // Actualizar profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: userInfo.full_name,
        role: userInfo.role,
        is_active: true
      }, {
        onConflict: 'id'
      })

    if (profileError) throw profileError

    console.log(`✅ ${userInfo.email.padEnd(40)} - ${userInfo.role}`)
    fixed++

  } catch (error) {
    console.log(`❌ ${userInfo.email.padEnd(40)} - Error: ${error.message}`)
    errors++
  }
}

console.log('\n' + '='.repeat(80))
console.log(`\n✅ Actualización completada: ${fixed} exitosos, ${errors} errores`)
console.log('\n🚀 Ahora todos los usuarios deberían funcionar!')
console.log('\n' + '='.repeat(80))


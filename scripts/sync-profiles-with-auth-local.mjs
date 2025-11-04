#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Necesitas la SERVICE_ROLE_KEY para crear usuarios
// La puedes encontrar en: Settings -> API -> service_role (secret)

if (!SERVICE_ROLE_KEY) {
  console.log('❌ Error: Necesitas proporcionar la SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔄 Sincronizando profiles con Supabase Auth...\n')

// Obtener todos los usuarios de Supabase Auth
const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

if (usersError) {
  console.error('❌ Error obteniendo usuarios:', usersError.message)
  process.exit(1)
}

console.log(`📊 Usuarios encontrados en Supabase Auth: ${users.length}\n`)

let synced = 0
let errors = 0

for (const user of users) {
  try {
    // Obtener metadata del usuario
    const { full_name, role } = user.user_metadata || {}
    
    if (!role) {
      console.log(`⚠️  ${user.email.padEnd(40)} - Sin metadata de rol, saltando...`)
      continue
    }

    // Actualizar o crear profile con el ID correcto de Auth
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id, // Usar el ID de Supabase Auth
        email: user.email,
        full_name: full_name || user.email.split('@')[0],
        role: role,
        phone: null,
        is_active: true
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      throw profileError
    }

    console.log(`✅ ${user.email.padEnd(40)} - ${role} (${user.id})`)
    synced++

  } catch (error) {
    console.log(`❌ ${user.email.padEnd(40)} - Error: ${error.message}`)
    errors++
  }
}

console.log('\n' + '='.repeat(80))
console.log(`\n✅ Sincronización completada: ${synced} exitosos, ${errors} errores`)
console.log('\n🚀 Ahora el login debería funcionar correctamente!')
console.log('\n' + '='.repeat(80))


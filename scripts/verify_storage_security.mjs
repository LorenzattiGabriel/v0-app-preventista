import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

// 1. Initialize Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runTests() {
  console.log('🔒 Verificando Políticas de Seguridad de Storage...\n')

  // 1. Login
  const email = 'repartidor1@distribuidora.com'
  const password = 'repar123'
  
  console.log(`1️⃣  Iniciando sesión como ${email}...`)
  const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (loginError || !session) {
    console.error('❌ Error login:', loginError?.message)
    process.exit(1)
  }
  console.log('✅ Login exitoso\n')

  const fileName = `security_test_${Date.now()}.txt`
  const fileContent = 'Contenido de prueba'

  // 2. Test UPLOAD (Should SUCCEED)
  console.log('2️⃣  Intentando SUBIR archivo (Debería FUNCIONAR)...')
  const { error: uploadError } = await supabase.storage
    .from('delivery')
    .upload(fileName, fileContent)

  if (uploadError) {
    console.error('❌ Error SUBIDA:', uploadError.message)
    console.error('⚠️  El bucket podría no estar configurado correctamente.')
  } else {
    console.log('✅ Archivo subido correctamente (Esperado)')
  }
  console.log('')

  // 3. Test UPDATE/OVERWRITE (Should FAIL)
  console.log('3️⃣  Intentando SOBREESCRIBIR archivo (Debería FALLAR)...')
  const { error: updateError } = await supabase.storage
    .from('delivery')
    .upload(fileName, 'Nuevo contenido malicioso', { upsert: true })

  if (updateError) {
    console.log(`✅ Bloqueado correctamente: ${updateError.message} (Esperado)`)
    // Normally error message for RLS policy violation is "new row violates row-level security policy" or generic "Access denied"
  } else {
    console.error('❌ FALLO DE SEGURIDAD: El usuario pudo sobreescribir el archivo.')
  }
  console.log('')

  // 4. Test DELETE (Should FAIL)
  console.log('4️⃣  Intentando ELIMINAR archivo (Debería FALLAR)...')
  const { error: deleteError } = await supabase.storage
    .from('delivery')
    .remove([fileName])

  // Supabase storage .remove returns data even if empty, error might be null but data empty if policy blocks?
  // Actually, standard RLS blocking DELETE usually returns an empty array of removed items or an error.
  
  if (deleteError) {
    console.log(`✅ Bloqueado correctamente: ${deleteError.message} (Esperado)`)
  } else {
    // Check if it was actually deleted by trying to download it
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('delivery')
      .download(fileName)

    if (downloadError) {
       // If we can't download it anymore, it was deleted!
       console.error('❌ FALLO DE SEGURIDAD: El usuario pudo eliminar el archivo.')
    } else {
       console.log('✅ Bloqueado correctamente (El archivo sigue existiendo)')
    }
  }
  console.log('')
  
  // 5. Test Anonymous Upload (Should FAIL)
  console.log('5️⃣  Intentando SUBIDA ANÓNIMA (Debería FALLAR)...')
  await supabase.auth.signOut()
  
  const anonFileName = `anon_test_${Date.now()}.txt`
  const { error: anonUploadError } = await supabase.storage
    .from('delivery')
    .upload(anonFileName, 'Soy un hacker')

  if (anonUploadError) {
    console.log(`✅ Bloqueado correctamente: ${anonUploadError.message} (Esperado)`)
  } else {
     console.error('❌ FALLO DE SEGURIDAD: Usuario anónimo pudo subir archivo.')
  }
}

runTests().catch(console.error)

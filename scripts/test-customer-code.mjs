#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🧪 Probando función generate_customer_code()...\n')

try {
  const { data, error } = await supabase.rpc('generate_customer_code')
  
  if (error) {
    console.error('❌ Error al llamar a la función:', error)
    console.error('Detalles:', JSON.stringify(error, null, 2))
  } else {
    console.log('✅ Código generado exitosamente:', data)
  }

  // También verificar cuántos clientes hay
  const { count, error: countError } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('❌ Error al contar clientes:', countError)
  } else {
    console.log(`📊 Clientes existentes en la BD: ${count}`)
  }

} catch (err) {
  console.error('❌ Error:', err)
  process.exit(1)
}


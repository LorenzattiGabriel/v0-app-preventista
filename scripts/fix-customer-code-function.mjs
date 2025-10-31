#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://ojghwcbliucsntrbqvaw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔧 Arreglando función generate_customer_code()...\n')

const sqlContent = `
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Obtener el siguiente número solo de códigos que sigan el formato CLI-XXXX
  -- donde XXXX es un número
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^CLI-[0-9]+$' 
      THEN CAST(SUBSTRING(code FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.customers;
  
  RETURN 'CLI-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
`

try {
  // Ejecutar el SQL usando rpc
  const { error } = await supabase.rpc('exec_sql', { sql: sqlContent }).single()
  
  if (error) {
    console.error('❌ Error al ejecutar SQL:', error)
    console.log('\n⚠️  Intenta ejecutar este SQL manualmente en Supabase SQL Editor:\n')
    console.log(sqlContent)
  } else {
    console.log('✅ Función actualizada exitosamente')
    
    // Probar la función
    const { data, error: testError } = await supabase.rpc('generate_customer_code')
    
    if (testError) {
      console.error('❌ Error al probar la función:', testError)
    } else {
      console.log('✅ Función probada exitosamente. Código generado:', data)
    }
  }
} catch (err) {
  console.error('❌ Error:', err.message)
  console.log('\n📝 Ejecuta este SQL manualmente en Supabase SQL Editor:\n')
  console.log(sqlContent)
}


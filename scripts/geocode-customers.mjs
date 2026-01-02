#!/usr/bin/env node
/**
 * Script para geocodificar clientes sin coordenadas
 * 
 * Uso:
 *   node scripts/geocode-customers.mjs              # Geocodifica todos sin coordenadas
 *   node scripts/geocode-customers.mjs --dry-run    # Solo muestra qué haría (sin actualizar)
 *   node scripts/geocode-customers.mjs --limit=10   # Limita a N clientes (para probar)
 *   node scripts/geocode-customers.mjs --export     # Exporta a CSV los que no se pudieron geocodificar
 * 
 * Requiere:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY  
 *   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (opcional, usa Nominatim como fallback)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// Delay entre requests para respetar rate limits (ms)
const DELAY_BETWEEN_REQUESTS = 500 // 0.5 segundos
const DELAY_AFTER_NOMINATIM = 1100  // 1.1 segundos (Nominatim requiere 1 req/seg)

// Parsear argumentos
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const shouldExport = args.includes('--export')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null

// Validar configuración
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.error('   Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Función para geocodificar con Google Maps
async function geocodeWithGoogleMaps(address) {
  if (!GOOGLE_MAPS_API_KEY) {
    return null
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0]
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        source: 'google'
      }
    }

    if (data.status === 'ZERO_RESULTS') {
      return null
    }

    if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'REQUEST_DENIED') {
      console.warn(`   ⚠️ Google Maps: ${data.status}`)
    }

    return null
  } catch (error) {
    console.error('   Error Google Maps:', error.message)
    return null
  }
}

// Función para geocodificar con Nominatim (OpenStreetMap)
async function geocodeWithNominatim(address) {
  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=ar`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DistribuidoraApp/1.0 (geocoding customers)',
      },
    })

    const data = await response.json()

    if (data?.length > 0) {
      const result = data[0]
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
        source: 'nominatim'
      }
    }

    return null
  } catch (error) {
    console.error('   Error Nominatim:', error.message)
    return null
  }
}

// Función principal de geocodificación
async function geocodeAddress(customer) {
  // Construir dirección completa
  const parts = []
  
  if (customer.street && customer.street !== '-') {
    parts.push(customer.street)
  }
  if (customer.street_number && customer.street_number !== '0') {
    parts.push(customer.street_number)
  }
  if (customer.locality) {
    parts.push(customer.locality)
  }
  if (customer.province) {
    parts.push(customer.province)
  }
  parts.push('Argentina')

  const fullAddress = parts.join(', ')

  // Intentar con Google Maps primero
  let result = await geocodeWithGoogleMaps(fullAddress)
  
  if (result) {
    return { ...result, searchedAddress: fullAddress }
  }

  // Esperar antes de usar Nominatim
  await sleep(DELAY_AFTER_NOMINATIM - DELAY_BETWEEN_REQUESTS)

  // Fallback a Nominatim
  result = await geocodeWithNominatim(fullAddress)
  
  if (result) {
    return { ...result, searchedAddress: fullAddress }
  }

  // Si falla, intentar solo con localidad + provincia
  if (customer.locality) {
    const simpleAddress = `${customer.locality}, ${customer.province || 'Córdoba'}, Argentina`
    result = await geocodeWithNominatim(simpleAddress)
    
    if (result) {
      return { ...result, searchedAddress: simpleAddress, approximate: true }
    }
  }

  return null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Función principal
async function main() {
  console.log('🔍 Script de Geocodificación de Clientes')
  console.log('='.repeat(60))
  console.log('')
  
  if (isDryRun) {
    console.log('🔸 Modo DRY-RUN: No se realizarán actualizaciones')
  }
  
  if (GOOGLE_MAPS_API_KEY) {
    console.log('✅ Google Maps API Key configurada')
  } else {
    console.log('⚠️ Google Maps API Key no configurada, usando solo Nominatim')
  }
  
  console.log('')

  // Obtener clientes sin coordenadas
  let query = supabase
    .from('customers')
    .select('id, code, commercial_name, street, street_number, locality, province, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .order('code')

  if (limit) {
    query = query.limit(limit)
    console.log(`🔸 Limitado a ${limit} clientes`)
  }

  const { data: customers, error } = await query

  if (error) {
    console.error('❌ Error obteniendo clientes:', error.message)
    process.exit(1)
  }

  console.log(`📊 Clientes sin coordenadas: ${customers.length}`)
  console.log('')

  if (customers.length === 0) {
    console.log('✅ Todos los clientes ya tienen coordenadas!')
    return
  }

  // Estadísticas
  const stats = {
    total: customers.length,
    success: 0,
    failed: 0,
    approximate: 0,
    googleMaps: 0,
    nominatim: 0,
  }

  const failedCustomers = []
  const successLog = []

  console.log('🚀 Iniciando geocodificación...')
  console.log('-'.repeat(60))

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i]
    const progress = `[${i + 1}/${customers.length}]`
    
    process.stdout.write(`${progress} ${customer.code} - ${customer.commercial_name.substring(0, 30)}... `)

    const result = await geocodeAddress(customer)

    if (result) {
      stats.success++
      if (result.source === 'google') stats.googleMaps++
      if (result.source === 'nominatim') stats.nominatim++
      if (result.approximate) stats.approximate++

      console.log(`✅ ${result.source}${result.approximate ? ' (aprox)' : ''}`)
      console.log(`       📍 ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`)

      successLog.push({
        code: customer.code,
        name: customer.commercial_name,
        latitude: result.latitude,
        longitude: result.longitude,
        source: result.source,
        approximate: result.approximate || false,
        searchedAddress: result.searchedAddress,
        formattedAddress: result.formattedAddress,
      })

      // Actualizar en base de datos
      if (!isDryRun) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            latitude: result.latitude,
            longitude: result.longitude,
          })
          .eq('id', customer.id)

        if (updateError) {
          console.log(`       ⚠️ Error actualizando: ${updateError.message}`)
        }
      }
    } else {
      stats.failed++
      console.log('❌ No encontrado')
      
      failedCustomers.push({
        code: customer.code,
        name: customer.commercial_name,
        street: customer.street || '',
        street_number: customer.street_number || '',
        locality: customer.locality || '',
        province: customer.province || '',
      })
    }

    // Delay entre requests
    if (i < customers.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS)
    }
  }

  // Resumen
  console.log('')
  console.log('='.repeat(60))
  console.log('📊 RESUMEN')
  console.log('-'.repeat(40))
  console.log(`Total procesados: ${stats.total}`)
  console.log(`✅ Exitosos: ${stats.success} (${((stats.success/stats.total)*100).toFixed(1)}%)`)
  console.log(`   - Google Maps: ${stats.googleMaps}`)
  console.log(`   - Nominatim: ${stats.nominatim}`)
  console.log(`   - Aproximados (solo localidad): ${stats.approximate}`)
  console.log(`❌ Fallidos: ${stats.failed} (${((stats.failed/stats.total)*100).toFixed(1)}%)`)
  console.log('')

  // Exportar CSV de fallidos
  if (shouldExport && failedCustomers.length > 0) {
    const csvHeader = 'code,name,street,street_number,locality,province,latitude,longitude\n'
    const csvRows = failedCustomers.map(c => 
      `"${c.code}","${c.name}","${c.street}","${c.street_number}","${c.locality}","${c.province}","",""`
    ).join('\n')
    
    const csvPath = 'scripts/customers-to-geocode-manually.csv'
    fs.writeFileSync(csvPath, csvHeader + csvRows)
    console.log(`📁 Exportado CSV de fallidos: ${csvPath}`)
  }

  // Guardar log
  const logPath = 'scripts/geocode-log.json'
  fs.writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    isDryRun,
    stats,
    success: successLog,
    failed: failedCustomers,
  }, null, 2))
  console.log(`📁 Log guardado: ${logPath}`)

  if (isDryRun) {
    console.log('')
    console.log('🔸 Esto fue un DRY-RUN. Ejecuta sin --dry-run para actualizar la base de datos.')
  }

  console.log('')
  console.log('✅ Proceso completado')
}

main().catch(console.error)


#!/usr/bin/env node
/**
 * Script para probar rutas segmentadas (>25 waypoints)
 * Genera 35 puntos aleatorios en Córdoba para testear la segmentación
 */

const API_URL = 'http://localhost:3000/api/proxy-rutas'

// Generar puntos aleatorios alrededor de Córdoba
function generateRandomPoints(count) {
  const centerLat = -31.4201
  const centerLng = -64.1888
  const spread = 0.1 // ~10km de radio
  
  const locations = []
  
  // Punto de partida (depot)
  locations.push({
    id: 'depot-start',
    lat: centerLat,
    lng: centerLng,
    type: 'partida',
    address: 'Depósito Central, Córdoba'
  })
  
  // Generar puntos intermedios
  for (let i = 1; i <= count; i++) {
    const lat = centerLat + (Math.random() - 0.5) * spread * 2
    const lng = centerLng + (Math.random() - 0.5) * spread * 2
    
    locations.push({
      id: `order-${i}`,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      type: 'intermedio',
      address: `Cliente ${i} - Córdoba`
    })
  }
  
  // Punto de llegada (depot)
  locations.push({
    id: 'depot-end',
    lat: centerLat,
    lng: centerLng,
    type: 'llegada',
    address: 'Depósito Central, Córdoba'
  })
  
  return locations
}

async function testSegmentedRoute() {
  console.log('🧪 Probando ruta segmentada con 35 puntos...\n')
  
  const locations = generateRandomPoints(35)
  
  console.log(`📍 Generados ${locations.length} puntos (1 partida + 35 intermedios + 1 llegada)\n`)
  
  const request = {
    locations,
    travelMode: 'DRIVING',
    language: 'es',
    vehicleType: 'commercial',
    fuelType: 'gasoil'
  }
  
  try {
    console.log('🔄 Enviando petición al proxy...')
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })
    
    const data = await response.json()
    
    if (!data.success) {
      console.error('❌ Error:', data.error || data.message)
      return
    }
    
    console.log('\n✅ Respuesta recibida!\n')
    console.log('=' .repeat(60))
    
    // Mostrar datos de segmentación
    console.log('\n📊 DATOS DE SEGMENTACIÓN:')
    console.log(`   isSegmented: ${data.data.isSegmented}`)
    console.log(`   totalWaypoints: ${data.data.totalWaypoints}`)
    console.log(`   googleMapsUrl: ${data.data.googleMapsUrl ? '✅ Tiene URL' : '❌ null (esperado para rutas segmentadas)'}`)
    
    if (data.data.isSegmented && data.data.segments) {
      console.log(`\n🔀 SEGMENTOS (${data.data.segments.length}):`)
      
      data.data.segments.forEach((segment, index) => {
        console.log(`\n   📍 ${segment.name}:`)
        console.log(`      ID: ${segment.id}`)
        console.log(`      Rango: ${segment.waypointRange.from} → ${segment.waypointRange.to}`)
        console.log(`      Waypoints: ${segment.waypointsCount}`)
        console.log(`      URL: ${segment.googleMapsUrl ? segment.googleMapsUrl.substring(0, 80) + '...' : 'N/A'}`)
      })
    } else {
      console.log('\n⚠️  La ruta NO está segmentada (debería estarlo con >25 puntos)')
    }
    
    // Mostrar otras métricas
    if (data.data.routes?.[0]) {
      console.log(`\n📏 MÉTRICAS:`)
      console.log(`   Distancia: ${data.data.routes[0].distance?.text}`)
      console.log(`   Duración: ${data.data.routes[0].duration?.text}`)
    }
    
    if (data.data.costCalculation) {
      console.log(`\n💰 COSTOS:`)
      console.log(`   Combustible: $${data.data.costCalculation.fuelCost}`)
      console.log(`   Total: $${data.data.costCalculation.totalCost}`)
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log('\n✅ Test completado!')
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message)
    console.log('\n💡 Asegúrate de que el servidor esté corriendo en localhost:3001')
  }
}

testSegmentedRoute()


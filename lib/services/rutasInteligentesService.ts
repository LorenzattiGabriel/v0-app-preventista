/**
 * Servicio para generar rutas inteligentes a partir de pedidos
 * Integración con microservicio: https://v0-micro-saa-s-snowy.vercel.app
 */

import { rutasInteligentesClient, RutasInteligentesError } from './rutasInteligentesClient'
import type { Location } from '@/lib/types/rutas-inteligentes.types'

/**
 * Punto de partida por defecto (Córdoba Capital)
 * Puedes cambiar esto a tu depósito/base de operaciones
 */
const DEFAULT_DEPOT = {
  lat: -31.4201,
  lng: -64.1888,
  address: 'Depósito Central, Córdoba',
}

/**
 * Parámetros opcionales para cálculo de costos
 */
export interface CostParams {
  vehicleType?: string
  fuelType?: string
  driverSalary?: number
}

/**
 * Genera una ruta optimizada a partir de un array de pedidos
 * 
 * @param orders - Array de pedidos con información del cliente (customers)
 * @param startLat - Latitud del punto de partida
 * @param startLng - Longitud del punto de partida
 * @param costParams - Parámetros opcionales para cálculo de costos
 * @param endLat - Latitud del punto de llegada (opcional, por defecto usa startLat)
 * @param endLng - Longitud del punto de llegada (opcional, por defecto usa startLng)
 * @returns Datos de la ruta optimizada con orden, distancia, duración, costos, etc.
 */
export async function generateRouteFromOrders(
  orders: any[],
  startLat: number,
  startLng: number,
  costParams?: CostParams,
  endLat?: number,
  endLng?: number
) {
  try {
    // Si no se especifica punto de llegada, usar el mismo que partida
    const finalEndLat = endLat ?? startLat
    const finalEndLng = endLng ?? startLng

    console.log(`🚚 Generando ruta para ${orders.length} pedidos...`)
    console.log(`📍 Partida: (${startLat}, ${startLng})`)
    console.log(`🏁 Llegada: (${finalEndLat}, ${finalEndLng})`)
    if (costParams) {
      console.log(`💰 Parámetros de costos:`, costParams)
    }

    // Construir array de locations
    const locations: Location[] = []

    // 1. Punto de partida
    locations.push({
      id: 'depot-start',
      lat: startLat,
      lng: startLng,
      type: 'partida',
      address: 'Punto de Partida',
    })

    // 2. Agregar cada pedido como punto intermedio
    let ordersWithCoordinates = 0
    let ordersWithoutCoordinates = 0

    for (const order of orders) {
      const customer = order.customers

      // Validar que el cliente tenga coordenadas
      if (!customer.latitude || !customer.longitude) {
        console.warn(`⚠️ Pedido ${order.order_number} - Cliente "${customer.commercial_name || customer.name}" sin coordenadas, omitiendo...`)
        ordersWithoutCoordinates++
        continue
      }

      // Validar que las coordenadas sean números válidos
      const lat = parseFloat(customer.latitude)
      const lng = parseFloat(customer.longitude)

      if (isNaN(lat) || isNaN(lng)) {
        console.warn(`⚠️ Pedido ${order.order_number} - Coordenadas inválidas, omitiendo...`)
        ordersWithoutCoordinates++
        continue
      }

      locations.push({
        id: order.id, // Usar el ID del pedido
        lat,
        lng,
        type: 'intermedio',
        address: `${customer.commercial_name || customer.name} - ${customer.address || customer.street || ''}`.trim(),
      })

      ordersWithCoordinates++
    }

    // 3. Punto de llegada
    locations.push({
      id: 'depot-end',
      lat: finalEndLat,
      lng: finalEndLng,
      type: 'llegada',
      address: 'Punto de Llegada',
    })

    console.log(`📊 Resumen:`)
    console.log(`   ✅ ${ordersWithCoordinates} pedidos con coordenadas`)
    console.log(`   ⚠️ ${ordersWithoutCoordinates} pedidos sin coordenadas`)
    console.log(`   📍 Total ubicaciones: ${locations.length}`)

    // Validar que tengamos al menos 1 pedido (3 locations: partida + 1 intermedio + llegada)
    if (locations.length < 3) {
      throw new RutasInteligentesError(
        'No hay suficientes pedidos con coordenadas para generar una ruta. ' +
        'Asegúrate de que los clientes tengan coordenadas guardadas.'
      )
    }

    // Validar ubicaciones
    rutasInteligentesClient.constructor.validateLocations(locations)

    // Preparar request
    const request: any = {
      locations,
      travelMode: 'DRIVING',
      language: 'es',
    }

    // Agregar parámetros de costos si están disponibles
    if (costParams?.vehicleType && costParams?.fuelType) {
      request.vehicleType = costParams.vehicleType
      request.fuelType = costParams.fuelType
      if (costParams.driverSalary) {
        request.driverSalary = costParams.driverSalary
      }
    }

    // Llamar al microservicio
    console.log(`🔄 Llamando al microservicio de Rutas Inteligentes...`)
    const result = await rutasInteligentesClient.generateRoute(request)

    console.log(`✅ Ruta optimizada generada:`)
    console.log(`   📏 Distancia: ${result.routes[0].distance.text}`)
    console.log(`   ⏱️ Duración: ${result.routes[0].duration.text}`)
    console.log(`   🔢 Orden optimizado: ${result.optimizedOrder.length} puntos`)
    console.log(`   🔗 Google Maps URL: ${result.googleMapsUrl ? 'Sí' : 'No'}`)
    if (result.costCalculation) {
      console.log(`   💰 Costo total: $${result.costCalculation.totalCost}`)
    }

    // Extraer métricas para retornar
    const totalDistance = result.routes[0].distance.value / 1000 // metros a km
    const estimatedDuration = result.routes[0].duration.value / 60 // segundos a minutos

    return {
      data: result,
      totalDistance,
      estimatedDuration,
      googleMapsUrl: result.googleMapsUrl,
      costCalculation: result.costCalculation,
      stats: {
        ordersWithCoordinates,
        ordersWithoutCoordinates,
        totalOrders: orders.length,
      },
    }
  } catch (error: any) {
    console.error('❌ Error al generar ruta:', error.message)
    throw error
  }
}

/**
 * Obtiene el historial de rutas generadas
 * 
 * @param limit - Número de rutas a obtener (default: 50)
 * @param offset - Offset para paginación (default: 0)
 * @param sort - Orden: 'desc' (más reciente) o 'asc' (más antiguo)
 * @returns Historial de rutas con paginación
 */
export async function getRoutesHistory(
  limit = 50,
  offset = 0,
  sort: 'asc' | 'desc' = 'desc'
) {
  try {
    const response = await rutasInteligentesClient.getHistory(limit, offset, sort)
    return response
  } catch (error: any) {
    console.error('❌ Error al obtener historial:', error.message)
    throw error
  }
}

/**
 * Obtiene el detalle de una ruta específica por ID
 * 
 * @param routeId - ID de la ruta
 * @returns Detalle completo de la ruta
 */
export async function getRouteDetail(routeId: string) {
  try {
    const route = await rutasInteligentesClient.getRouteById(routeId)
    return route
  } catch (error: any) {
    console.error('❌ Error al obtener detalle de ruta:', error.message)
    throw error
  }
}

/**
 * Extrae el orden de entrega optimizado para los pedidos
 * 
 * @param optimizedOrder - Orden optimizado del microservicio
 * @param originalOrders - Array original de pedidos
 * @returns Array de pedidos en el orden optimizado
 */
export function extractOptimizedOrderIds(
  optimizedOrder: Location[],
  originalOrders: any[]
): string[] {
  return optimizedOrder
    .filter(loc => loc.type === 'intermedio') // Solo los puntos intermedios (pedidos)
    .map(loc => loc.id) // Extraer los IDs
    .filter(id => originalOrders.some(order => order.id === id)) // Validar que existan
}

/**
 * Reordena los pedidos según el orden optimizado
 * 
 * @param optimizedOrder - Orden optimizado del microservicio
 * @param originalOrders - Array original de pedidos
 * @returns Array de pedidos reordenados según la optimización
 */
export function reorderOrdersByOptimization(
  optimizedOrder: Location[],
  originalOrders: any[]
): any[] {
  const orderIds = extractOptimizedOrderIds(optimizedOrder, originalOrders)
  
  return orderIds
    .map(id => originalOrders.find(order => order.id === id))
    .filter(Boolean) // Remover nulls
}




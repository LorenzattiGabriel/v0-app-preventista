/**
 * Servicio para gestionar el historial de rutas generadas
 * Se conecta al microservicio de rutas inteligentes
 */

import { rutasInteligentesClient } from './rutasInteligentesClient'

export interface SavedRoute {
  id: string
  timestamp: string
  locations: Array<{
    id: string
    address: string
    lat: number
    lng: number
    type: 'partida' | 'intermedio' | 'llegada'
  }>
  route: {
    distance: { text: string; value: number }
    duration: { text: string; value: number }
    overview_polyline: string
    steps?: any[]
  }
  optimizedOrder: Array<{
    id: string
    lat: number
    lng: number
    type: string
  }>
  googleMapsUrl: string
  costCalculation?: {
    fuelCost: number
    driverCost: number
    totalCost: number
    fuelLiters: number
    fuelPricePerLiter: number
    driverHours: number
    driverHourlyRate: number
    breakdown: {
      distance: number
      duration: number
      vehicleType: string
      fuelType: string
      consumption: number
      localidad: string
    }
  }
}

export interface HistoryResponse {
  routes: SavedRoute[]
  total: number
}

/**
 * Obtiene el historial de rutas generadas
 */
export async function getHistory(
  limit = 10,
  offset = 0,
  sort: 'asc' | 'desc' = 'desc'
): Promise<HistoryResponse> {
  try {
    const response = await rutasInteligentesClient.getHistory(limit, offset, sort)
    
    return {
      routes: response.data || [],
      total: response.pagination?.total || 0,
    }
  } catch (error: any) {
    console.error('Error al obtener historial:', error)
    throw error
  }
}

/**
 * Formatea la fecha de una ruta
 */
export function formatRouteDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Genera la URL de un mapa estático de Google Maps
 */
export function getStaticMapUrl(
  polyline: string,
  width = 600,
  height = 400
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  return `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&path=enc:${encodeURIComponent(
    polyline
  )}&key=${apiKey}`
}




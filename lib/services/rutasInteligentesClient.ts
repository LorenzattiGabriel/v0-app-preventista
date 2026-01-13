/**
 * Cliente HTTP para comunicarse con el microservicio de Rutas Inteligentes
 * Base URL: https://v0-micro-saa-s-snowy.vercel.app
 */

import type {
  Location,
  RutaInteligenteRequest,
  RutaInteligenteResponse,
  RutaInteligenteSuccessResponse,
  HistorialRutasResponse,
  SavedRoute,
} from '@/lib/types/rutas-inteligentes.types'

// Base URL del microservicio
// Usamos siempre el proxy para evitar CORS y centralizar la configuración
const BASE_URL = '/api/proxy-rutas'

/**
 * Error personalizado para el API
 */
export class RutasInteligentesError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'RutasInteligentesError'
  }
}

/**
 * Cliente para el microservicio de Rutas Inteligentes
 */
export class RutasInteligentesClient {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl = BASE_URL, timeout = 60000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  /**
   * Genera una ruta optimizada
   */
  async generateRoute(request: RutaInteligenteRequest): Promise<RutaInteligenteSuccessResponse['data']> {
    try {
      const isUsingProxy = this.baseUrl.startsWith('/')
      const endpoint = isUsingProxy ? this.baseUrl : `${this.baseUrl}/api/rutas-inteligentes`
      
      console.log('🚀 Llamando a microservicio:', {
        url: endpoint,
        proxy: isUsingProxy,
        locations: request.locations.length,
        timestamp: new Date().toISOString(),
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
      
      // Solo agregar x-client-id si NO estamos usando el proxy
      // El proxy lo agregará automáticamente
      if (!isUsingProxy) {
        headers['x-client-id'] = 'preventista-app-client-id'
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Leer respuesta como texto primero para mejor manejo de errores
      const responseText = await response.text()
      
      console.log('📥 Response status:', response.status, 'length:', responseText.length)
      
      if (!responseText) {
        throw new RutasInteligentesError(
          `El microservicio no devolvió ninguna respuesta (HTTP ${response.status}). ` +
          `Verifica que el servidor de desarrollo esté corriendo.`,
          response.status
        )
      }

      let data: RutaInteligenteResponse
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ Respuesta no es JSON válido:', responseText.substring(0, 200))
        throw new RutasInteligentesError(
          `Respuesta inválida del microservicio (status: ${response.status})`,
          response.status
        )
      }

      console.log('📥 Respuesta del microservicio:', {
        success: data.success,
        status: response.status,
        hasData: !!(data as any).data,
      })

      if (!response.ok || !data.success) {
        throw new RutasInteligentesError(
          (data as any).error || 'Error en el servidor',
          response.status,
          data
        )
      }

      return (data as RutaInteligenteSuccessResponse).data
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new RutasInteligentesError(`Timeout después de ${this.timeout}ms`)
      }

      if (error instanceof RutasInteligentesError) {
        throw error
      }

      console.error('❌ Error al generar ruta:', error)
      throw new RutasInteligentesError(
        `Error de red: ${error.message}`,
        undefined,
        error
      )
    }
  }

  /**
   * Obtiene el historial de rutas
   */
  async getHistory(limit = 50, offset = 0, sort: 'asc' | 'desc' = 'desc'): Promise<HistorialRutasResponse> {
    try {
      const isUsingProxy = this.baseUrl.startsWith('/')
      const endpoint = isUsingProxy 
        ? `${this.baseUrl}/history?limit=${limit}&offset=${offset}&sort=${sort}`
        : `${this.baseUrl}/api/rutas-inteligentes/history?limit=${limit}&offset=${offset}&sort=${sort}`
      
      console.log('📊 Obteniendo historial:', { endpoint, limit, offset, sort })

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      
      if (!isUsingProxy) {
        headers['x-client-id'] = 'preventista-app-client-id'
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new RutasInteligentesError(
          'Error al obtener historial',
          response.status
        )
      }

      const data: HistorialRutasResponse = await response.json()

      console.log('✅ Historial obtenido:', {
        rutas: data.data?.length || 0,
        total: data.pagination?.total,
      })

      return data
    } catch (error: any) {
      console.error('❌ Error al obtener historial:', error)
      throw new RutasInteligentesError(
        `Error al obtener historial: ${error.message}`,
        undefined,
        error
      )
    }
  }

  /**
   * Obtiene el detalle de una ruta específica
   */
  async getRouteById(routeId: string): Promise<SavedRoute> {
    try {
      const isUsingProxy = this.baseUrl.startsWith('/')
      const endpoint = isUsingProxy 
        ? `${this.baseUrl}/history/${routeId}`
        : `${this.baseUrl}/api/rutas-inteligentes/history/${routeId}`

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      }
      
      if (!isUsingProxy) {
        headers['x-client-id'] = 'preventista-app-client-id'
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new RutasInteligentesError(
          'Error al obtener detalle de ruta',
          response.status
        )
      }

      const data: { success: boolean; data: SavedRoute } = await response.json()

      if (!data.success) {
        throw new RutasInteligentesError('Error al obtener detalle de ruta')
      }

      return data.data
    } catch (error: any) {
      console.error('❌ Error al obtener detalle:', error)
      throw new RutasInteligentesError(
        `Error al obtener detalle: ${error.message}`,
        undefined,
        error
      )
    }
  }

  /**
   * Valida que las coordenadas estén en Argentina
   */
  static isInArgentina(lat: number, lng: number): boolean {
    return lat >= -55 && lat <= -21 && lng >= -74 && lng <= -53
  }

  /**
   * Valida un array de ubicaciones
   */
  static validateLocations(locations: Location[]): void {
    if (!Array.isArray(locations) || locations.length < 2) {
      throw new RutasInteligentesError('Se requieren al menos 2 ubicaciones')
    }

    const partidaCount = locations.filter((l) => l.type === 'partida').length
    const llegadaCount = locations.filter((l) => l.type === 'llegada').length

    if (partidaCount !== 1) {
      throw new RutasInteligentesError(
        'Debe haber exactamente una ubicación de tipo "partida"'
      )
    }

    if (llegadaCount !== 1) {
      throw new RutasInteligentesError(
        'Debe haber exactamente una ubicación de tipo "llegada"'
      )
    }

    for (const location of locations) {
      if (!location.id || !location.lat || !location.lng || !location.type) {
        throw new RutasInteligentesError(
          `Ubicación inválida: ${JSON.stringify(location)}`
        )
      }

      if (!RutasInteligentesClient.isInArgentina(location.lat, location.lng)) {
        throw new RutasInteligentesError(
          `La ubicación "${location.address || location.id}" está fuera de Argentina`
        )
      }
    }
  }
}

// Instancia singleton del cliente
export const rutasInteligentesClient = new RutasInteligentesClient()

/**
 * Helper: Formatea la distancia en km
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000
  return `${km.toFixed(1)} km`
}

/**
 * Helper: Formatea la duración en horas y minutos
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours} h ${minutes} min`
  }
  return `${minutes} min`
}

/**
 * Helper: Formatea un precio en pesos argentinos
 */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`
}


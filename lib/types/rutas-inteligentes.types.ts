/**
 * Tipos para la integración con el microservicio de Rutas Inteligentes
 * Base URL: https://v0-micro-saa-s-snowy.vercel.app
 */

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'
export type AvoidType = 'tolls' | 'highways' | 'ferries' | 'indoor'
export type LocationType = 'partida' | 'intermedio' | 'llegada'

// Tipos de vehículos disponibles
export type VehicleType =
  | 'sedan_small'
  | 'sedan_medium'
  | 'sedan_large'
  | 'suv_small'
  | 'suv_medium'
  | 'suv_large'
  | 'pickup'
  | 'van_cargo'
  | 'van_passenger'
  | 'truck_light'
  | 'truck_medium'
  | 'truck_heavy'
  | 'motorcycle'
  | 'electric_sedan'
  | 'electric_suv'

// Tipos de combustible
export type FuelType =
  | 'nafta_super'
  | 'nafta_premium'
  | 'diesel'
  | 'gnc'
  | 'electric'

/**
 * Ubicación individual
 */
export interface Location {
  id: string
  lat: number
  lng: number
  type: LocationType
  address?: string
}

/**
 * Request para generar ruta inteligente
 */
export interface RutaInteligenteRequest {
  locations: Location[]
  travelMode?: TravelMode
  avoid?: AvoidType[]
  language?: string
  // Parámetros opcionales para cálculo de costos
  driverSalary?: number
  vehicleType?: VehicleType
  fuelType?: FuelType
}

/**
 * Información de distancia
 */
export interface DistanceInfo {
  text: string // "15.2 km"
  value: number // 15200 (metros)
}

/**
 * Información de duración
 */
export interface DurationInfo {
  text: string // "25 minutos"
  value: number // 1500 (segundos)
}

/**
 * Paso individual de la ruta
 */
export interface RouteStep {
  instruction: string
  distance: DistanceInfo
  duration: DurationInfo
  polyline?: string
}

/**
 * Ruta generada
 */
export interface RouteData {
  distance: DistanceInfo
  duration: DurationInfo
  overview_polyline: string
  polyline?: string
  steps: RouteStep[]
  bounds?: {
    northeast: { lat: number; lng: number }
    southwest: { lat: number; lng: number }
  }
}

/**
 * Desglose de cálculo de costos
 */
export interface CostBreakdown {
  distance: number // km
  duration: number // segundos
  vehicleType: VehicleType
  fuelType: FuelType
  consumption: number // km/l
  localidad: string
}

/**
 * Cálculo de costos
 */
export interface CostCalculation {
  fuelCost: number
  driverCost: number
  totalCost: number
  fuelLiters: number
  fuelPricePerLiter: number
  driverHours: number
  driverHourlyRate: number
  breakdown: CostBreakdown
}

/**
 * Response exitosa del API
 */
export interface RutaInteligenteSuccessResponse {
  success: true
  message: string
  data: {
    routes: RouteData[]
    optimizedOrder: Location[]
    googleMapsUrl: string
    costCalculation?: CostCalculation
  }
  savedRouteId?: string
}

/**
 * Response de error del API
 */
export interface RutaInteligenteErrorResponse {
  success: false
  error: string
}

/**
 * Response del API (puede ser éxito o error)
 */
export type RutaInteligenteResponse =
  | RutaInteligenteSuccessResponse
  | RutaInteligenteErrorResponse

/**
 * Ruta guardada en el historial
 */
export interface SavedRoute {
  id: string
  timestamp: string
  locations: Array<{
    id: string
    address: string
    lat: number
    lng: number
    type: LocationType
  }>
  route: {
    distance: DistanceInfo
    duration: DurationInfo
    overview_polyline: string
  }
  optimizedOrder: Location[]
  googleMapsUrl: string
  costCalculation?: CostCalculation
}

/**
 * Response del historial de rutas
 */
export interface HistorialRutasResponse {
  success: boolean
  data: SavedRoute[]
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}





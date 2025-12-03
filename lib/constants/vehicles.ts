/**
 * Constantes relacionadas con vehículos y combustibles
 * Copiado del microservicio de rutas inteligentes
 */

/**
 * Tipos de vehículos disponibles con su consumo en km/litro
 */
export const VEHICLE_TYPES = {
  sedan_small: {
    label: 'Auto Pequeño',
    consumption: 14, // km/l
    description: 'Gol, Fiesta, etc.',
  },
  sedan_medium: {
    label: 'Auto Mediano',
    consumption: 12,
    description: 'Corolla, Focus, etc.',
  },
  sedan_large: {
    label: 'Auto Grande',
    consumption: 10,
    description: 'Camry, Accord, etc.',
  },
  suv_compact: {
    label: 'SUV Compacta',
    consumption: 11,
    description: 'EcoSport, Tracker, etc.',
  },
  suv_large: {
    label: 'SUV Grande',
    consumption: 9,
    description: 'Amarok, Hilux, etc.',
  },
  pickup: {
    label: 'Pickup',
    consumption: 10,
    description: 'Pickup mediana',
  },
  commercial: {
    label: 'Vehículo Comercial',
    consumption: 8,
    description: 'Flete, transporte',
  },
  motorcycle: {
    label: 'Motocicleta',
    consumption: 30,
    description: 'Moto estándar',
  },
} as const

export type VehicleType = keyof typeof VEHICLE_TYPES

/**
 * Tipos de combustible disponibles
 */
export const FUEL_TYPES = {
  nafta_super: {
    label: 'Nafta Súper',
    apiProduct: 'Nafta (súper)',
  },
  nafta_premium: {
    label: 'Nafta Premium',
    apiProduct: 'Nafta (premium)',
  },
  gasoil: {
    label: 'Gasoil / Diesel',
    apiProduct: 'Gas Oil',
  },
  gnc: {
    label: 'GNC',
    apiProduct: 'GNC',
  },
} as const

export type FuelType = keyof typeof FUEL_TYPES

/**
 * Configuración laboral para cálculo de costos de conductor
 */
export const LABOR_CONFIG = {
  /** Horas de trabajo por semana estándar */
  HOURS_PER_WEEK: 40,
  /** Semanas laborales por mes */
  WEEKS_PER_MONTH: 4,
  /** Horas laborales por mes (40hs x 4 semanas) */
  HOURS_PER_MONTH: 160,
} as const

/**
 * Obtiene el consumo de un tipo de vehículo
 */
export function getVehicleConsumption(vehicleType: VehicleType): number {
  return VEHICLE_TYPES[vehicleType].consumption
}

/**
 * Obtiene el nombre del producto de combustible para la API
 */
export function getFuelApiProductName(fuelType: FuelType): string {
  return FUEL_TYPES[fuelType].apiProduct
}

/**
 * Valida si un tipo de vehículo es válido
 */
export function isValidVehicleType(type: string): type is VehicleType {
  return type in VEHICLE_TYPES
}

/**
 * Valida si un tipo de combustible es válido
 */
export function isValidFuelType(type: string): type is FuelType {
  return type in FUEL_TYPES
}




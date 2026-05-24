/**
 * User Role Constants
 * Centralized definitions for user roles and their display properties
 */

export const USER_ROLES = {
  PREVENTISTA: 'preventista',
  ENCARGADO_ARMADO: 'encargado_armado',
  SUPERVISOR_ARMADO: 'supervisor_armado',
  REPARTIDOR: 'repartidor',
  CLIENTE: 'cliente',
  ADMINISTRATIVO: 'administrativo',
  VENTA_DIRECTA: 'venta_directa',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/** Lista ordenada de roles para usar en selects */
export const USER_ROLES_LIST: UserRole[] = [
  'administrativo',
  'preventista',
  'supervisor_armado',
  'encargado_armado',
  'repartidor',
  'venta_directa',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  preventista: 'Preventista',
  encargado_armado: 'Armador',
  supervisor_armado: 'Supervisor de Armado',
  repartidor: 'Repartidor',
  cliente: 'Cliente',
  administrativo: 'Administrativo',
  venta_directa: 'Venta Directa',
}

export const ROLE_COLORS: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  preventista: 'secondary',
  encargado_armado: 'outline',
  supervisor_armado: 'default',
  repartidor: 'secondary',
  cliente: 'outline',
  administrativo: 'default',
  venta_directa: 'secondary',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  preventista: 'Gestiona clientes y toma pedidos',
  encargado_armado: 'Arma y prepara los pedidos',
  supervisor_armado: 'Asigna pedidos a armadores, arma pedidos y supervisa el estado del depósito',
  repartidor: 'Entrega pedidos a clientes',
  cliente: 'Cliente final del sistema',
  administrativo: 'Acceso completo al sistema',
  venta_directa: 'Vende en el local con armado inmediato',
}

/**
 * Pagination constants
 */
export const USERS_PER_PAGE = 15

/**
 * User Role Constants
 * Centralized definitions for user roles and their display properties
 */

export const USER_ROLES = {
  PREVENTISTA: 'preventista',
  ENCARGADO_ARMADO: 'encargado_armado',
  REPARTIDOR: 'repartidor',
  CLIENTE: 'cliente',
  ADMINISTRATIVO: 'administrativo',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export const ROLE_LABELS: Record<UserRole, string> = {
  preventista: 'Preventista',
  encargado_armado: 'Encargado de Armado',
  repartidor: 'Repartidor',
  cliente: 'Cliente',
  administrativo: 'Administrativo',
}

export const ROLE_COLORS: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  preventista: 'secondary',
  encargado_armado: 'outline',
  repartidor: 'secondary',
  cliente: 'outline',
  administrativo: 'default',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  preventista: 'Gestiona clientes y toma pedidos',
  encargado_armado: 'Arma y prepara los pedidos',
  repartidor: 'Entrega pedidos a clientes',
  cliente: 'Cliente final del sistema',
  administrativo: 'Acceso completo al sistema',
}

/**
 * Pagination constants
 */
export const USERS_PER_PAGE = 15


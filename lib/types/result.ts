// Tipo de retorno discriminado para operaciones que pueden fallar.
// Se usa en services y server actions del módulo de venta directa
// y futuros módulos para evitar tirar excepciones a través de límites.

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E }

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data }
}

export function err<E = string>(error: E): Result<never, E> {
  return { success: false, error }
}

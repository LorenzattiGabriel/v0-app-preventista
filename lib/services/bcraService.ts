// Integración con la API pública del BCRA (sin autenticación) para un
// CUIT/CUIL/CDI: cheques rechazados y situación crediticia (Central de
// Deudores). Base: https://api.bcra.gob.ar — ambos endpoints confirmados
// contra la API real:
//   GET /centraldedeudores/v1.0/Deudas/ChequesRechazados/{identificacion}
//   GET /centraldedeudores/v1.0/Deudas/{identificacion}
//   Sin registros → {"status":404,"errorMessages":[...]}
//   Con registros → {"status":200,"results":{...}}
// Siempre llamar desde el server (nunca desde el browser): es una API externa,
// no tiene CORS pensado para esto y no hay por qué exponer la IP del cliente.

const BCRA_BASE_URL = "https://api.bcra.gob.ar"

export interface ChequeRechazadoDetalle {
  nroCheque: number
  fechaRechazo: string
  monto: number
  fechaPago: string | null
  fechaPagoMulta: string | null
  estadoMulta?: string | null
  ctaPersonal?: boolean
  denomJuridica?: string | null
  enRevision: boolean
  procesoJud: boolean
}

export interface ChequesRechazadosEntidad {
  entidad: number | string
  detalle: ChequeRechazadoDetalle[]
}

export interface ChequesRechazadosCausal {
  causal: string
  entidades: ChequesRechazadosEntidad[]
}

export interface ChequesRechazadosResult {
  identificacion: number
  denominacion: string
  causales: ChequesRechazadosCausal[]
}

export interface BcraEntidad {
  codigoEntidad: number
  denominacion: string
}

export type BcraChequesLookup =
  | { found: true; data: ChequesRechazadosResult }
  | { found: false }

// Situación crediticia (Central de Deudores) — códigos estándar del BCRA.
export const SITUACION_LABELS: Record<number, string> = {
  1: "Situación normal",
  2: "Riesgo bajo (seguimiento especial)",
  3: "Riesgo medio (con problemas)",
  4: "Riesgo alto (alto riesgo de insolvencia)",
  5: "Irrecuperable",
}

export interface DeudaEntidad {
  entidad: string
  situacion: number
  fechaSit1: string
  monto: number
  diasAtrasoPago: number
  refinanciaciones: boolean
  recategorizacionOblig: boolean
  situacionJuridica: boolean
  irrecDisposicionTecnica: boolean
  enRevision: boolean
  procesoJud: boolean
}

export interface DeudaPeriodo {
  periodo: string
  entidades: DeudaEntidad[]
}

export interface DeudasResult {
  identificacion: number
  denominacion: string
  periodos: DeudaPeriodo[]
}

export type BcraDeudasLookup =
  | { found: true; data: DeudasResult }
  | { found: false }

export class BcraApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "BcraApiError"
  }
}

/** Normaliza un CUIT/CUIL/CDI: deja solo dígitos. La API pide 11 dígitos. */
export function normalizeCuit(raw: string): string {
  return raw.replace(/\D/g, "")
}

export function isValidCuit(raw: string): boolean {
  return /^\d{11}$/.test(normalizeCuit(raw))
}

/**
 * Cheques rechazados registrados en el BCRA para un CUIT/CUIL/CDI.
 * `found: false` significa "sin novedades" (la API devuelve 404 para eso,
 * no es un error). Cualquier otra falla de red/formato se tira como
 * BcraApiError para que el caller la distinga de "no tiene cheques".
 */
export async function getChequesRechazados(cuitRaw: string): Promise<BcraChequesLookup> {
  const cuit = normalizeCuit(cuitRaw)
  if (!isValidCuit(cuit)) {
    throw new BcraApiError(`CUIT/CUIL inválido: "${cuitRaw}" (debe tener 11 dígitos)`)
  }

  let res: Response
  try {
    res = await fetch(`${BCRA_BASE_URL}/centraldedeudores/v1.0/Deudas/ChequesRechazados/${cuit}`, {
      // La API del BCRA no cambia con frecuencia; igual no cacheamos: es una
      // consulta puntual del admin, no queremos datos viejos de un cheque
      // que recién se puso al día.
      cache: "no-store",
    })
  } catch (err) {
    throw new BcraApiError("No se pudo conectar con la API del BCRA. Probá de nuevo en un momento.")
  }

  if (res.status === 404) {
    return { found: false }
  }

  if (!res.ok) {
    throw new BcraApiError(`La API del BCRA respondió con un error (status ${res.status}).`, res.status)
  }

  const body = await res.json()
  if (!body?.results) {
    return { found: false }
  }

  return { found: true, data: body.results as ChequesRechazadosResult }
}

/**
 * Situación crediticia (Central de Deudores del Sistema Financiero) para un
 * CUIT/CUIL/CDI — en qué entidades tiene deuda, situación 1-5, monto, días
 * de atraso. Misma semántica de "found: false" que getChequesRechazados.
 */
export async function getDeudas(cuitRaw: string): Promise<BcraDeudasLookup> {
  const cuit = normalizeCuit(cuitRaw)
  if (!isValidCuit(cuit)) {
    throw new BcraApiError(`CUIT/CUIL inválido: "${cuitRaw}" (debe tener 11 dígitos)`)
  }

  let res: Response
  try {
    res = await fetch(`${BCRA_BASE_URL}/centraldedeudores/v1.0/Deudas/${cuit}`, { cache: "no-store" })
  } catch (err) {
    throw new BcraApiError("No se pudo conectar con la API del BCRA. Probá de nuevo en un momento.")
  }

  if (res.status === 404) {
    return { found: false }
  }

  if (!res.ok) {
    throw new BcraApiError(`La API del BCRA respondió con un error (status ${res.status}).`, res.status)
  }

  const body = await res.json()
  if (!body?.results) {
    return { found: false }
  }

  return { found: true, data: body.results as DeudasResult }
}

let entidadesCache: { at: number; data: BcraEntidad[] } | null = null
const ENTIDADES_CACHE_MS = 60 * 60 * 1000 // 1h: lista de bancos, cambia poquísimo

/** Mapa código de entidad → nombre del banco, para mostrar algo legible. */
export async function getEntidadesMap(): Promise<Map<number, string>> {
  const now = Date.now()
  if (!entidadesCache || now - entidadesCache.at > ENTIDADES_CACHE_MS) {
    const res = await fetch(`${BCRA_BASE_URL}/cheques/v1.0/entidades`, { cache: "no-store" })
    if (!res.ok) return new Map()
    const body = await res.json()
    entidadesCache = { at: now, data: (body?.results as BcraEntidad[]) || [] }
  }
  return new Map(entidadesCache.data.map((e) => [e.codigoEntidad, e.denominacion]))
}

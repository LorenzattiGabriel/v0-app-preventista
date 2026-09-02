import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Subida de evidencia fotográfica de reparto al bucket `delivery`.
 *
 * Concentra lo que antes estaba inline en delivery-route-view: naming de
 * archivos, detección de bucket faltante y obtención de la URL pública.
 */

export type DeliveryMediaKind = "delivery" | "no_delivery" | "transfer_proof"

export interface DeliveryMediaContext {
  orderId: string
  /** Sólo para `transfer_proof`: identifica la línea de pago. */
  lineId?: string
}

export interface UploadResult {
  /** URL pública, o null si el bucket no existe. */
  url: string | null
  /**
   * El bucket no está creado en Supabase. Es un problema de infraestructura que
   * el repartidor no puede resolver en la calle, así que el flujo continúa sin
   * foto en vez de dejarlo trabado frente al cliente.
   */
  bucketMissing: boolean
}

const BUCKET = "delivery"

/** Extensión segura: primero el nombre, después el MIME type. */
export function getFileExtension(file: File): string {
  const nameParts = file.name.split(".")
  if (nameParts.length > 1) {
    return nameParts.pop() || "jpg"
  }
  if (file.type.includes("png")) return "png"
  if (file.type.includes("gif")) return "gif"
  if (file.type.includes("webp")) return "webp"
  return "jpg"
}

/**
 * Nombres idénticos a los que ya usa la app: no se renombra nada de lo que
 * está guardado en el bucket ni en las URLs persistidas.
 */
export function buildFileName(kind: DeliveryMediaKind, ctx: DeliveryMediaContext, file: File): string {
  const ext = getFileExtension(file)
  const stamp = Date.now()

  switch (kind) {
    case "no_delivery":
      return `no_delivery_${ctx.orderId}_${stamp}.${ext}`
    case "transfer_proof":
      return `${ctx.orderId}_transfer_proof_${ctx.lineId}_${stamp}.${ext}`
    case "delivery":
    default:
      return `${ctx.orderId}_${stamp}.${ext}`
  }
}

function isBucketMissingError(message: string | undefined): boolean {
  if (!message) return false
  return message.includes("Bucket not found") || message.includes("not found")
}

export function createDeliveryMediaService(supabase: SupabaseClient) {
  return {
    /**
     * Sube el archivo y devuelve su URL pública.
     * Lanza si el error es real (red, permisos, cuota); si el bucket no existe
     * devuelve `bucketMissing` para que el llamador siga sin foto.
     */
    async upload(file: File, kind: DeliveryMediaKind, ctx: DeliveryMediaContext): Promise<UploadResult> {
      const fileName = buildFileName(kind, ctx, file)

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        if (isBucketMissingError(uploadError.message)) {
          console.warn(`[delivery-media] Bucket '${BUCKET}' no encontrado - se continúa sin foto`)
          return { url: null, bucketMissing: true }
        }
        throw new Error(uploadError.message)
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
      return { url: data.publicUrl, bucketMissing: false }
    },
  }
}

export type DeliveryMediaService = ReturnType<typeof createDeliveryMediaService>

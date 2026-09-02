/**
 * Compresión de imágenes en el cliente (Canvas API, sin dependencias).
 *
 * Motivación: la cámara nativa del celular devuelve JPEGs de 3-5 MB (12MP).
 * Subir eso crudo desde 4G en la calle tarda 15-40s. Reescalado a 1600px con
 * calidad 0.7 el mismo comprobante pesa 150-250 KB y sigue siendo legible.
 *
 * Regla de oro: si algo falla, se devuelve el archivo original. Nunca se rompe
 * el flujo de entrega por un problema de compresión — el repartidor está parado
 * frente al cliente.
 */

export interface CompressionOptions {
  /** Lado más largo de la imagen resultante, en px. */
  maxDimension?: number
  /** Calidad JPEG, 0 a 1. */
  quality?: number
}

export const DEFAULT_MAX_DIMENSION = 1600
export const DEFAULT_QUALITY = 0.7

/** Tope defensivo sobre el archivo ORIGINAL: evita OOM al decodificar. */
export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024

/** Por debajo de este peso no vale la pena recomprimir (y degradar de nuevo). */
const SKIP_COMPRESSION_BELOW_BYTES = 300 * 1024

/** Formatos que sabemos rasterizar sin pérdida de semántica (un GIF animado, no). */
const COMPRESSIBLE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]

export function isImageFile(file: File): boolean {
  return typeof file?.type === "string" && file.type.startsWith("image/")
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Calcula el tamaño destino manteniendo el aspect ratio.
 * Nunca agranda: si la imagen ya entra en maxDimension, se devuelve igual.
 */
export function computeScaledSize(
  width: number,
  height: number,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
): { width: number; height: number } {
  const longestSide = Math.max(width, height)
  if (longestSide <= maxDimension || longestSide === 0) {
    return { width, height }
  }
  const ratio = maxDimension / longestSide
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

/** URL de preview local. Barata e instantánea, a diferencia de FileReader + base64. */
export function createPreviewUrl(file: File | Blob): string {
  return URL.createObjectURL(file)
}

/**
 * Libera un preview. Ignora URLs que no sean object URLs (ej. una publicUrl de
 * Supabase que haya reemplazado al preview), así que es seguro llamarla siempre.
 */
export function revokePreviewUrl(url: string | null | undefined): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}

/** Decodifica el archivo respetando la orientación EXIF. */
async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      // `from-image` evita que las fotos verticales salgan acostadas.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
      return { source: bitmap, width: bitmap.width, height: bitmap.height }
    } catch {
      // Safari viejo no acepta el options bag: seguimos con el fallback.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("No se pudo decodificar la imagen"))
      img.src = objectUrl
    })
    return { source: image, width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality)
  })
}

function withJpegExtension(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]+$/, "")
  return `${base || "foto"}.jpg`
}

/**
 * Reescala y recomprime a JPEG. Devuelve el archivo original si comprimir no
 * aporta nada o si algo falla.
 */
export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  const { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY } = options

  // Guard de entorno: este módulo sólo tiene sentido en el browser.
  if (typeof document === "undefined") return file

  if (!isImageFile(file)) return file
  if (!COMPRESSIBLE_MIME_TYPES.includes(file.type.toLowerCase())) return file

  try {
    const { source, width, height } = await decodeImage(file)
    const target = computeScaledSize(width, height, maxDimension)

    const needsResize = target.width !== width || target.height !== height
    // Ya es chica y liviana: recomprimir sólo degradaría calidad sin ganar nada.
    if (!needsResize && file.size <= SKIP_COMPRESSION_BELOW_BYTES) {
      if (typeof (source as ImageBitmap).close === "function") (source as ImageBitmap).close()
      return file
    }

    const canvas = document.createElement("canvas")
    canvas.width = target.width
    canvas.height = target.height

    const context = canvas.getContext("2d")
    if (!context) return file

    context.drawImage(source, 0, 0, target.width, target.height)
    if (typeof (source as ImageBitmap).close === "function") (source as ImageBitmap).close()

    const blob = await canvasToBlob(canvas, quality)
    if (!blob) return file

    // Si el "comprimido" pesa más (pasa con PNGs chicos), nos quedamos con el original.
    if (blob.size >= file.size && !needsResize) return file

    const compressed = new File([blob], withJpegExtension(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    })

    console.log(
      `[img] ${file.name}: ${formatFileSize(file.size)} (${width}x${height}) → ` +
        `${formatFileSize(compressed.size)} (${target.width}x${target.height})`,
    )

    return compressed
  } catch (err) {
    console.warn("[img] Falló la compresión, se sube el original:", err)
    return file
  }
}

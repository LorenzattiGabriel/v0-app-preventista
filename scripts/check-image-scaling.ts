import { computeScaledSize, formatFileSize, isImageFile, revokePreviewUrl } from "../lib/utils/image-compression"
import { buildFileName, createDeliveryMediaService, getFileExtension } from "../lib/services/deliveryMediaService"

let failed = 0
const check = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const ok = a === e
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    esperado ${e}, obtuvo ${a}`}`)
}

// Foto típica de cámara de celular (12MP horizontal)
check("4032x3024 → 1600 lado largo", computeScaledSize(4032, 3024, 1600), { width: 1600, height: 1200 })
// Foto vertical (comprobante de transferencia sacado de frente)
check("3024x4032 vertical", computeScaledSize(3024, 4032, 1600), { width: 1200, height: 1600 })
// Captura de pantalla de home banking (ya chica) — no se agranda
check("800x600 no se agranda", computeScaledSize(800, 600, 1600), { width: 800, height: 600 })
// Exactamente en el límite
check("1600x1200 sin cambio", computeScaledSize(1600, 1200, 1600), { width: 1600, height: 1200 })
// Cuadrada
check("2000x2000 cuadrada", computeScaledSize(2000, 2000, 1600), { width: 1600, height: 1600 })
// Degenerado: no debe dividir por cero
check("0x0 no rompe", computeScaledSize(0, 0, 1600), { width: 0, height: 0 })
// Panorámica extrema
check("6000x1000 panorámica", computeScaledSize(6000, 1000, 1600), { width: 1600, height: 267 })

check("formatFileSize 4.2MB", formatFileSize(4_404_019), "4.2 MB")
check("formatFileSize 180KB", formatFileSize(184_320), "180 KB")
check("formatFileSize bytes", formatFileSize(512), "512 B")

check("isImageFile jpeg", isImageFile({ type: "image/jpeg" } as File), true)
check("isImageFile pdf", isImageFile({ type: "application/pdf" } as File), false)
check("isImageFile sin type", isImageFile({} as File), false)

// revokePreviewUrl debe ignorar URLs remotas sin explotar (no hay URL.revokeObjectURL util acá)
globalThis.URL.revokeObjectURL = () => { throw new Error("no debería llamarse para https") }
revokePreviewUrl("https://x.supabase.co/storage/v1/object/public/delivery/a.jpg")
revokePreviewUrl(null)
console.log("✓ revokePreviewUrl ignora URLs remotas y null")

// ---------------------------------------------------------------------------
// deliveryMediaService: naming de archivos y manejo de errores de Storage.
// El naming DEBE coincidir con el que usaba el código inline, o se rompe la
// correlación con lo que ya está guardado en el bucket.
// ---------------------------------------------------------------------------

console.log("\n--- deliveryMediaService ---")

const jpg = { name: "foto.jpg", type: "image/jpeg" } as File
const sinExt = { name: "captura", type: "image/png" } as File

check("extensión desde el nombre", getFileExtension(jpg), "jpg")
check("extensión desde el MIME si no hay nombre", getFileExtension(sinExt), "png")
check("extensión default", getFileExtension({ name: "x", type: "" } as File), "jpg")

const ORDER = "abc-123"
check(
  "naming foto de entrega",
  buildFileName("delivery", { orderId: ORDER }, jpg).replace(/\d{13}/, "TS"),
  `${ORDER}_TS.jpg`,
)
check(
  "naming foto de no-entrega",
  buildFileName("no_delivery", { orderId: ORDER }, jpg).replace(/\d{13}/, "TS"),
  `no_delivery_${ORDER}_TS.jpg`,
)
check(
  "naming comprobante de transferencia",
  buildFileName("transfer_proof", { orderId: ORDER, lineId: "2" }, jpg).replace(/\d{13}/, "TS"),
  `${ORDER}_transfer_proof_2_TS.jpg`,
)

/** Supabase Storage falso: devuelve el error que se le indique. */
const fakeSupabase = (uploadError: { message: string } | null) => ({
  storage: {
    from: () => ({
      upload: async () => ({ error: uploadError }),
      getPublicUrl: (name: string) => ({ data: { publicUrl: `https://cdn.test/${name}` } }),
    }),
  },
}) as any

async function checkUploads() {
  const okService = createDeliveryMediaService(fakeSupabase(null))
  const result = await okService.upload(jpg, "delivery", { orderId: ORDER })
  check("upload OK devuelve URL pública", result.url?.startsWith("https://cdn.test/"), true)
  check("upload OK no marca bucketMissing", result.bucketMissing, false)

  const missingService = createDeliveryMediaService(fakeSupabase({ message: "Bucket not found" }))
  const missing = await missingService.upload(jpg, "delivery", { orderId: ORDER })
  check("bucket faltante → url null", missing.url, null)
  check("bucket faltante → bucketMissing true", missing.bucketMissing, true)

  const brokenService = createDeliveryMediaService(fakeSupabase({ message: "network failure" }))
  let threw = false
  try {
    await brokenService.upload(jpg, "delivery", { orderId: ORDER })
  } catch {
    threw = true
  }
  check("error real de subida lanza (no se traga)", threw, true)
}

checkUploads().then(() => {
  console.log(failed === 0 ? "\nTODO OK" : `\n${failed} FALLARON`)
  process.exit(failed === 0 ? 0 : 1)
})

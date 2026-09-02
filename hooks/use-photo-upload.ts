"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  compressImage,
  createPreviewUrl,
  formatFileSize,
  isImageFile,
  revokePreviewUrl,
  MAX_SOURCE_FILE_BYTES,
} from "@/lib/utils/image-compression"
import type { DeliveryMediaKind, DeliveryMediaContext, DeliveryMediaService } from "@/lib/services/deliveryMediaService"

/**
 * Captura → compresión → preview → subida en background, por "slot" de foto.
 *
 * Dos ideas centrales:
 *
 * 1. `previewUrl` (blob: local, sólo para mostrar) y `remoteUrl` (URL pública de
 *    Storage, lo único persistible) son campos SEPARADOS. Antes eran el mismo
 *    string con dos significados según el momento, y eso obligaba a mutar el
 *    state a mano para leerlo al confirmar.
 *
 * 2. La subida arranca al capturar, no al confirmar. Mientras el repartidor
 *    tipea el monto, la foto ya está viajando. `settle()` espera lo que quede
 *    en vuelo.
 */

export type PhotoUploadStatus = "empty" | "processing" | "uploading" | "ready" | "error"

export interface PhotoSlot {
  status: PhotoUploadStatus
  /** Archivo ya comprimido. */
  file: File | null
  /** objectURL local para el <img>. Nunca se persiste. */
  previewUrl: string | null
  /** URL pública de Storage. Lo único que va a la base de datos. */
  remoteUrl: string | null
  /** El bucket no existe: se sigue sin foto (ver deliveryMediaService). */
  bucketMissing: boolean
  error: string | null
}

export const EMPTY_SLOT: PhotoSlot = {
  status: "empty",
  file: null,
  previewUrl: null,
  remoteUrl: null,
  bucketMissing: false,
  error: null,
}

export function usePhotoUpload(service: DeliveryMediaService) {
  const [slots, setSlots] = useState<Record<string, PhotoSlot>>({})

  /**
   * Espejo síncrono del state. Necesario porque al confirmar la entrega hay que
   * leer las URLs recién resueltas, y el `slots` del closure todavía sería el
   * del render anterior.
   */
  const slotsRef = useRef<Record<string, PhotoSlot>>({})
  /** Subidas en vuelo, para poder esperarlas en `settle()`. */
  const pendingRef = useRef<Map<string, Promise<void>>>(new Map())
  const mountedRef = useRef(true)

  const writeSlot = useCallback((key: string, slot: PhotoSlot) => {
    slotsRef.current = { ...slotsRef.current, [key]: slot }
    if (mountedRef.current) {
      setSlots(slotsRef.current)
    }
  }, [])

  const getSlot = useCallback((key: string): PhotoSlot => {
    return slots[key] ?? EMPTY_SLOT
  }, [slots])

  /** Libera el preview de un slot y lo saca del registro. */
  const clear = useCallback((key: string) => {
    revokePreviewUrl(slotsRef.current[key]?.previewUrl)
    const next = { ...slotsRef.current }
    delete next[key]
    pendingRef.current.delete(key)
    slotsRef.current = next
    if (mountedRef.current) setSlots(next)
  }, [])

  /** Libera todos los previews. Se llama al abrir cada parada. */
  const reset = useCallback(() => {
    Object.values(slotsRef.current).forEach((slot) => revokePreviewUrl(slot.previewUrl))
    pendingRef.current.clear()
    slotsRef.current = {}
    if (mountedRef.current) setSlots({})
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      Object.values(slotsRef.current).forEach((slot) => revokePreviewUrl(slot.previewUrl))
    }
  }, [])

  /**
   * Valida, comprime, muestra el preview y sube, todo en background.
   *
   * La tarea se registra en `pendingRef` de forma SÍNCRONA, antes del primer
   * await: si no, una confirmación disparada durante la compresión no vería
   * nada pendiente y se guardaría la entrega descartando la foto.
   */
  const capture = useCallback(
    (key: string, file: File, kind: DeliveryMediaKind, ctx: DeliveryMediaContext): Promise<void> => {
      const task = (async () => {
        if (!isImageFile(file)) {
          writeSlot(key, { ...EMPTY_SLOT, status: "error", error: "Por favor selecciona una imagen válida" })
          return
        }
        // Tope defensivo sobre el ORIGINAL (anti-OOM al decodificar).
        if (file.size > MAX_SOURCE_FILE_BYTES) {
          writeSlot(key, {
            ...EMPTY_SLOT,
            status: "error",
            error: `La imagen es demasiado grande (${formatFileSize(file.size)}). Máximo 25MB.`,
          })
          return
        }

        // Reemplazo: liberar el preview anterior antes de pisarlo.
        revokePreviewUrl(slotsRef.current[key]?.previewUrl)
        writeSlot(key, { ...EMPTY_SLOT, status: "processing" })

        const compressed = await compressImage(file)
        const previewUrl = createPreviewUrl(compressed)

        writeSlot(key, { ...EMPTY_SLOT, status: "uploading", file: compressed, previewUrl })

        try {
          const { url, bucketMissing } = await service.upload(compressed, kind, ctx)
          // El slot pudo haberse limpiado o reemplazado mientras subía.
          if (slotsRef.current[key]?.previewUrl !== previewUrl) return

          writeSlot(key, {
            status: "ready",
            file: compressed,
            previewUrl,
            remoteUrl: url,
            bucketMissing,
            error: null,
          })
        } catch (err) {
          if (slotsRef.current[key]?.previewUrl !== previewUrl) return
          const message = err instanceof Error ? err.message : "Error al subir la imagen"
          console.error("[photo-upload] Falló la subida:", err)
          writeSlot(key, {
            status: "error",
            file: compressed,
            previewUrl,
            remoteUrl: null,
            bucketMissing: false,
            error: message,
          })
        }
      })()

      pendingRef.current.set(key, task)
      // Sólo se descarta a sí misma: si mientras tanto entró una captura nueva
      // para el mismo slot, la pendiente pasa a ser esa.
      void task.finally(() => {
        if (pendingRef.current.get(key) === task) {
          pendingRef.current.delete(key)
        }
      })

      return task
    },
    [service, writeSlot],
  )

  /**
   * Espera a que terminen todas las tareas en vuelo y devuelve el estado final
   * (leído de la ref, no del state, así no hay closures viejos).
   *
   * Itera porque una tarea puede encolar otra (ej. un retry), y se corta a las
   * 10 vueltas para no colgar la confirmación ante un bucle inesperado.
   */
  const settle = useCallback(async (): Promise<Record<string, PhotoSlot>> => {
    for (let i = 0; i < 10 && pendingRef.current.size > 0; i++) {
      await Promise.all(Array.from(pendingRef.current.values()))
    }
    return slotsRef.current
  }, [])

  /** Reintenta una subida fallida sin volver a pedir la foto. */
  const retry = useCallback(
    async (key: string, kind: DeliveryMediaKind, ctx: DeliveryMediaContext): Promise<void> => {
      const slot = slotsRef.current[key]
      if (!slot?.file) return
      await capture(key, slot.file, kind, ctx)
    },
    [capture],
  )

  return { slots, getSlot, capture, clear, reset, settle, retry }
}

export type PhotoUploadController = ReturnType<typeof usePhotoUpload>

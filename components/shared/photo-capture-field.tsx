"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PhotoSlot } from "@/hooks/use-photo-upload"

/**
 * Estado de la foto sobre el preview. La subida corre en background, así que
 * quien saca la foto tiene que ver si ya terminó — sin esto la pantalla parece
 * colgada y se toca el botón dos veces.
 */
export function PhotoStatusBadge({ slot }: { slot: PhotoSlot }) {
  const base = "px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"

  switch (slot.status) {
    case "processing":
      return <span className={`${base} bg-slate-500`}>Procesando…</span>
    case "uploading":
      return <span className={`${base} bg-blue-600 animate-pulse`}>Subiendo…</span>
    case "error":
      return <span className={`${base} bg-destructive`}>Error</span>
    case "ready":
      return slot.bucketMissing ? (
        <span className={`${base} bg-amber-500`}>Sin guardar</span>
      ) : (
        <span className={`${base} bg-green-500`}>✓ Guardada</span>
      )
    default:
      return null
  }
}

interface PhotoCaptureFieldProps {
  slot: PhotoSlot
  /** Quita la foto y cancela/descarta su subida. */
  onClear: () => void
  /**
   * El disparador de captura (un `<CameraCapture>`, un `<input capture>`, …).
   * Se muestra sólo mientras no hay foto: el "cómo se saca" cambia según el
   * caso, el "qué pasa después" es siempre lo mismo y vive acá.
   */
  children: ReactNode
  clearLabel?: string
  /** Clases del contenedor del preview (por ej. `max-w-[200px]` para achicarlo). */
  previewClassName?: string
  className?: string
}

/**
 * Preview + estado de subida + acción de reemplazo para una foto manejada por
 * `usePhotoUpload`. Concentra lo que estaba duplicado en cada punto de captura.
 */
export function PhotoCaptureField({
  slot,
  onClear,
  children,
  clearLabel = "Cambiar foto",
  previewClassName,
  className,
}: PhotoCaptureFieldProps) {
  if (!slot.previewUrl) {
    return (
      <div className={cn("space-y-2", className)}>
        {children}
        {slot.status === "error" && slot.error && (
          <p className="text-xs text-destructive text-center">{slot.error}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/*
        El ancho máximo va en el contenedor, no en la imagen: el badge se
        posiciona contra este div, así que si la imagen fuera más angosta que
        él quedaría flotando en el vacío al costado de la foto.
      */}
      <div className={cn("relative w-full max-w-xs mx-auto", previewClassName)}>
        <img
          src={slot.previewUrl}
          alt="Foto capturada"
          className="w-full rounded-lg border-2 border-green-500"
        />
        <div className="absolute top-2 right-2">
          <PhotoStatusBadge slot={slot} />
        </div>
      </div>

      {slot.error && <p className="text-xs text-destructive text-center">{slot.error}</p>}

      <Button type="button" variant="outline" size="sm" onClick={onClear} className="w-full text-xs">
        {clearLabel}
      </Button>
    </div>
  )
}

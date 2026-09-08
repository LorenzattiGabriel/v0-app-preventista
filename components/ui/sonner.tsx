"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * 🚨 Sin este componente montado en el layout, TODAS las llamadas a toast.*()
 * de la app son un no-op silencioso: se ejecutan y no muestran nada.
 * Había 13 archivos avisando éxito/error sin que se viera en pantalla.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      // La app se usa mucho en el celular con conexión mala: que el aviso dure
      // lo suficiente para leerlo.
      duration={6000}
      toastOptions={{
        classNames: {
          toast: "text-sm",
        },
      }}
      {...props}
    />
  )
}

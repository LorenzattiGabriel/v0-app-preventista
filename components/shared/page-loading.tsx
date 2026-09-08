import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

/**
 * Pantalla de carga que se muestra mientras Next resuelve una página.
 *
 * 🚨 Por qué existe: en el App Router, una ruta SIN loading.tsx bloquea la
 * navegación hasta que el servidor responde. La URL no cambia y la pantalla
 * queda igual, así que con conexión lenta el usuario toca el botón y "no pasa
 * nada" — y vuelve a tocarlo. De ahí salieron pagos y deudas duplicados.
 *
 * Con un loading.tsx la navegación es inmediata y esto se ve al toque.
 * El archivo cascadea a todas las rutas anidadas del segmento.
 */
export function PageLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-4 md:p-6 space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">Cargando…</p>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

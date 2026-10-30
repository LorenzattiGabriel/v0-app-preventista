"use client"

import { AlertTriangle, MapPin, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { RouteSegment } from "@/lib/types/rutas-inteligentes.types"

interface RouteMapViewProps {
  route: any
  orders: any[]
  // Depósito activo configurado en Configuración → Depósito (lat/lng reales
  // de la distribuidora). Se usa solo como último recurso: si la ruta ya
  // tiene un origen guardado en su URL, ese tiene prioridad para no
  // "mover" retroactivamente rutas viejas generadas con otro depósito.
  depot?: { lat: number; lng: number } | null
}

export function RouteMapView({ route, orders, depot }: RouteMapViewProps) {
  // 🆕 Verificar si la ruta está segmentada
  const isSegmented = route.optimized_route?.isSegmented === true
  const segments: RouteSegment[] = route.optimized_route?.segments || []

  // Extraer el origen del URL guardado para mantener la misma distribuidora
  // pero usar el orden actual de paradas. Si no hay URL guardada, usamos el
  // depósito activo configurado — nunca un punto fijo hardcodeado.
  function extractOrigin(url: string | null | undefined): { lat: number; lng: number } | null {
    if (!url) return null
    try {
      const u = new URL(url)
      const origin = u.searchParams.get("origin")
      if (!origin) return null
      const [latStr, lngStr] = origin.split(",")
      const lat = Number.parseFloat(latStr)
      const lng = Number.parseFloat(lngStr)
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    } catch {}
    return null
  }

  const resolvedDepot = extractOrigin(route.google_maps_url) || depot || null
  const depotLat = resolvedDepot?.lat ?? null
  const depotLng = resolvedDepot?.lng ?? null

  // Obtener coordenadas reales de los clientes (en el orden actual de delivery_order).
  // Si a un cliente le falta lat/lng, lo marcamos (hasCoords: false) en vez de
  // "inventarle" una ubicación — mostrarlo en el depósito sería engañoso.
  const locations = orders.map((routeOrder: any, index: number) => {
    const customer = routeOrder.orders?.customers
    const hasCoords = Boolean(customer?.latitude && customer?.longitude)
    return {
      order: routeOrder.orders,
      lat: hasCoords ? customer.latitude : depotLat,
      lng: hasCoords ? customer.longitude : depotLng,
      hasCoords,
      label: index + 1,
      name: customer?.commercial_name || customer?.name || `Cliente ${index + 1}`,
      address: customer?.street ? `${customer.street} ${customer.street_number || ''}` : 'Dirección no disponible'
    }
  })
  const locationsWithCoords = locations.filter((l) => l.hasCoords)
  const locationsMissingCoords = locations.filter((l) => !l.hasCoords)

  function buildGoogleMapsUrl(locs: typeof locations) {
    if (locs.length === 0 || depotLat === null || depotLng === null) return ''
    const waypoints = locs.map(loc => `${loc.lat},${loc.lng}`).join('|')
    return `https://www.google.com/maps/dir/?api=1&origin=${depotLat},${depotLng}&destination=${depotLat},${depotLng}&waypoints=${waypoints}`
  }

  // CRÍTICO: siempre recalcular el URL desde el delivery_order actual. NO usar
  // el `route.google_maps_url` guardado, porque ese se cachea con el orden
  // original del microservicio y queda desincronizado cuando el repartidor
  // reordena paradas (drag & drop / "Ir ahora") o cuando el orden inicial
  // difiere del optimizado.
  const googleMapsUrl = isSegmented ? null : buildGoogleMapsUrl(locations)

  // Construir URL para el iframe embed
  const buildEmbedUrl = () => {
    if (locations.length === 0 || depotLat === null || depotLng === null) return ''

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return ''
    const waypoints = locations.map(loc => `${loc.lat},${loc.lng}`).join('|')
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${depotLat},${depotLng}&destination=${depotLat},${depotLng}&waypoints=${waypoints}`
  }

  const embedUrl = buildEmbedUrl()

  return (
    <div className="space-y-4">
      {/* Sin depósito configurado: no inventamos un origen para el mapa */}
      {depotLat === null && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            No hay un depósito configurado y esta ruta no tiene un origen guardado. El mapa no puede mostrar el
            punto de partida — cargalo en Configuración → Depósito.
          </span>
        </div>
      )}

      {locationsMissingCoords.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {locationsMissingCoords.length} parada{locationsMissingCoords.length !== 1 ? "s" : ""} sin coordenadas
            cargadas en el cliente ({locationsMissingCoords.map((l) => l.name).join(", ")}). Se muestran en el
            depósito como referencia, no es su ubicación real.
          </span>
        </div>
      )}

      {/* Mapa Embebido de Google Maps */}
      {embedUrl && (
        <div className="relative w-full h-[400px] rounded-lg overflow-hidden border-2 border-blue-300 dark:border-blue-700">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa de la ruta"
          />
        </div>
      )}

      {/* Lista de Paradas con Coordenadas Reales */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Paradas de la Ruta
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {locations.map((loc, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-background rounded border">
              <div className={`flex-shrink-0 h-7 w-7 rounded-full text-white flex items-center justify-center font-bold text-sm ${loc.hasCoords ? "bg-blue-600" : "bg-amber-500"}`}>
                {loc.label}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{loc.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{loc.address}</p>
                {loc.hasCoords ? (
                  <p className="text-muted-foreground text-xs mt-1">
                    📍 {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Cliente sin coordenadas cargadas
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón para abrir en Google Maps */}
      {isSegmented && segments.length > 0 ? (
        /* 🆕 Ruta Segmentada: Múltiples botones */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-400">
              🔀 Ruta Segmentada
            </Badge>
            <span className="text-sm text-muted-foreground">
              {segments.length} tramos ({route.optimized_route?.totalWaypoints || orders.length} puntos)
            </span>
          </div>
          <div className="grid gap-2">
            {segments.map((segment, index) => (
              <Button 
                key={segment.id} 
                asChild 
                variant="outline" 
                className={`w-full justify-between ${
                  index === 0 
                    ? 'border-green-400 hover:bg-green-50 dark:hover:bg-green-950' 
                    : index === segments.length - 1
                      ? 'border-red-400 hover:bg-red-50 dark:hover:bg-red-950'
                      : 'border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                }`}
              >
                <a
                  href={segment.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {segment.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Puntos {segment.waypointRange.from}-{segment.waypointRange.to}
                  </span>
                </a>
              </Button>
            ))}
          </div>
        </div>
      ) : googleMapsUrl ? (
        <Button asChild variant="outline" className="w-full">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Ruta Completa en Google Maps
          </a>
        </Button>
      ) : null}

      {/* Estadísticas de la ruta */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">Distancia Total</p>
          <p className="text-lg font-bold">{route.total_distance?.toFixed(1) || 0} km</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Duración Est.</p>
          <p className="text-lg font-bold">{route.estimated_duration || 0} min</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paradas</p>
          <p className="text-lg font-bold">{orders.length}</p>
        </div>
      </div>
    </div>
  )
}

"use client"

import { MapPin } from "lucide-react"

interface RouteMapViewProps {
  route: any
  orders: any[]
}

export function RouteMapView({ route, orders }: RouteMapViewProps) {
  // Coordenadas mockeadas para Córdoba, Argentina
  // Centro de distribución (punto de partida)
  const centerLat = -31.4201
  const centerLng = -64.1888

  // Generar coordenadas mockeadas para cada parada cerca del centro
  const mockLocations = orders.map((routeOrder: any, index: number) => {
    // Usar los datos mockeados del optimized_route si existen
    if (route.optimized_route?.destinations?.[index]) {
      return {
        order: routeOrder.orders,
        lat: route.optimized_route.destinations[index].lat,
        lng: route.optimized_route.destinations[index].lng,
        label: index + 1,
      }
    }

    // Si no hay datos en optimized_route, generar coordenadas aleatorias cerca del centro
    const offsetLat = (Math.random() - 0.5) * 0.05 // ~5km de variación
    const offsetLng = (Math.random() - 0.5) * 0.05
    return {
      order: routeOrder.orders,
      lat: centerLat + offsetLat,
      lng: centerLng + offsetLng,
      label: index + 1,
    }
  })

  // Construir URL de Google Maps Static API con marcadores
  const buildStaticMapUrl = () => {
    const baseUrl = "https://maps.googleapis.com/maps/api/staticmap"
    const params = new URLSearchParams({
      center: `${centerLat},${centerLng}`,
      zoom: "13",
      size: "600x400",
      maptype: "roadmap",
      // Si no tienes API key, el mapa mostrará una marca de agua pero funcionará
      key: "YOUR_GOOGLE_MAPS_API_KEY", // Reemplazar con tu API key real
    })

    // Agregar marcador del centro de distribución (verde)
    params.append("markers", `color:green|label:D|${centerLat},${centerLng}`)

    // Agregar marcadores de paradas (numerados)
    mockLocations.forEach((loc) => {
      const color = loc.order.status === "ENTREGADO" ? "blue" : "red"
      params.append("markers", `color:${color}|label:${loc.label}|${loc.lat},${loc.lng}`)
    })

    return `${baseUrl}?${params.toString()}`
  }

  // URL para abrir en Google Maps con todas las paradas
  const buildGoogleMapsUrl = () => {
    const destinations = mockLocations.map((loc) => `${loc.lat},${loc.lng}`).join("/")
    return `https://www.google.com/maps/dir/${centerLat},${centerLng}/${destinations}`
  }

  return (
    <div className="space-y-4">
      {/* Mapa Visual Simulado con CSS */}
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border bg-gradient-to-br from-blue-50 to-green-50">
        {/* SVG Mapa Base */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 600 400"
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%)" }}
        >
          {/* Calles simuladas */}
          <line x1="0" y1="100" x2="600" y2="100" stroke="#cbd5e1" strokeWidth="2" opacity="0.5" />
          <line x1="0" y1="200" x2="600" y2="200" stroke="#cbd5e1" strokeWidth="3" opacity="0.6" />
          <line x1="0" y1="300" x2="600" y2="300" stroke="#cbd5e1" strokeWidth="2" opacity="0.5" />
          <line x1="150" y1="0" x2="150" y2="400" stroke="#cbd5e1" strokeWidth="2" opacity="0.5" />
          <line x1="300" y1="0" x2="300" y2="400" stroke="#cbd5e1" strokeWidth="3" opacity="0.6" />
          <line x1="450" y1="0" x2="450" y2="400" stroke="#cbd5e1" strokeWidth="2" opacity="0.5" />

          {/* Centro de distribución (punto verde) */}
          <circle cx="300" cy="200" r="12" fill="#10b981" stroke="white" strokeWidth="3" />
          <text x="300" y="205" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
            D
          </text>

          {/* Línea de ruta conectando todas las paradas */}
          {mockLocations.map((loc, index) => {
            if (index === 0) return null
            const prevLoc = mockLocations[index - 1]
            const x1 = ((prevLoc.lng - centerLng + 0.025) / 0.05) * 600
            const y1 = ((centerLat - prevLoc.lat + 0.025) / 0.05) * 400
            const x2 = ((loc.lng - centerLng + 0.025) / 0.05) * 600
            const y2 = ((centerLat - loc.lat + 0.025) / 0.05) * 400
            return (
              <line
                key={`line-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            )
          })}

          {/* Línea desde centro a primera parada */}
          {mockLocations.length > 0 && (
            <line
              x1="300"
              y1="200"
              x2={((mockLocations[0].lng - centerLng + 0.025) / 0.05) * 600}
              y2={((centerLat - mockLocations[0].lat + 0.025) / 0.05) * 400}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
            />
          )}

          {/* Marcadores de paradas */}
          {mockLocations.map((loc, index) => {
            // Convertir coordenadas a píxeles (normalizar al rango del SVG)
            const x = ((loc.lng - centerLng + 0.025) / 0.05) * 600
            const y = ((centerLat - loc.lat + 0.025) / 0.05) * 400

            const isDelivered = loc.order.status === "ENTREGADO"
            const color = isDelivered ? "#3b82f6" : "#ef4444"

            return (
              <g key={index}>
                {/* Pin marker */}
                <circle cx={x} cy={y} r="18" fill={color} opacity="0.2" />
                <circle cx={x} cy={y} r="14" fill={color} stroke="white" strokeWidth="2" />
                <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                  {loc.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Overlay con leyenda */}
        <div className="absolute top-2 left-2 right-2 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border">
          <p className="text-xs font-medium text-foreground flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            Mapa de Ruta - Córdoba, Argentina
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span>Centro Distribución</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span>Pendiente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span>Entregado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa Estático Alternativo (sin necesidad de API key activa) */}
      <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed">
        <p className="text-sm font-medium mb-2">Visualización Alternativa:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {mockLocations.map((loc, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-background rounded">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                {loc.label}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{loc.order.customers.commercial_name}</p>
                <p className="text-muted-foreground">
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2">
        <a
          href={buildGoogleMapsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
        >
          <MapPin className="mr-2 h-4 w-4" />
          Abrir en Google Maps
        </a>
      </div>

      {/* Información adicional */}
      <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="font-medium text-blue-900">💡 Nota sobre el Mapa:</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>Las coordenadas son <strong>mockeadas</strong> para demostración</li>
          <li>El mapa muestra ubicaciones aproximadas en Córdoba, Argentina</li>
          <li>Para producción, reemplazar con coordenadas reales del cliente</li>
          <li>Configurar Google Maps API key en las variables de entorno</li>
        </ul>
      </div>

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


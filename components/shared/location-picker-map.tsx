"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useGoogleMapsScript } from "@/lib/hooks/useGoogleMapsScript"
import { Button } from "@/components/ui/button"
import { MapPin, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"

interface LocationPickerMapProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number) => void
  height?: string
  defaultZoom?: number
}

export function LocationPickerMap({
  latitude,
  longitude,
  onLocationChange,
  height = "300px",
  defaultZoom = 17,
}: LocationPickerMapProps) {
  const isGoogleMapsLoaded = useGoogleMapsScript()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [initialPosition, setInitialPosition] = useState<{ lat: number; lng: number } | null>(null)

  // Default center (Córdoba, Argentina) if no coordinates
  const defaultCenter = { lat: -31.4201, lng: -64.1888 }
  
  const currentCenter = latitude && longitude 
    ? { lat: latitude, lng: longitude } 
    : defaultCenter

  // Initialize map
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current || mapInstanceRef.current) return

    const map = new google.maps.Map(mapRef.current, {
      center: currentCenter,
      zoom: latitude && longitude ? defaultZoom : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false, // We'll add custom controls
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    })

    mapInstanceRef.current = map

    // Create draggable marker
    const marker = new google.maps.Marker({
      position: currentCenter,
      map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    })

    markerRef.current = marker

    // Store initial position for reset
    if (latitude && longitude) {
      setInitialPosition({ lat: latitude, lng: longitude })
    }

    // Marker drag events
    marker.addListener("dragstart", () => {
      setIsDragging(true)
    })

    marker.addListener("dragend", () => {
      setIsDragging(false)
      const position = marker.getPosition()
      if (position) {
        onLocationChange(position.lat(), position.lng())
      }
    })

    // Click on map to move marker
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng)
        onLocationChange(e.latLng.lat(), e.latLng.lng())
      }
    })

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
    }
  }, [isGoogleMapsLoaded])

  // Update marker position when coordinates change externally
  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return
    if (latitude === null || longitude === null) return

    const newPosition = { lat: latitude, lng: longitude }
    markerRef.current.setPosition(newPosition)
    mapInstanceRef.current.panTo(newPosition)
    
    // Store as initial position if not set
    if (!initialPosition) {
      setInitialPosition(newPosition)
    }
  }, [latitude, longitude])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || defaultZoom
      mapInstanceRef.current.setZoom(currentZoom + 1)
    }
  }, [defaultZoom])

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || defaultZoom
      mapInstanceRef.current.setZoom(currentZoom - 1)
    }
  }, [defaultZoom])

  // Reset to initial position
  const handleReset = useCallback(() => {
    if (!markerRef.current || !mapInstanceRef.current || !initialPosition) return
    
    markerRef.current.setPosition(initialPosition)
    mapInstanceRef.current.panTo(initialPosition)
    mapInstanceRef.current.setZoom(defaultZoom)
    onLocationChange(initialPosition.lat, initialPosition.lng)
  }, [initialPosition, defaultZoom, onLocationChange])

  // Center on marker
  const handleCenterOnMarker = useCallback(() => {
    if (!markerRef.current || !mapInstanceRef.current) return
    
    const position = markerRef.current.getPosition()
    if (position) {
      mapInstanceRef.current.panTo(position)
    }
  }, [])

  if (!isGoogleMapsLoaded) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg border-2 border-dashed"
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Cargando mapa...</p>
        </div>
      </div>
    )
  }

  const hasCoordinates = latitude !== null && longitude !== null

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden border">
        {/* Map container */}
        <div ref={mapRef} style={{ height, width: "100%" }} />

        {/* Overlay when dragging */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none bg-blue-500/10 border-4 border-blue-500 rounded-lg">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Arrastrando...
            </div>
          </div>
        )}

        {/* No coordinates overlay */}
        {!hasCoordinates && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center p-4">
              <MapPin className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Sin ubicación</p>
              <p className="text-xs text-muted-foreground">
                Busca una dirección o usa tu ubicación para ver el mapa
              </p>
            </div>
          </div>
        )}

        {/* Map controls */}
        {hasCoordinates && (
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background shadow-md"
              onClick={handleZoomIn}
              title="Acercar"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background shadow-md"
              onClick={handleZoomOut}
              title="Alejar"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background shadow-md"
              onClick={handleCenterOnMarker}
              title="Centrar en marcador"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            {initialPosition && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background shadow-md"
                onClick={handleReset}
                title="Restaurar posición"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      {hasCoordinates && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span>
            <strong>Ajusta la ubicación exacta:</strong> Arrastra el pin rojo o haz clic en el mapa para mover la ubicación
          </span>
        </div>
      )}
    </div>
  )
}


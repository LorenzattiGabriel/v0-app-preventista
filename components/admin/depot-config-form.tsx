"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { GeocodingService } from "@/lib/services/geocodingService"

interface DepotConfigFormProps {
  depot: any | null
  userId: string
}


export function DepotConfigForm({ depot, userId }: DepotConfigFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: depot?.name || "Distribuidora Principal",
    street: depot?.street || "",
    streetNumber: depot?.street_number || "",
    floorApt: depot?.floor_apt || "",
    locality: depot?.locality || "",
    province: depot?.province || "",
    postalCode: depot?.postal_code || "",
    radiusMeters: depot?.radius_meters || 200,
  })

  const [coordinates, setCoordinates] = useState<{
    latitude: number | null
    longitude: number | null
    formattedAddress: string | null
  }>({
    latitude: depot?.latitude || null,
    longitude: depot?.longitude || null,
    formattedAddress: null,
  })

  const handleGeocode = async () => {
    if (!formData.street || !formData.streetNumber || !formData.locality || !formData.province) {
      setError("Por favor completa al menos: Calle, Número, Localidad y Provincia")
      return
    }

    setIsGeocoding(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await GeocodingService.geocodeAddress({
        street: formData.street,
        streetNumber: formData.streetNumber,
        locality: formData.locality,
        province: formData.province,
        country: "Argentina",
      })

      if (result) {
        setCoordinates({
          latitude: result.latitude,
          longitude: result.longitude,
          formattedAddress: result.formattedAddress,
        })
        setSuccess("✅ Coordenadas encontradas exitosamente")
      } else {
        setError("No se pudieron encontrar las coordenadas. Verifica la dirección.")
      }
    } catch (err) {
      setError("Error al geocodificar la dirección. Intenta nuevamente.")
      console.error("Geocoding error:", err)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!coordinates.latitude || !coordinates.longitude) {
      setError("Primero debes buscar las coordenadas haciendo click en 'Buscar Coordenadas'")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Deactivate current depot if exists
      if (depot) {
        await supabase
          .from("depot_configuration")
          .update({ is_active: false })
          .eq("id", depot.id)
      }

      // Insert new depot configuration
      const { error: insertError } = await supabase
        .from("depot_configuration")
        .insert({
          name: formData.name,
          street: formData.street,
          street_number: formData.streetNumber,
          floor_apt: formData.floorApt || null,
          locality: formData.locality,
          province: formData.province,
          postal_code: formData.postalCode || null,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radius_meters: formData.radiusMeters,
          is_active: true,
          created_by: userId,
        })

      if (insertError) throw insertError

      setSuccess("✅ Configuración guardada exitosamente")
      
      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error("Error saving depot configuration:", err)
      setError(err instanceof Error ? err.message : "Error al guardar la configuración")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 p-4 rounded-md flex items-start gap-2 border border-green-200">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="name">Nombre de la Distribuidora</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Distribuidora Central"
            required
          />
        </div>

        <div>
          <Label htmlFor="street">Calle *</Label>
          <Input
            id="street"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            placeholder="Ej: Av. Colón"
            required
          />
        </div>

        <div>
          <Label htmlFor="streetNumber">Número *</Label>
          <Input
            id="streetNumber"
            value={formData.streetNumber}
            onChange={(e) => setFormData({ ...formData, streetNumber: e.target.value })}
            placeholder="Ej: 123"
            required
          />
        </div>

        <div>
          <Label htmlFor="floorApt">Piso/Dpto (opcional)</Label>
          <Input
            id="floorApt"
            value={formData.floorApt}
            onChange={(e) => setFormData({ ...formData, floorApt: e.target.value })}
            placeholder="Ej: 5º B"
          />
        </div>

        <div>
          <Label htmlFor="postalCode">Código Postal</Label>
          <Input
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            placeholder="Ej: X5000"
          />
        </div>

        <div>
          <Label htmlFor="locality">Localidad *</Label>
          <Input
            id="locality"
            value={formData.locality}
            onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
            placeholder="Ej: Córdoba"
            required
          />
        </div>

        <div>
          <Label htmlFor="province">Provincia *</Label>
          <Input
            id="province"
            value={formData.province}
            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            placeholder="Ej: Córdoba"
            required
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="radiusMeters">Radio de Tolerancia (metros)</Label>
          <Input
            id="radiusMeters"
            type="number"
            value={formData.radiusMeters}
            onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value) })}
            min={50}
            max={500}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Los repartidores deben estar dentro de este radio para iniciar/finalizar rutas
          </p>
        </div>
      </div>

      {/* Geocode Button */}
      <div className="flex flex-col gap-3 pt-4 border-t">
        <Button
          type="button"
          onClick={handleGeocode}
          disabled={isGeocoding || !formData.street || !formData.locality}
          variant="outline"
          className="w-full"
        >
          {isGeocoding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando coordenadas...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Buscar Coordenadas Automáticamente
            </>
          )}
        </Button>

        {/* Coordinates Display */}
        {coordinates.latitude && coordinates.longitude && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  Coordenadas encontradas:
                </p>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-green-700 dark:text-green-300 font-medium">Latitud:</span>
                    <span className="ml-2 font-mono text-green-900 dark:text-green-100">
                      {coordinates.latitude.toFixed(6)}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700 dark:text-green-300 font-medium">Longitud:</span>
                    <span className="ml-2 font-mono text-green-900 dark:text-green-100">
                      {coordinates.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
                {coordinates.formattedAddress && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    {coordinates.formattedAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !coordinates.latitude || !coordinates.longitude}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Configuración"
          )}
        </Button>
      </div>
    </form>
  )
}


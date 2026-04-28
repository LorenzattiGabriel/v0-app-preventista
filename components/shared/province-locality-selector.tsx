"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Provincia {
  id: string
  nombre: string
}

interface Localidad {
  id: string
  nombre: string
  centroide: { lat: number; lon: number }
}

const GEOREF_BASE = "https://apis.datos.gob.ar/georef/api"

let cachedProvincias: Provincia[] | null = null
const localidadesCache = new Map<string, Localidad[]>()

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

function matchProvincia(provinceName: string, provincias: Provincia[]): Provincia | undefined {
  if (!provinceName) return undefined
  const norm = normalizeText(provinceName)
  return provincias.find((p) => {
    const pn = normalizeText(p.nombre)
    return pn === norm || norm.includes(pn) || pn.includes(norm)
  })
}

export interface ProvinceLocalitySelectorProps {
  province: string
  locality: string
  postalCode: string
  onProvinceChange: (province: string) => void
  onLocalityChange: (locality: string) => void
  onPostalCodeChange: (postalCode: string) => void
  isGoogleMapsLoaded?: boolean
}

export function ProvinceLocalitySelector({
  province,
  locality,
  postalCode,
  onProvinceChange,
  onLocalityChange,
  onPostalCodeChange,
  isGoogleMapsLoaded,
}: ProvinceLocalitySelectorProps) {
  const [provincias, setProvincias] = useState<Provincia[]>(cachedProvincias ?? [])
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [isLoadingProvincias, setIsLoadingProvincias] = useState(!cachedProvincias)
  const [isLoadingLocalidades, setIsLoadingLocalidades] = useState(false)
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<string>("")
  const [localidadOpen, setLocalidadOpen] = useState(false)
  const [isFetchingPostal, setIsFetchingPostal] = useState(false)

  useEffect(() => {
    if (cachedProvincias) {
      setProvincias(cachedProvincias)
      setIsLoadingProvincias(false)
      return
    }
    setIsLoadingProvincias(true)
    fetch(`${GEOREF_BASE}/provincias?max=30&campos=id,nombre`)
      .then((r) => r.json())
      .then((data) => {
        const sorted = [...(data.provincias as Provincia[])].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es")
        )
        cachedProvincias = sorted
        setProvincias(sorted)
      })
      .catch(console.error)
      .finally(() => setIsLoadingProvincias(false))
  }, [])

  // Sync when province is set externally (e.g. Google Places autocomplete)
  useEffect(() => {
    if (!province || !provincias.length) return
    const match = matchProvincia(province, provincias)
    if (match && match.id !== selectedProvinciaId) {
      setSelectedProvinciaId(match.id)
      loadLocalidades(match.id)
    }
  }, [province, provincias])

  const loadLocalidades = (provinciaId: string) => {
    if (localidadesCache.has(provinciaId)) {
      setLocalidades(localidadesCache.get(provinciaId)!)
      return
    }
    setIsLoadingLocalidades(true)
    // Fetch centroide so we can reverse-geocode for the postal code
    fetch(
      `${GEOREF_BASE}/localidades?provincia=${provinciaId}&max=1000&campos=id,nombre,centroide.lat,centroide.lon&orden=nombre`
    )
      .then((r) => r.json())
      .then((data) => {
        const sorted = [...(data.localidades as Localidad[])].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es")
        )
        localidadesCache.set(provinciaId, sorted)
        setLocalidades(sorted)
      })
      .catch(console.error)
      .finally(() => setIsLoadingLocalidades(false))
  }

  const handleProvinciaChange = (provinciaId: string) => {
    setSelectedProvinciaId(provinciaId)
    const prov = provincias.find((p) => p.id === provinciaId)
    if (prov) {
      onProvinceChange(prov.nombre)
      onLocalityChange("")
      onPostalCodeChange("")
      loadLocalidades(provinciaId)
    }
  }

  const handleLocalidadSelect = (localidadNombre: string) => {
    onLocalityChange(localidadNombre)
    setLocalidadOpen(false)

    if (!isGoogleMapsLoaded || !window.google) return

    // Find the selected localidad to get its centroid coordinates
    const localidad = localidades.find((l) => l.nombre === localidadNombre)
    if (!localidad?.centroide) return

    // Reverse geocode using the centroid — returns postal_code reliably
    setIsFetchingPostal(true)
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode(
      { location: { lat: localidad.centroide.lat, lng: localidad.centroide.lon } },
      (results, status) => {
        setIsFetchingPostal(false)
        if (status === "OK" && results) {
          // Search all results for a postal_code component (most specific first)
          for (const result of results) {
            const postalComponent = result.address_components.find((c) =>
              c.types.includes("postal_code")
            )
            if (postalComponent) {
              onPostalCodeChange(postalComponent.long_name)
              return
            }
          }
        }
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Provincia */}
        <div className="space-y-2">
          <Label htmlFor="province-select">
            Provincia <span className="text-destructive">*</span>
          </Label>
          {isLoadingProvincias ? (
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cargando provincias...</span>
            </div>
          ) : (
            <Select value={selectedProvinciaId} onValueChange={handleProvinciaChange}>
              <SelectTrigger id="province-select">
                <SelectValue placeholder="Seleccionar provincia" />
              </SelectTrigger>
              <SelectContent>
                {provincias.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Localidad */}
        <div className="space-y-2">
          <Label>
            Localidad <span className="text-destructive">*</span>
          </Label>
          <Popover open={localidadOpen} onOpenChange={setLocalidadOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={localidadOpen}
                disabled={!selectedProvinciaId || isLoadingLocalidades}
                className="w-full justify-between font-normal h-10"
              >
                {isLoadingLocalidades ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando localidades...
                  </span>
                ) : locality ? (
                  <span className="truncate">{locality}</span>
                ) : (
                  <span className="text-muted-foreground">
                    {selectedProvinciaId ? "Seleccionar localidad" : "Primero elegí una provincia"}
                  </span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar localidad..." />
                <CommandList>
                  <CommandEmpty>No se encontró la localidad.</CommandEmpty>
                  <CommandGroup>
                    {localidades.map((loc) => (
                      <CommandItem
                        key={loc.id}
                        value={loc.nombre}
                        onSelect={handleLocalidadSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            locality === loc.nombre ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {loc.nombre}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Código Postal */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postalCode" className="flex items-center gap-2">
            Código Postal
            {isFetchingPostal && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </Label>
          <Input
            id="postalCode"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            placeholder={isFetchingPostal ? "Buscando CP..." : "Se completa automáticamente"}
            className={isFetchingPostal ? "animate-pulse" : ""}
          />
          <p className="text-xs text-muted-foreground">
            Se completa al seleccionar la localidad. Podés editarlo si hace falta.
          </p>
        </div>
      </div>
    </div>
  )
}

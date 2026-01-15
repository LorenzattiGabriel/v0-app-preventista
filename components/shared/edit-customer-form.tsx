"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { Zone, CustomerType, IvaCondition, CustomerPriority, Customer } from "@/lib/types/database"
import { ArrowLeft, MapPin, Loader2, Save, CheckCircle } from "lucide-react"
import { useGoogleMapsScript } from "@/lib/hooks/useGoogleMapsScript"
import { LocationPickerMap } from "@/components/shared/location-picker-map"

interface EditCustomerFormProps {
  customer: Customer
  zones: Zone[]
  returnUrl?: string
}

export function EditCustomerForm({ customer, zones, returnUrl }: EditCustomerFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const isGoogleMapsLoaded = useGoogleMapsScript()

  // Form state - initialized from customer
  const [commercialName, setCommercialName] = useState(customer.commercial_name || "")
  const [contactName, setContactName] = useState(customer.contact_name || "")
  const [phone, setPhone] = useState(customer.phone || "")
  const [email, setEmail] = useState(customer.email || "")
  const [street, setStreet] = useState(customer.street || "")
  const [streetNumber, setStreetNumber] = useState(customer.street_number || "")
  const [floorApt, setFloorApt] = useState(customer.floor_apt || "")
  const [locality, setLocality] = useState(customer.locality || "")
  const [province, setProvince] = useState(customer.province || "")
  const [postalCode, setPostalCode] = useState(customer.postal_code || "")
  const [legalName, setLegalName] = useState(customer.legal_name || "")
  const [taxId, setTaxId] = useState(customer.tax_id || "")
  const [customerType, setCustomerType] = useState<CustomerType>(customer.customer_type || "minorista")
  const [priority, setPriority] = useState<CustomerPriority>(customer.priority || "normal")
  const [ivaCondition, setIvaCondition] = useState<IvaCondition>(customer.iva_condition || "consumidor_final")
  const [creditDays, setCreditDays] = useState(customer.credit_days || 0)
  const [creditLimit, setCreditLimit] = useState(customer.credit_limit || 0)
  const [generalDiscount, setGeneralDiscount] = useState(customer.general_discount || 0)
  const [zoneId, setZoneId] = useState(customer.zone_id || "")
  const [observations, setObservations] = useState(customer.observations || "")
  const [latitude, setLatitude] = useState<number | null>(customer.latitude || null)
  const [longitude, setLongitude] = useState<number | null>(customer.longitude || null)
  const [isActive, setIsActive] = useState(customer.is_active !== false)
  
  // Time Windows (VRPTW)
  const [hasTimeRestriction, setHasTimeRestriction] = useState(customer.has_time_restriction || false)
  const [deliveryWindowStart, setDeliveryWindowStart] = useState(customer.delivery_window_start || "08:00")
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState(customer.delivery_window_end || "18:00")
  const [timeRestrictionNotes, setTimeRestrictionNotes] = useState(customer.time_restriction_notes || "")
  
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [addressSearchValue, setAddressSearchValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [predictions, setPredictions] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteService = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placesService = useRef<any>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  // Initialize Google Places services
  useEffect(() => {
    if (isGoogleMapsLoaded && window.google) {
      autocompleteService.current = new google.maps.places.AutocompleteService()
      const mapDiv = document.createElement('div')
      placesService.current = new google.maps.places.PlacesService(mapDiv)
    }
  }, [isGoogleMapsLoaded])

  // Search for address predictions
  const searchAddresses = (input: string) => {
    if (!autocompleteService.current || !input) {
      setPredictions([])
      return
    }

    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "ar" },
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPredictions(predictions)
        } else {
          setPredictions([])
        }
      }
    )
  }

  const handleAddressSearchChange = (value: string) => {
    setAddressSearchValue(value)
    setShowSuggestions(true)
    if (value.length > 2) {
      searchAddresses(value)
    } else {
      setPredictions([])
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectPlace = (prediction: any) => {
    setAddressSearchValue(prediction.description)
    setShowSuggestions(false)
    setPredictions([])

    if (!placesService.current) return

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'geometry'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const lat = place.geometry?.location?.lat()
          const lng = place.geometry?.location?.lng()
          
          if (lat !== undefined && lng !== undefined) {
            setLatitude(lat)
            setLongitude(lng)
          }

          const addressComponents = place.address_components || []
          let streetName = ""
          let streetNum = ""
          let loc = ""
          let prov = ""
          let postal = ""

          for (const component of addressComponents) {
            const types = component.types
            if (types.includes("route")) {
              streetName = component.long_name
            } else if (types.includes("street_number")) {
              streetNum = component.long_name
            } else if (types.includes("locality") || types.includes("administrative_area_level_2")) {
              loc = component.long_name
            } else if (types.includes("administrative_area_level_1")) {
              prov = component.long_name
            } else if (types.includes("postal_code")) {
              postal = component.long_name
            }
          }

          if (streetName) setStreet(streetName)
          if (streetNum) setStreetNumber(streetNum)
          if (loc) setLocality(loc)
          if (prov) setProvince(prov)
          if (postal) setPostalCode(postal)
        }
      }
    )
  }

  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    setError(null)

    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización")
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setLatitude(lat)
        setLongitude(lng)
        setIsGettingLocation(false)

        // Reverse geocoding
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const addressComponents = results[0].address_components
            
            let streetName = ""
            let streetNum = ""
            let loc = ""
            let prov = ""
            let postal = ""

            for (const component of addressComponents) {
              const types = component.types
              if (types.includes("route")) {
                streetName = component.long_name
              } else if (types.includes("street_number")) {
                streetNum = component.long_name
              } else if (types.includes("locality") || types.includes("administrative_area_level_2")) {
                loc = component.long_name
              } else if (types.includes("administrative_area_level_1")) {
                prov = component.long_name
              } else if (types.includes("postal_code")) {
                postal = component.long_name
              }
            }

            if (streetName) setStreet(streetName)
            if (streetNum) setStreetNumber(streetNum)
            if (loc) setLocality(loc)
            if (prov) setProvince(prov)
            if (postal) setPostalCode(postal)
          }
        })
      },
      (error) => {
        console.error("Error getting location:", error)
        setError("No se pudo obtener la ubicación. Verifica los permisos del navegador.")
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    // Validate required fields
    const missingFields: string[] = []
    if (!commercialName.trim()) missingFields.push("Nombre Comercial")
    if (!contactName.trim()) missingFields.push("Nombre de Contacto")
    if (!phone.trim()) missingFields.push("Teléfono")
    if (!street.trim()) missingFields.push("Calle")
    if (!streetNumber.trim()) missingFields.push("Número")
    if (!locality.trim()) missingFields.push("Localidad")
    if (!province.trim()) missingFields.push("Provincia")

    if (missingFields.length > 0) {
      setError(`Campos requeridos faltantes: ${missingFields.join(", ")}`)
      setIsLoading(false)
      return
    }

    try {
      let lat = latitude
      let lng = longitude

      // Geocode if coordinates are missing
      if (street && streetNumber && locality && province && (latitude === null || longitude === null)) {
        const fullAddress = `${street} ${streetNumber}, ${locality}, ${province}`

        const geocodePromise = new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const location = results[0].geometry.location
              resolve({ lat: location.lat(), lng: location.lng() })
            } else {
              reject(new Error(`Geocoding failed: ${status}`))
            }
          })
        })

        try {
          const coords = await geocodePromise
          lat = coords.lat
          lng = coords.lng
        } catch (geocodeError) {
          console.warn("Geocoding failed, saving customer without coordinates.", geocodeError)
        }
      }

      const supabase = createClient()

      // Update customer
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          commercial_name: commercialName,
          contact_name: contactName,
          phone,
          email: email || null,
          street,
          street_number: streetNumber,
          floor_apt: floorApt || null,
          locality,
          province,
          postal_code: postalCode || null,
          latitude: lat,
          longitude: lng,
          legal_name: legalName || null,
          tax_id: taxId || null,
          customer_type: customerType,
          priority: priority,
          iva_condition: ivaCondition,
          credit_days: creditDays,
          credit_limit: creditLimit,
          general_discount: generalDiscount,
          zone_id: zoneId || null,
          observations: observations || null,
          is_active: isActive,
          // Time Windows (VRPTW)
          has_time_restriction: hasTimeRestriction,
          delivery_window_start: hasTimeRestriction ? deliveryWindowStart : null,
          delivery_window_end: hasTimeRestriction ? deliveryWindowEnd : null,
          time_restriction_notes: hasTimeRestriction ? timeRestrictionNotes : null,
        })
        .eq("id", customer.id)

      if (updateError) {
        console.error("[v0] Customer update error:", updateError)
        throw new Error(updateError.message || "Error al actualizar cliente")
      }

      setSuccess(true)
      
      // Redirect after short delay
      setTimeout(() => {
        if (returnUrl) {
          router.push(returnUrl)
        } else {
          router.back()
        }
        router.refresh()
      }, 1500)
    } catch (err: unknown) {
      console.error("[v0] Error updating customer:", err)
      let errorMessage = err instanceof Error ? err.message : "Error al actualizar el cliente"
      
      // Translate common DB errors
      if (errorMessage.includes("duplicate key")) {
        if (errorMessage.includes("tax_id")) {
          errorMessage = "Ya existe un cliente con ese CUIT/CUIL."
        } else {
          errorMessage = "Ya existe un cliente con esos datos."
        }
      } else if (errorMessage.includes("violates not-null constraint")) {
        const match = errorMessage.match(/column "(\w+)"/)
        const field = match ? match[1] : "desconocido"
        const fieldNames: Record<string, string> = {
          commercial_name: "Nombre Comercial",
          contact_name: "Nombre de Contacto", 
          phone: "Teléfono",
          street: "Calle",
          street_number: "Número",
          locality: "Localidad",
          province: "Provincia"
        }
        errorMessage = `El campo "${fieldNames[field] || field}" es requerido.`
      } else if (errorMessage.includes("permission denied") || errorMessage.includes("RLS")) {
        errorMessage = "No tienes permisos para editar clientes. Verifica tu sesión."
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" type="button" onClick={() => router.back()}>          
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="text-sm text-muted-foreground">
          Código: <span className="font-mono font-semibold">{customer.code}</span>
        </div>
      </div>

      {error && (
        <div ref={errorRef} className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Error al guardar</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-4 rounded-md border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <p className="font-semibold">¡Cliente actualizado correctamente!</p>
          </div>
        </div>
      )}

      {/* Status Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isActive" className="font-medium">Cliente Activo</Label>
              <p className="text-sm text-muted-foreground">
                Los clientes inactivos no aparecerán en las búsquedas
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
          <CardDescription>Datos principales del cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commercialName">
                Nombre Comercial <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commercialName"
                required
                value={commercialName}
                onChange={(e) => setCommercialName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">
                Nombre de Contacto <span className="text-destructive">*</span>
              </Label>
              <Input id="contactName" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Teléfono <span className="text-destructive">*</span>
              </Label>
              <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerType">
                Tipo de Cliente <span className="text-destructive">*</span>
              </Label>
              <Select value={customerType} onValueChange={(value) => setCustomerType(value as CustomerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minorista">Minorista</SelectItem>
                  <SelectItem value="mayorista">Mayorista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as CustomerPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">🟢 Baja</SelectItem>
                  <SelectItem value="normal">🟡 Normal</SelectItem>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ivaCondition">Condición IVA</Label>
              <Select value={ivaCondition} onValueChange={(value) => setIvaCondition(value as IvaCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                  <SelectItem value="responsable_inscripto">Responsable Inscripto</SelectItem>
                  <SelectItem value="monotributista">Monotributista</SelectItem>
                  <SelectItem value="exento">Exento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dirección</CardTitle>
          <CardDescription>Ubicación del cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Places Search */}
          <div className="space-y-2">
            <Label htmlFor="addressSearch">Buscar Nueva Dirección</Label>
            <div className="flex gap-2">
              <div className="relative flex-1" ref={searchBoxRef}>
                <Input
                  id="addressSearch"
                  placeholder="Escribe una dirección para buscar..."
                  value={addressSearchValue}
                  onChange={(e) => handleAddressSearchChange(e.target.value)}
                  disabled={!isGoogleMapsLoaded}
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && predictions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {predictions.map((prediction) => (
                      <button
                        key={prediction.place_id}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                        onClick={() => handleSelectPlace(prediction)}
                      >
                        <div className="text-sm">{prediction.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={isGettingLocation || !isGoogleMapsLoaded}
                className="shrink-0"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Obteniendo...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Usar mi ubicación
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Busca una nueva dirección o usa tu ubicación actual para actualizar los datos.
            </p>
          </div>

          {/* Mapa con pin arrastrable para ajustar ubicación */}
          <LocationPickerMap
            latitude={latitude}
            longitude={longitude}
            onLocationChange={(lat, lng) => {
              setLatitude(lat)
              setLongitude(lng)
            }}
          />
          
          {/* Coordenadas actuales */}
          {(latitude !== null && longitude !== null) && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                <strong>Coordenadas:</strong> {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="street">
                Calle <span className="text-destructive">*</span>
              </Label>
              <Input id="street" required value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="streetNumber">
                Número <span className="text-destructive">*</span>
              </Label>
              <Input
                id="streetNumber"
                required
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="floorApt">Piso/Depto</Label>
              <Input id="floorApt" value={floorApt} onChange={(e) => setFloorApt(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locality">
                Localidad <span className="text-destructive">*</span>
              </Label>
              <Input id="locality" required value={locality} onChange={(e) => setLocality(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">
                Provincia <span className="text-destructive">*</span>
              </Label>
              <Input id="province" required value={province} onChange={(e) => setProvince(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Código Postal</Label>
              <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone">Zona</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin zona</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información Fiscal y Comercial</CardTitle>
          <CardDescription>Datos adicionales (opcional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Razón Social</Label>
              <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">CUIT/CUIL</Label>
              <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditDays">Días de Crédito</Label>
              <Input
                id="creditDays"
                type="number"
                min="0"
                value={creditDays}
                onChange={(e) => setCreditDays(Number.parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditLimit">Límite de Crédito ($)</Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="generalDiscount">Descuento General (%)</Label>
              <Input
                id="generalDiscount"
                type="number"
                step="0.01"
                min="0"
                max="30"
                value={generalDiscount}
                onChange={(e) => setGeneralDiscount(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              placeholder="Notas adicionales sobre el cliente..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Time Windows (VRPTW) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🕐 Restricción Horaria de Entrega
          </CardTitle>
          <CardDescription>
            Configura la franja horaria por defecto para las entregas de este cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <Label htmlFor="hasTimeRestriction" className="font-medium">
                ¿El cliente tiene restricción horaria?
              </Label>
              <p className="text-sm text-muted-foreground">
                Si está activo, los pedidos solo podrán ser entregados en la franja definida
              </p>
            </div>
            <Switch
              id="hasTimeRestriction"
              checked={hasTimeRestriction}
              onCheckedChange={setHasTimeRestriction}
            />
          </div>

          {hasTimeRestriction && (
            <div className="space-y-4 p-4 rounded-lg border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryWindowStart">Hora de Inicio</Label>
                  <Input
                    id="deliveryWindowStart"
                    type="time"
                    value={deliveryWindowStart}
                    onChange={(e) => setDeliveryWindowStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryWindowEnd">Hora de Fin</Label>
                  <Input
                    id="deliveryWindowEnd"
                    type="time"
                    value={deliveryWindowEnd}
                    onChange={(e) => setDeliveryWindowEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeRestrictionNotes">Notas sobre la restricción</Label>
                <Input
                  id="timeRestrictionNotes"
                  placeholder="Ej: Cerrado al mediodía, solo mañanas..."
                  value={timeRestrictionNotes}
                  onChange={(e) => setTimeRestrictionNotes(e.target.value)}
                />
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                ⚠️ Los pedidos de este cliente solo podrán ser entregados entre {deliveryWindowStart} y {deliveryWindowEnd}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || success} size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : success ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              ¡Guardado!
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </form>
  )
}


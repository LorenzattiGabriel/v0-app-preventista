'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Zone, CustomerType, IvaCondition, CustomerPriority } from '@/lib/types/database'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import { useGoogleMapsScript } from '@/lib/hooks/useGoogleMapsScript'
import { ProvinceLocalitySelector } from '@/components/shared/province-locality-selector'

interface AdminNewCustomerFormProps {
  zones: Zone[]
  userId: string
}

/**
 * Admin New Customer Form
 * Form component for creating new customers in the admin module
 */
export function AdminNewCustomerForm({ zones, userId }: AdminNewCustomerFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const isGoogleMapsLoaded = useGoogleMapsScript()

  // Form state
  const [commercialName, setCommercialName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [floorApt, setFloorApt] = useState('')
  const [addressNotes, setAddressNotes] = useState('')
  const [locality, setLocality] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [customerType, setCustomerType] = useState<CustomerType>('minorista')
  const [priority, setPriority] = useState<CustomerPriority>('normal')
  const [ivaCondition, setIvaCondition] = useState<IvaCondition>('consumidor_final')
  const [creditDays, setCreditDays] = useState(0)
  const [creditLimit, setCreditLimit] = useState(0)
  const [generalDiscount, setGeneralDiscount] = useState(0)
  const [zoneId, setZoneId] = useState('')
  const [observations, setObservations] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  
  // 🆕 Time Windows (VRPTW) - Restricciones horarias por defecto
  const [hasTimeRestriction, setHasTimeRestriction] = useState(false)
  const [deliveryWindowStart, setDeliveryWindowStart] = useState('08:00')
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState('18:00')
  const [timeRestrictionNotes, setTimeRestrictionNotes] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [addressSearchValue, setAddressSearchValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [predictions, setPredictions] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteService = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placesService = useRef<any>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        componentRestrictions: { country: 'ar' },
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

          // Extract address components
          const addressComponents = place.address_components || []
          let streetName = ''
          let streetNum = ''
          let loc = ''
          let prov = ''
          let postal = ''

          for (const component of addressComponents) {
            const types = component.types
            if (types.includes('route')) {
              streetName = component.long_name
            } else if (types.includes('street_number')) {
              streetNum = component.long_name
            } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
              loc = component.long_name
            } else if (types.includes('administrative_area_level_1')) {
              prov = component.long_name
            } else if (types.includes('postal_code')) {
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
      setError('Tu navegador no soporta geolocalización')
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

        if (window.google) {
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const addressComponents = results[0].address_components

              for (const component of addressComponents) {
                const types = component.types
                if (types.includes('route')) {
                  setStreet(component.long_name)
                } else if (types.includes('street_number')) {
                  setStreetNumber(component.long_name)
                } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                  setLocality(component.long_name)
                } else if (types.includes('administrative_area_level_1')) {
                  setProvince(component.long_name)
                } else if (types.includes('postal_code')) {
                  setPostalCode(component.long_name)
                }
              }
            }
          })
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        setError('No se pudo obtener la ubicación. Verifica los permisos del navegador.')
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

    const errors: Record<string, string> = {}
    if (!commercialName.trim()) errors.commercialName = "El nombre comercial es obligatorio"
    if (!contactName.trim()) errors.contactName = "El nombre de contacto es obligatorio"
    if (!phone.trim()) errors.phone = "El teléfono es obligatorio"
    if (!street.trim()) errors.street = "La calle es obligatoria"
    if (!streetNumber.trim()) errors.streetNumber = "El número de calle es obligatorio"
    if (!locality.trim()) errors.locality = "La localidad es obligatoria"
    if (!province.trim()) errors.province = "La provincia es obligatoria"

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError("Corregí los campos marcados antes de continuar")
      setIsLoading(false)
      return
    }
    setFieldErrors({})

    try {
      const supabase = createClient()

      // Generate customer code
      const { data: customerCodeData, error: codeError } = await supabase.rpc('generate_customer_code')

      if (codeError) {
        throw new Error(`Error al generar el código de cliente: ${codeError.message}`)
      }

      const customerCode = customerCodeData as string

      if (!customerCode) {
        throw new Error('No se pudo generar el código de cliente')
      }

      // Create customer
      const { error: customerError } = await supabase.from('customers').insert({
        code: customerCode,
        commercial_name: commercialName,
        contact_name: contactName,
        phone,
        email: email || null,
        street,
        street_number: streetNumber,
        floor_apt: floorApt || null,
        address_notes: addressNotes || null,
        locality,
        province,
        postal_code: postalCode || null,
        latitude: latitude || null,
        longitude: longitude || null,
        legal_name: legalName || null,
        tax_id: taxId || null,
        customer_type: customerType,
        priority: priority,
        iva_condition: ivaCondition,
        credit_days: creditDays,
        credit_limit: creditLimit,
        general_discount: generalDiscount,
        zone_id: zoneId || null,
        created_by: userId,
        observations: observations || null,
        // 🆕 Time Windows (VRPTW)
        has_time_restriction: hasTimeRestriction,
        delivery_window_start: hasTimeRestriction ? deliveryWindowStart : null,
        delivery_window_end: hasTimeRestriction ? deliveryWindowEnd : null,
        time_restriction_notes: hasTimeRestriction ? timeRestrictionNotes : null,
      })

      if (customerError) throw customerError

      // Redirect to customers list
      router.push('/admin/customers')
      router.refresh()
    } catch (err) {
      console.error('Error creating customer:', err)
      setError(err instanceof Error ? err.message : 'Error al crear el cliente')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
          <CardDescription>Datos principales del cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commercialName">
                Nombre Comercial <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commercialName"
                value={commercialName}
                onChange={(e) => { setCommercialName(e.target.value); setFieldErrors(prev => ({ ...prev, commercialName: "" })) }}
                className={fieldErrors.commercialName ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.commercialName && <p className="text-xs text-destructive">{fieldErrors.commercialName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">
                Nombre de Contacto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => { setContactName(e.target.value); setFieldErrors(prev => ({ ...prev, contactName: "" })) }}
                className={fieldErrors.contactName ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.contactName && <p className="text-xs text-destructive">{fieldErrors.contactName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Teléfono <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setFieldErrors(prev => ({ ...prev, phone: "" })) }}
                className={fieldErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="addressSearch">Buscar Dirección</Label>
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
                    Ubicación actual
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Busca una dirección o usa tu ubicación actual. Los campos se completarán automáticamente.
            </p>
          </div>

          {latitude !== null && longitude !== null && (
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
              <Input
                id="street"
                value={street}
                onChange={(e) => { setStreet(e.target.value); setFieldErrors(prev => ({ ...prev, street: "" })) }}
                className={fieldErrors.street ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.street && <p className="text-xs text-destructive">{fieldErrors.street}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="streetNumber">
                Número <span className="text-destructive">*</span>
              </Label>
              <Input
                id="streetNumber"
                value={streetNumber}
                onChange={(e) => { setStreetNumber(e.target.value); setFieldErrors(prev => ({ ...prev, streetNumber: "" })) }}
                className={fieldErrors.streetNumber ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.streetNumber && <p className="text-xs text-destructive">{fieldErrors.streetNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="floorApt">Piso/Depto</Label>
              <Input id="floorApt" value={floorApt} onChange={(e) => setFloorApt(e.target.value)} />
            </div>
          </div>

          <ProvinceLocalitySelector
            province={province}
            locality={locality}
            postalCode={postalCode}
            onProvinceChange={(v) => { setProvince(v); setFieldErrors(prev => ({ ...prev, province: "" })) }}
            onLocalityChange={(v) => { setLocality(v); setFieldErrors(prev => ({ ...prev, locality: "" })) }}
            onPostalCodeChange={setPostalCode}
            isGoogleMapsLoaded={isGoogleMapsLoaded}
            provinceError={fieldErrors.province}
            localityError={fieldErrors.locality}
          />

          <div className="space-y-2">
            <Label htmlFor="zone">Zona</Label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressNotes">Referencias de la Ubicación</Label>
            <Input
              id="addressNotes"
              value={addressNotes}
              onChange={(e) => setAddressNotes(e.target.value)}
              placeholder="Ej: casa con rejas negras, cartel luminoso en la entrada"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">
              Detalles que ayuden al repartidor a encontrar la dirección
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información Fiscal y Comercial</CardTitle>
          <CardDescription>Datos adicionales (opcional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Razón Social</Label>
              <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">CUIT/CUIL</Label>
              <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditDays">Días de Crédito</Label>
              <Input
                id="creditDays"
                type="number"
                min="0"
                value={creditDays || ""}
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
                value={creditLimit || ""}
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
                value={generalDiscount || ""}
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

      {/* 🆕 Time Windows (VRPTW) - Restricciones Horarias */}
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
            <input
              type="checkbox"
              id="hasTimeRestriction"
              checked={hasTimeRestriction}
              onChange={(e) => setHasTimeRestriction(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300"
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
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Cliente'
          )}
        </Button>
      </div>
    </form>
  )
}



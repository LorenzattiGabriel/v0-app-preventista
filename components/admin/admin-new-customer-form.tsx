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
import type { Zone, CustomerType, IvaCondition } from '@/lib/types/database'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'

interface AdminNewCustomerFormProps {
  zones: Zone[]
  userId: string
}

/**
 * Hook for loading Google Maps API
 */
function useGoogleMapsScript() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => setIsLoaded(true)
      document.head.appendChild(script)
    } else if (window.google) {
      setIsLoaded(true)
    }
  }, [])

  return isLoaded
}

/**
 * Admin New Customer Form
 * Form component for creating new customers in the admin module
 */
export function AdminNewCustomerForm({ zones, userId }: AdminNewCustomerFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isGoogleMapsLoaded = useGoogleMapsScript()

  // Form state
  const [commercialName, setCommercialName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [floorApt, setFloorApt] = useState('')
  const [locality, setLocality] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [customerType, setCustomerType] = useState<CustomerType>('minorista')
  const [ivaCondition, setIvaCondition] = useState<IvaCondition>('consumidor_final')
  const [creditDays, setCreditDays] = useState(0)
  const [creditLimit, setCreditLimit] = useState(0)
  const [generalDiscount, setGeneralDiscount] = useState(0)
  const [zoneId, setZoneId] = useState('')
  const [observations, setObservations] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [addressSearchValue, setAddressSearchValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)
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

  const handleSelectPlace = (prediction: google.maps.places.AutocompletePrediction) => {
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
        locality,
        province,
        postal_code: postalCode || null,
        latitude: latitude || null,
        longitude: longitude || null,
        legal_name: legalName || null,
        tax_id: taxId || null,
        customer_type: customerType,
        iva_condition: ivaCondition,
        credit_days: creditDays,
        credit_limit: creditLimit,
        general_discount: generalDiscount,
        zone_id: zoneId || null,
        created_by: userId,
        observations: observations || null,
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
                required
                value={commercialName}
                onChange={(e) => setCommercialName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">
                Nombre de Contacto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactName"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
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
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
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

          <div className="grid grid-cols-3 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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



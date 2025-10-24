"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Zone, CustomerType, IvaCondition } from "@/lib/types/database"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface NewCustomerFormProps {
  zones: Zone[]
  userId: string
}

export function NewCustomerForm({ zones, userId }: NewCustomerFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [commercialName, setCommercialName] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [street, setStreet] = useState("")
  const [streetNumber, setStreetNumber] = useState("")
  const [floorApt, setFloorApt] = useState("")
  const [locality, setLocality] = useState("")
  const [province, setProvince] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [legalName, setLegalName] = useState("")
  const [taxId, setTaxId] = useState("")
  const [customerType, setCustomerType] = useState<CustomerType>("minorista")
  const [ivaCondition, setIvaCondition] = useState<IvaCondition>("consumidor_final")
  const [creditDays, setCreditDays] = useState(0)
  const [creditLimit, setCreditLimit] = useState(0)
  const [generalDiscount, setGeneralDiscount] = useState(0)
  const [zoneId, setZoneId] = useState("")
  const [observations, setObservations] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Generate customer code
      const { data: customerCodeData } = await supabase.rpc("generate_customer_code")
      const customerCode = customerCodeData as string

      // Create customer
      const { data: newCustomer, error: customerError } = await supabase.from("customers").insert({
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
      }).select().single()

      if (customerError) throw customerError

      // Guardar el ID del cliente recién creado para seleccionarlo automáticamente
      if (newCustomer) {
        sessionStorage.setItem('newly_created_customer_id', newCustomer.id)
      }

      // Redirigir de vuelta a crear pedido
      router.push("/preventista/orders/new")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error creating customer:", err)
      setError(err instanceof Error ? err.message : "Error al crear el cliente")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild type="button">
          <Link href="/preventista/orders/new">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Pedido
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">{error}</div>
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
              <Input id="contactName" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
        <Button type="button" variant="outline" asChild>
          <Link href="/preventista/orders/new">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? "Guardando..." : "Guardar Cliente y Continuar"}
        </Button>
      </div>
    </form>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { FiscalCondition, Supplier } from "@/lib/types/database"
import { ARGENTINA_PROVINCES } from "@/lib/constants/argentina"

const PROVINCE_NONE = "__none__"

interface Props {
  supplier?: Supplier
}

const FISCAL_OPTIONS: { value: FiscalCondition; label: string }[] = [
  { value: "MT", label: "Monotributo (MT)" },
  { value: "RI", label: "Responsable Inscripto (RI)" },
  { value: "CF", label: "Consumidor Final (CF)" },
  { value: "EXE", label: "Exento (EXE)" },
]

const FISCAL_NONE = "__none__"

export function SupplierForm({ supplier }: Props) {
  const router = useRouter()
  const isEdit = !!supplier

  // Identidad
  const [name, setName] = useState(supplier?.name || "")
  const [externalId, setExternalId] = useState(supplier?.external_id || "")
  const [fiscalCondition, setFiscalCondition] = useState<string>(
    supplier?.fiscal_condition || FISCAL_NONE,
  )
  const [taxId, setTaxId] = useState(supplier?.tax_id || "")

  // Contacto
  const [phone, setPhone] = useState(supplier?.phone || "")
  const [mobile, setMobile] = useState(supplier?.mobile || "")
  const [email, setEmail] = useState(supplier?.email || "")

  // Dirección
  const [address, setAddress] = useState(supplier?.address || "")
  const [locality, setLocality] = useState(supplier?.locality || "")
  const [province, setProvince] = useState<string>(supplier?.province || PROVINCE_NONE)

  // Comercial
  const [creditLimit, setCreditLimit] = useState<string>(
    supplier?.credit_limit != null ? String(supplier.credit_limit) : "",
  )
  const [category, setCategory] = useState(supplier?.category || "")
  const [siapConcept, setSiapConcept] = useState(supplier?.siap_concept || "")

  // Meta
  const [notes, setNotes] = useState(supplier?.notes || "")
  const [isActive, setIsActive] = useState(supplier?.is_active ?? true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError("El nombre es obligatorio")
      return
    }

    let creditLimitNum: number | null = null
    if (creditLimit.trim()) {
      const parsed = parseFloat(creditLimit.replace(",", "."))
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Límite de cuenta corriente debe ser un número ≥ 0")
        return
      }
      creditLimitNum = parsed
    }

    setSaving(true)
    try {
      const url = isEdit ? `/api/admin/suppliers/${supplier!.id}` : "/api/admin/suppliers"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          external_id: externalId.trim() || null,
          fiscal_condition: fiscalCondition === FISCAL_NONE ? null : fiscalCondition,
          tax_id: taxId.trim() || null,
          phone: phone.trim() || null,
          mobile: mobile.trim() || null,
          email: email.trim().toLowerCase() || null,
          address: address.trim() || null,
          locality: locality.trim() || null,
          province: province === PROVINCE_NONE ? null : province,
          credit_limit: creditLimitNum,
          category: category.trim() || null,
          siap_concept: siapConcept.trim() || null,
          notes: notes.trim() || null,
          is_active: isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      router.push("/admin/egresos/proveedores")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identidad */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Identidad</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nombre / Razón Social *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external_id">ID externo</Label>
                <Input
                  id="external_id"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="ID del sistema viejo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal_condition">Condición Fiscal</Label>
                <Select value={fiscalCondition} onValueChange={setFiscalCondition}>
                  <SelectTrigger id="fiscal_condition">
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FISCAL_NONE}>Sin especificar</SelectItem>
                    {FISCAL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tax_id">CUIT</Label>
                <Input
                  id="tax_id"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="30-12345678-9"
                />
              </div>
            </div>
          </section>

          {/* Contacto */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Contacto</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono fijo</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Celular</Label>
                <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
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
          </section>

          {/* Dirección */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Dirección</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="address">Domicilio</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locality">Localidad</Label>
                <Input
                  id="locality"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger id="province">
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROVINCE_NONE}>Sin especificar</SelectItem>
                    {ARGENTINA_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Comercial */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Comercial</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Límite cta. corriente</Label>
                <Input
                  id="credit_limit"
                  inputMode="decimal"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siap_concept">Concepto SIAP</Label>
                <Input
                  id="siap_concept"
                  value={siapConcept}
                  onChange={(e) => setSiapConcept(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Notas y estado */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones (opcional)"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="active">Activo</Label>
              <p className="text-xs text-muted-foreground">
                Los proveedores inactivos no aparecen al cargar egresos.
              </p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear Proveedor"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

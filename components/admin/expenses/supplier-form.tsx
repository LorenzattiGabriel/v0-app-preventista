"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { Supplier } from "@/lib/types/database"

interface Props {
  supplier?: Supplier
}

export function SupplierForm({ supplier }: Props) {
  const router = useRouter()
  const isEdit = !!supplier

  const [name, setName] = useState(supplier?.name || "")
  const [taxId, setTaxId] = useState(supplier?.tax_id || "")
  const [phone, setPhone] = useState(supplier?.phone || "")
  const [email, setEmail] = useState(supplier?.email || "")
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
    setSaving(true)
    try {
      const url = isEdit ? `/api/admin/suppliers/${supplier!.id}` : "/api/admin/suppliers"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tax_id: taxId.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre / Razón Social *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">CUIT / DNI</Label>
              <Input id="tax_id" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="30-12345678-9" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observaciones (opcional)" />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="active">Activo</Label>
              <p className="text-xs text-muted-foreground">Los proveedores inactivos no aparecen al cargar egresos.</p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
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

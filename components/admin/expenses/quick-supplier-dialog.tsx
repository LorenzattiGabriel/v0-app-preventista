"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Supplier } from "@/lib/types/database"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (supplier: Supplier) => void
}

export function QuickSupplierDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("")
  const [taxId, setTaxId] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tax_id: taxId.trim() || null,
          phone: phone.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      onCreated(data.supplier)
      toast.success("Proveedor creado")
      setName("")
      setTaxId("")
      setPhone("")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
          <DialogDescription>
            Carga rápida. Para más datos editá desde la página de proveedores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-name">Nombre *</Label>
            <Input
              id="quick-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Razón social o nombre"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quick-cuit">CUIT</Label>
              <Input id="quick-cuit" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-phone">Teléfono</Label>
              <Input id="quick-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear y seleccionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

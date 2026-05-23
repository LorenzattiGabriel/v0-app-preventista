"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Upload, X, FileText, Plus } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { QuickSupplierDialog } from "./quick-supplier-dialog"
import {
  PAYMENT_METHODS,
  type ExpenseCategory,
  type ExpenseWithRelations,
  type PaymentMethod,
  type Supplier,
} from "@/lib/types/database"

interface Props {
  expense?: ExpenseWithRelations
  categories: ExpenseCategory[]
  suppliers: Supplier[]
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function ExpenseForm({ expense, categories, suppliers: initialSuppliers }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!expense

  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [quickDialogOpen, setQuickDialogOpen] = useState(false)

  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date || new Date().toISOString().split("T")[0],
  )
  const [description, setDescription] = useState(expense?.description || "")
  const [categoryId, setCategoryId] = useState(expense?.category_id || "")
  const [supplierId, setSupplierId] = useState<string>(expense?.supplier_id || "none")
  const [amount, setAmount] = useState(expense?.amount?.toString() || "")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    expense?.payment_method || "Transferencia",
  )
  const [notes, setNotes] = useState(expense?.notes || "")
  const [proofUrl, setProofUrl] = useState<string | null>(expense?.proof_url || null)
  const [proofFile, setProofFile] = useState<File | null>(null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error("El archivo supera los 5MB")
      e.target.value = ""
      return
    }
    const ok = file.type.startsWith("image/") || file.type === "application/pdf"
    if (!ok) {
      toast.error("Solo se permiten imágenes o PDF")
      e.target.value = ""
      return
    }
    setProofFile(file)
  }

  async function uploadProof(): Promise<string | null> {
    if (!proofFile) return proofUrl
    setUploading(true)
    try {
      const ext = proofFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from("expense-proofs")
        .upload(fileName, proofFile, { cacheControl: "3600", upsert: false })
      if (upErr) throw upErr
      const { data } = supabase.storage.from("expense-proofs").getPublicUrl(fileName)
      return data.publicUrl
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!description.trim()) return setError("La descripción es obligatoria")
    if (!categoryId) return setError("Seleccioná una categoría")
    const amt = parseFloat(amount.replace(",", "."))
    if (!Number.isFinite(amt) || amt <= 0) return setError("El monto debe ser mayor a 0")

    setSaving(true)
    try {
      let finalProofUrl = proofUrl
      if (proofFile) {
        finalProofUrl = await uploadProof()
      }

      const payload = {
        expense_date: expenseDate,
        description: description.trim(),
        category_id: categoryId,
        supplier_id: supplierId === "none" ? null : supplierId,
        amount: amt,
        payment_method: paymentMethod,
        proof_url: finalProofUrl,
        notes: notes.trim() || null,
      }

      const url = isEdit ? `/api/admin/expenses/${expense!.id}` : "/api/admin/expenses"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")

      toast.success(isEdit ? "Egreso actualizado" : "Egreso registrado")
      router.push("/admin/egresos")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  function handleSupplierCreated(newSupplier: Supplier) {
    setSuppliers((prev) => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)))
    setSupplierId(newSupplier.id)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar Egreso" : "Nuevo Egreso"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Pago alquiler enero"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} <span className="text-xs text-muted-foreground">({c.expense_type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <div className="flex gap-2">
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger id="supplier" className="flex-1">
                      <SelectValue placeholder="Sin proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proveedor</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuickDialogOpen(true)}
                    title="Nuevo proveedor"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment">Método de Pago *</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger id="payment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Nota / Observación</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Información adicional sobre el egreso (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof">Comprobante (opcional)</Label>
              {proofUrl && !proofFile ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                    <FileText className="h-4 w-4" /> Ver comprobante actual
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProofUrl(null)}>
                    <X className="h-4 w-4 mr-1" /> Quitar
                  </Button>
                </div>
              ) : null}

              {!proofUrl && proofFile ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> {proofFile.name}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProofFile(null)}>
                    <X className="h-4 w-4 mr-1" /> Quitar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">PDF o imagen, máximo 5MB.</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {(saving || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploading ? "Subiendo comprobante..." : isEdit ? "Guardar cambios" : "Registrar Egreso"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <QuickSupplierDialog
        open={quickDialogOpen}
        onOpenChange={setQuickDialogOpen}
        onCreated={handleSupplierCreated}
      />
    </>
  )
}

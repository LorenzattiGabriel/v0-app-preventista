"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { ExpenseCategory, ExpenseType } from "@/lib/types/database"

interface Props {
  category?: ExpenseCategory
}

export function ExpenseCategoryForm({ category }: Props) {
  const router = useRouter()
  const isEdit = !!category

  const [name, setName] = useState(category?.name || "")
  const [description, setDescription] = useState(category?.description || "")
  const [expenseType, setExpenseType] = useState<ExpenseType>(category?.expense_type || "variable")
  const [isActive, setIsActive] = useState(category?.is_active ?? true)
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
      const url = isEdit
        ? `/api/admin/expense-categories/${category!.id}`
        : "/api/admin/expense-categories"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          expense_type: expenseType,
          is_active: isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      router.push("/admin/egresos/categorias")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Editar Categoría" : "Nueva Categoría"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Alquiler, Servicios..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Gasto *</Label>
            <Select value={expenseType} onValueChange={(v) => setExpenseType(v as ExpenseType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fijo">Gastos Fijos</SelectItem>
                <SelectItem value="variable">Gastos Variables</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nota o referencia (opcional)"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="active">Activa</Label>
              <p className="text-xs text-muted-foreground">Las categorías inactivas no aparecen al cargar egresos.</p>
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
              {isEdit ? "Guardar cambios" : "Crear Categoría"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

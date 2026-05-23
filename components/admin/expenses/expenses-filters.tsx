"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PAYMENT_METHODS, type ExpenseCategory, type Supplier } from "@/lib/types/database"

interface Props {
  categories: ExpenseCategory[]
  suppliers: Supplier[]
}

export function ExpensesFilters({ categories, suppliers }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const searchParam = searchParams.get("search") || ""
  const categoryId = searchParams.get("category_id") || "all"
  const supplierId = searchParams.get("supplier_id") || "all"
  const paymentMethod = searchParams.get("payment_method") || "all"
  const expenseType = searchParams.get("expense_type") || "all"
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""

  const [searchInput, setSearchInput] = useState(searchParam)
  useEffect(() => setSearchInput(searchParam), [searchParam])
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== searchParam) updateFilters({ search: searchInput })
    }, 500)
    return () => clearTimeout(t)
  }, [searchInput])

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "all") params.delete(k)
      else params.set(k, v)
    })
    params.delete("page")
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const clearFilters = () => startTransition(() => router.push(pathname))
  const hasFilters =
    searchInput || categoryId !== "all" || supplierId !== "all" ||
    paymentMethod !== "all" || expenseType !== "all" || from || to

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción o notas..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:col-span-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => updateFilters({ from: e.target.value })}
              disabled={isPending}
              placeholder="Desde"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => updateFilters({ to: e.target.value })}
              disabled={isPending}
              placeholder="Hasta"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Select value={categoryId} onValueChange={(v) => updateFilters({ category_id: v })} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={supplierId} onValueChange={(v) => updateFilters({ supplier_id: v })} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Proveedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentMethod} onValueChange={(v) => updateFilters({ payment_method: v })} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Método de pago" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={expenseType} onValueChange={(v) => updateFilters({ expense_type: v })} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Tipo gasto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Fijos y Variables</SelectItem>
              <SelectItem value="fijo">Solo Fijos</SelectItem>
              <SelectItem value="variable">Solo Variables</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
            <X className="mr-2 h-4 w-4" /> Limpiar Filtros
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

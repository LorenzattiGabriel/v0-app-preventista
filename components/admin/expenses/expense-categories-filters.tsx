"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function ExpenseCategoriesFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const searchParam = searchParams.get("search") || ""
  const expenseType = searchParams.get("expense_type") || "all"
  const isActive = searchParams.get("is_active") || "all"

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
  const hasFilters = searchInput || expenseType !== "all" || isActive !== "all"

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              disabled={isPending}
            />
          </div>

          <Select value={expenseType} onValueChange={(v) => updateFilters({ expense_type: v })} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Tipo de gasto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="fijo">Gastos Fijos</SelectItem>
              <SelectItem value="variable">Gastos Variables</SelectItem>
            </SelectContent>
          </Select>

          <Select value={isActive} onValueChange={(v) => updateFilters({ is_active: v })} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Activas</SelectItem>
              <SelectItem value="false">Inactivas</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending} className="lg:col-span-4 lg:justify-self-start">
              <X className="mr-2 h-4 w-4" /> Limpiar Filtros
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

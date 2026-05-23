"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function SuppliersFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const searchParam = searchParams.get("search") || ""
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
  const hasFilters = searchInput || isActive !== "all"

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, CUIT, email o teléfono..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          <Select value={isActive} onValueChange={(v) => updateFilters({ is_active: v })} disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending} className="md:col-span-3 md:justify-self-start">
              <X className="mr-2 h-4 w-4" /> Limpiar Filtros
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

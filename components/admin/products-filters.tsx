"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ProductsFiltersProps {
  categories: string[]
}

export function ProductsFilters({ categories }: ProductsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const searchParam = searchParams.get("search") || ""
  const category = searchParams.get("category") || "all"
  const isActive = searchParams.get("is_active") || "all"
  const lowStock = searchParams.get("low_stock") === "true"

  // Estado local para el input de búsqueda (evita búsquedas en cada tecleo)
  const [searchInput, setSearchInput] = useState(searchParam)

  // Sincronizar estado local cuando cambia el URL
  useEffect(() => {
    setSearchInput(searchParam)
  }, [searchParam])

  // Debounce: esperar 500ms después de que el usuario deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateFilters({ search: searchInput })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    // Reset to page 1 when filters change
    params.delete("page")

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters = searchInput || category !== "all" || isActive !== "all" || lowStock

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Search and Category */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Input con debounce */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nombre, marca, proveedor o código de barras..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                disabled={isPending}
              />
            </div>

            {/* Category Filter */}
            <Select value={category} onValueChange={(value) => updateFilters({ category: value })} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={isActive} onValueChange={(value) => updateFilters({ is_active: value })} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={lowStock ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilters({ low_stock: lowStock ? null : "true" })}
              disabled={isPending}
            >
              <Package className="mr-2 h-4 w-4" />
              Stock Bajo
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
                <X className="mr-2 h-4 w-4" />
                Limpiar Filtros
              </Button>
            )}

            {isPending && <span className="text-sm text-muted-foreground">Cargando...</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


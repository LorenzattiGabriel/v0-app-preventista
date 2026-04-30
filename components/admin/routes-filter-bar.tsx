"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "PLANIFICADO", label: "Planificadas" },
  { value: "EN_CURSO", label: "En Curso" },
  { value: "COMPLETADO", label: "Completadas" },
  { value: "CANCELADO", label: "Canceladas" },
]

interface RoutesFilterBarProps {
  totalCount: number
}

export function RoutesFilterBar({ totalCount }: RoutesFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get("status") ?? ""
  const currentSearch = searchParams.get("search") ?? ""
  const currentDate = searchParams.get("date") ?? ""

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      // Reset page on any filter change
      params.delete("page")
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters = currentStatus || currentSearch || currentDate

  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParams({ status: opt.value })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              currentStatus === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search + date row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o repartidor..."
            defaultValue={currentSearch}
            className="pl-9"
            onChange={(e) => {
              const value = e.target.value
              const timeout = setTimeout(() => updateParams({ search: value }), 400)
              return () => clearTimeout(timeout)
            }}
          />
        </div>
        <Input
          type="date"
          className="sm:w-44"
          value={currentDate}
          onChange={(e) => updateParams({ date: e.target.value })}
        />
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearAll} title="Limpiar filtros">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        {isPending ? "Cargando..." : `${totalCount} ${totalCount === 1 ? "ruta" : "rutas"}`}
        {hasFilters && " con los filtros aplicados"}
      </p>
    </div>
  )
}

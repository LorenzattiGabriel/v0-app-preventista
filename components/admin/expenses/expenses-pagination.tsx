"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ExpensesPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  itemLabel?: string
}

export function ExpensesPagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  itemLabel = "items",
}: ExpensesPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * perPage + 1
  const endItem = Math.min(currentPage * perPage, totalItems)

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="text-sm text-muted-foreground">
        Mostrando {startItem} - {endItem} de {totalItems} {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigateToPage(currentPage - 1)} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p: number
            if (totalPages <= 5) p = i + 1
            else if (currentPage <= 3) p = i + 1
            else if (currentPage >= totalPages - 2) p = totalPages - 4 + i
            else p = currentPage - 2 + i
            return (
              <Button
                key={p}
                variant={currentPage === p ? "default" : "outline"}
                size="sm"
                onClick={() => navigateToPage(p)}
                className="w-10"
              >
                {p}
              </Button>
            )
          })}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

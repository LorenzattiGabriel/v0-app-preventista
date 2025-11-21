"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ProductsPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
}

export function ProductsPagination({ currentPage, totalPages, totalItems }: ProductsPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  if (totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * 20 + 1
  const endItem = Math.min(currentPage * 20, totalItems)

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Mostrando {startItem} - {endItem} de {totalItems} productos
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber: number
            if (totalPages <= 5) {
              pageNumber = i + 1
            } else if (currentPage <= 3) {
              pageNumber = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i
            } else {
              pageNumber = currentPage - 2 + i
            }

            return (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? "default" : "outline"}
                size="sm"
                onClick={() => navigateToPage(pageNumber)}
                className="w-10"
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}


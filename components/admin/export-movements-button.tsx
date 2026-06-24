"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ExportMovementsButtonProps {
  params: Record<string, string | undefined>
}

export function ExportMovementsButton({ params }: ExportMovementsButtonProps) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") qs.set(key, value)
  }
  const href = `/api/admin/financial-movements/export?${qs.toString()}`

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href}>
        <Download className="h-4 w-4 mr-2" />
        Exportar CSV
      </a>
    </Button>
  )
}

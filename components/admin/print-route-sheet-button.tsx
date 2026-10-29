"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  generateRouteSheetPDF,
  type RouteSheetInfo,
  type RouteSheetStop,
} from "@/lib/route-sheet-generator"

interface PrintRouteSheetButtonProps {
  route: RouteSheetInfo
  stops: RouteSheetStop[]
}

export function PrintRouteSheetButton({ route, stops }: PrintRouteSheetButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    if (stops.length === 0) {
      toast.error("La ruta no tiene paradas para imprimir")
      return
    }
    setLoading(true)
    try {
      const doc = await generateRouteSheetPDF(route, stops)
      doc.save(`Hoja_de_Ruta_${route.routeCode}.pdf`)
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handlePrint} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
      Imprimir hoja de ruta
    </Button>
  )
}

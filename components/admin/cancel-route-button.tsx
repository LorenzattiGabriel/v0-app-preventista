"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { XCircle, Loader2 } from "lucide-react"

interface CancelRouteButtonProps {
  routeId: string
  routeCode: string
  status: string
  pendingCount: number
}

export function CancelRouteButton({ routeId, routeCode, status, pendingCount }: CancelRouteButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Solo se puede cancelar antes de iniciar la ruta (PLANIFICADO).
  // Si ya está EN_CURSO, no hay vuelta atrás.
  if (status !== "PLANIFICADO") {
    return null
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/routes/${routeId}/cancel`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        alert(`Error: ${data.error}`)
        return
      }

      alert(
        `Ruta ${routeCode} cancelada.` +
          (data.revertedCount > 0
            ? ` ${data.revertedCount} pedido(s) volvieron a Pendiente de Entrega.`
            : ""),
      )

      setOpen(false)
      router.push("/admin/routes")
      router.refresh()
    } catch (error) {
      console.error("Error cancelling route:", error)
      alert("Error al cancelar la ruta. Por favor, intentá nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar Ruta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            ¿Cancelar ruta {routeCode}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              La ruta quedará marcada como <strong>CANCELADA</strong>.
            </span>
            {pendingCount > 0 ? (
              <span className="block bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-900 dark:text-blue-100">
                {pendingCount} pedido(s) sin entregar volverán a <strong>Pendiente de Entrega</strong> y podrán
                reasignarse a otra ruta. Los pedidos ya entregados no se modifican.
              </span>
            ) : (
              <span className="block text-sm text-muted-foreground">
                No hay pedidos pendientes para devolver (ya entregados o sin paradas activas).
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleCancel()
            }}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Sí, Cancelar Ruta
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

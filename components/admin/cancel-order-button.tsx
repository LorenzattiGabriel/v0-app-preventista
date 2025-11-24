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
import { XCircle, Loader2, PackageX } from "lucide-react"

interface CancelOrderButtonProps {
  orderId: string
  orderNumber: string
  status: string
  wasAssembled: boolean
}

export function CancelOrderButton({ orderId, orderNumber, status, wasAssembled }: CancelOrderButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Don't show button for cancelled or delivered orders
  if (status === "CANCELADO" || status === "ENTREGADO") {
    return null
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Error: ${data.error}`)
        return
      }

      alert(
        wasAssembled
          ? `Pedido ${orderNumber} cancelado. El stock ha sido devuelto al inventario.`
          : `Pedido ${orderNumber} cancelado.`,
      )

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error cancelling order:", error)
      alert("Error al cancelar el pedido. Por favor, intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar Pedido
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-red-600" />
            ¿Cancelar pedido {orderNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>Esta acción marcará el pedido como <strong>CANCELADO</strong>.</p>

            {wasAssembled ? (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  ✅ Este pedido ya fue armado.
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  El stock de los productos será <strong>devuelto automáticamente</strong> al inventario.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Este pedido aún no fue armado, por lo que no hay stock que devolver.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Nota:</strong> Esta acción no se puede deshacer. Si necesitas reactivar el pedido, deberás crearlo
              nuevamente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Volver</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Sí, Cancelar Pedido
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


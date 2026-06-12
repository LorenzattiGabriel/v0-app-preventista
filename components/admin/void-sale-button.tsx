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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Ban, Loader2, PackageX } from "lucide-react"

interface VoidSaleButtonProps {
  orderId: string
  orderNumber: string
  status: string
}

export function VoidSaleButton({ orderId, orderNumber, status }: VoidSaleButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  // Ya anulada → no mostrar
  if (status === "CANCELADO") {
    return null
  }

  const handleVoid = async () => {
    if (reason.trim().length < 5) {
      alert("El motivo de anulación es obligatorio (mínimo 5 caracteres)")
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/void-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        alert(`Error: ${data.error}`)
        return
      }
      alert(`Venta ${orderNumber} anulada. Se devolvió el stock y se revirtió la deuda del cliente.`)
      setOpen(false)
      setReason("")
      router.refresh()
    } catch (error) {
      console.error("Error anulando venta:", error)
      alert("Error al anular la venta. Por favor, intentá nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setReason("") }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Ban className="mr-2 h-4 w-4" />
          Anular Venta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-red-600" />
            ¿Anular venta {orderNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>Esta acción marcará la venta como <strong>CANCELADO</strong>.</p>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Se <strong>devuelve el stock</strong> de los productos al inventario y se <strong>revierte la deuda</strong> que la venta generó en la cuenta corriente del cliente.
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Nota:</strong> Esta acción no se puede deshacer.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="void-reason">
            Motivo de la anulación <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Error de carga, cliente devolvió la mercadería, venta duplicada..."
            rows={3}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">Mínimo 5 caracteres. Queda registrado en el historial.</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleVoid}
            disabled={isLoading || reason.trim().length < 5}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Anulando...
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Sí, Anular Venta
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

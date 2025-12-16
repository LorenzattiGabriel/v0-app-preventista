"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createStockMovementsService } from "@/lib/services/stockMovementsService"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2, History } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface StockInlineEditProps {
  productId: string
  productCode: string
  productName: string
  currentStock: number
  minStock: number
  userId: string
}

export function StockInlineEdit({
  productId,
  productCode,
  productName,
  currentStock,
  minStock,
  userId,
}: StockInlineEditProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [newStock, setNewStock] = useState(currentStock.toString())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const hasChanged = Number(newStock) !== currentStock
  const isLowStock = Number(newStock) <= minStock
  const isOutOfStock = Number(newStock) === 0

  const handleSave = async () => {
    const stockValue = Number(newStock)
    
    if (isNaN(stockValue) || stockValue < 0) {
      setError("Ingrese un valor válido")
      return
    }

    if (stockValue === currentStock) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const stockService = createStockMovementsService(supabase)

      await stockService.updateStockWithAudit(
        productId,
        stockValue,
        "manual_edit",
        userId,
        `Edición manual: ${currentStock} → ${stockValue}`
      )

      setIsEditing(false)
      router.refresh()
    } catch (err) {
      console.error("Error updating stock:", err)
      setError("Error al actualizar el stock")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setNewStock(currentStock.toString())
    setIsEditing(false)
    setError(null)
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const supabase = createClient()
      const stockService = createStockMovementsService(supabase)
      const movements = await stockService.getProductHistory(productId, 10)
      setHistory(movements)
    } catch (err) {
      console.error("Error loading history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleOpenHistory = () => {
    setShowHistory(true)
    loadHistory()
  }

  const formatMovementType = (type: string) => {
    const types: Record<string, string> = {
      manual_edit: "Edición Manual",
      csv_import: "Importación CSV",
      order_assembly: "Armado de Pedido",
      inventory_adjustment: "Ajuste Inventario",
      purchase_receipt: "Recepción Compra",
      return: "Devolución",
      damage: "Daño",
      expiration: "Vencimiento",
    }
    return types[type] || type
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Input
              type="number"
              min="0"
              step="1"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className={`w-24 h-8 text-center ${
                isOutOfStock 
                  ? "border-red-500 bg-red-50" 
                  : isLowStock 
                    ? "border-amber-500 bg-amber-50" 
                    : ""
              }`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") handleCancel()
              }}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                    onClick={handleSave}
                    disabled={isLoading || !hasChanged}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Guardar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancelar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className={`text-lg font-bold px-2 py-1 rounded cursor-pointer hover:bg-muted transition-colors ${
                isOutOfStock
                  ? "text-red-600"
                  : isLowStock
                    ? "text-amber-600"
                    : "text-green-600"
              }`}
              title="Click para editar"
            >
              {currentStock}
            </button>
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleOpenHistory}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Historial de Stock</DialogTitle>
                  <DialogDescription>
                    {productCode} - {productName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay movimientos registrados
                    </p>
                  ) : (
                    history.map((movement) => (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {movement.previous_stock} → {movement.new_stock}
                            <span
                              className={`ml-2 text-xs ${
                                movement.quantity_changed > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              ({movement.quantity_changed > 0 ? "+" : ""}
                              {movement.quantity_changed})
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatMovementType(movement.movement_type)}
                            {movement.user_name && ` • ${movement.user_name}`}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {new Date(movement.created_at).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-muted-foreground">Mínimo: {minStock}</p>
    </div>
  )
}


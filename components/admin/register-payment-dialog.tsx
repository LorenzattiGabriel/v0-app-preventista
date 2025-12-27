"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react"

interface RegisterPaymentDialogProps {
  customerId: string
  customerName: string
  currentBalance: number
  pendingOrders: Array<{
    id: string
    order_number: string
    total: number
    balance_due: number
  }>
}

export function RegisterPaymentDialog({
  customerId,
  customerName,
  currentBalance,
  pendingOrders,
}: RegisterPaymentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [selectedOrder, setSelectedOrder] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia" | "tarjeta" | "cheque">("transferencia")
  const [notes, setNotes] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedOrderData = pendingOrders.find(o => o.id === selectedOrder)
  const maxAmount = selectedOrderData?.balance_due || currentBalance

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo no puede superar 5MB")
        return
      }
      setProofFile(file)
      // Preview para imágenes
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onloadend = () => setProofPreview(reader.result as string)
        reader.readAsDataURL(file)
      } else {
        setProofPreview(null)
      }
    }
  }

  const removeFile = () => {
    setProofFile(null)
    setProofPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadProofFile = async (): Promise<string | null> => {
    if (!proofFile) return null

    const supabase = createClient()
    const fileExt = proofFile.name.split(".").pop() || "file"
    const fileName = `payment_proof_${customerId}_${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from("delivery")
      .upload(fileName, proofFile, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      console.warn("Error uploading proof file:", error)
      return null
    }

    const { data: publicData } = supabase.storage.from("delivery").getPublicUrl(fileName)
    return publicData.publicUrl
  }

  const handleSubmit = async () => {
    if (!selectedOrder) {
      setError("Debe seleccionar un pedido")
      return
    }

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Ingrese un monto válido mayor a $0")
      return
    }

    if (amountNum > maxAmount) {
      setError(`El monto no puede superar la deuda del pedido ($${maxAmount.toFixed(2)})`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Subir comprobante si existe (opcional)
      let proofUrl: string | null = null
      if (proofFile) {
        proofUrl = await uploadProofFile()
      }

      const response = await fetch("/api/admin/register-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder,
          customerId,
          amount: amountNum,
          paymentMethod,
          notes: notes.trim() || null,
          proofUrl, // URL del comprobante (opcional)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar el pago")
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        resetForm()
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el pago")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedOrder("")
    setAmount("")
    setPaymentMethod("transferencia")
    setNotes("")
    setProofFile(null)
    setProofPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (currentBalance <= 0) {
    return null // No mostrar si no hay deuda
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="default">
          <DollarSign className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Deuda</DialogTitle>
          <DialogDescription>
            {customerName} - Deuda total: ${currentBalance.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-green-600 dark:text-green-400">
              ¡Pago registrado exitosamente!
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Selección de pedido */}
            <div className="space-y-2">
              <Label htmlFor="order">Pedido con Deuda *</Label>
              {pendingOrders.length > 0 ? (
                <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar pedido..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - Deuda: ${order.balance_due.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  No hay pedidos con deuda pendiente registrada
                </p>
              )}
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="amount">Monto a Pagar *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
              {selectedOrderData && (
                <p className="text-xs text-muted-foreground">
                  Máximo: ${maxAmount.toFixed(2)} (deuda del pedido)
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de Pago *</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                  <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                  <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                  <SelectItem value="cheque">📝 Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Transferencia recibida el 10/12, comprobante #123"
                rows={2}
              />
            </div>

            {/* Comprobante (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="proof">Comprobante (opcional)</Label>
              <input
                ref={fileInputRef}
                id="proof"
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {!proofFile ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Paperclip className="h-5 w-5" />
                    <span className="text-sm">Adjuntar comprobante</span>
                    <span className="text-xs">Imagen, PDF o documento (max 5MB)</span>
                  </div>
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
                  {proofPreview ? (
                    <img
                      src={proofPreview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{proofFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(proofFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Resumen */}
            {selectedOrder && amount && parseFloat(amount) > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Resumen del pago:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                  <li>• Pedido: {selectedOrderData?.order_number}</li>
                  <li>• Monto: ${parseFloat(amount).toFixed(2)}</li>
                  <li>• Método: {paymentMethod === "transferencia" ? "Transferencia" : paymentMethod === "efectivo" ? "Efectivo" : paymentMethod === "cheque" ? "Cheque" : "Tarjeta"}</li>
                  <li>• Nueva deuda del pedido: ${Math.max(0, (selectedOrderData?.balance_due || 0) - parseFloat(amount)).toFixed(2)}</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || pendingOrders.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}




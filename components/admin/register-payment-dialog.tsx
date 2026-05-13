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
import { DollarSign, Loader2, Paperclip, X, FileText, CreditCard, Wallet } from "lucide-react"

type PaymentScope = "order" | "account"

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

  // Modo: pago a pedido o pago a cuenta general
  const [paymentScope, setPaymentScope] = useState<PaymentScope>("order")

  // Form state
  const [selectedOrder, setSelectedOrder] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia" | "tarjeta" | "cheque">("transferencia")
  const [notes, setNotes] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedOrderData = pendingOrders.find(o => o.id === selectedOrder)
  const maxAmount = paymentScope === "order"
    ? (selectedOrderData?.balance_due ?? undefined)
    : undefined  // sin límite en pago a cuenta

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("El archivo no puede superar 5MB"); return }
    setProofFile(file)
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => setProofPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setProofPreview(null)
    }
  }

  const removeFile = () => {
    setProofFile(null)
    setProofPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const uploadProofFile = async (): Promise<string | null> => {
    if (!proofFile) return null
    const supabase = createClient()
    const ext = proofFile.name.split(".").pop() || "file"
    const fileName = `payment_proof_${customerId}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("delivery").upload(fileName, proofFile, { cacheControl: "3600", upsert: false })
    if (error) { console.warn("Error uploading proof:", error); return null }
    const { data } = supabase.storage.from("delivery").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    setError(null)

    if (paymentScope === "order" && !selectedOrder) {
      setError("Debe seleccionar un pedido")
      return
    }

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Ingrese un monto válido mayor a $0")
      return
    }

    if (paymentScope === "order" && maxAmount !== undefined && amountNum > maxAmount) {
      setError(`El monto no puede superar la deuda del pedido ($${maxAmount.toFixed(2)})`)
      return
    }

    setIsLoading(true)
    try {
      const proofUrl = proofFile ? await uploadProofFile() : null

      const response = await fetch("/api/admin/register-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentScope,
          orderId: paymentScope === "order" ? selectedOrder : undefined,
          customerId,
          amount: amountNum,
          paymentMethod,
          notes: notes.trim() || null,
          proofUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Error al registrar el pago")

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
    setPaymentScope("order")
    setSelectedOrder("")
    setAmount("")
    setPaymentMethod("transferencia")
    setNotes("")
    setProofFile(null)
    setProofPreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const methodLabel = (m: string) =>
    m === "transferencia" ? "Transferencia" : m === "efectivo" ? "Efectivo" : m === "cheque" ? "Cheque" : "Tarjeta"

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="default">
          <DollarSign className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            {customerName}
            {currentBalance > 0 && ` · Deuda total: $${currentBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
            {currentBalance < 0 && ` · Saldo a favor: $${Math.abs(currentBalance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-600">¡Pago registrado exitosamente!</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Toggle de modo */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de pago</Label>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setPaymentScope("order"); setSelectedOrder(""); setAmount("") }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                    paymentScope === "order"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Aplicar a pedido
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentScope("account"); setSelectedOrder(""); setAmount("") }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-l ${
                    paymentScope === "account"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  Pago a cuenta
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {paymentScope === "order"
                  ? "El pago se descuenta de la deuda de un pedido específico."
                  : "El pago reduce el saldo general del cliente, sin asociarse a ningún pedido."}
              </p>
            </div>

            {/* Selector de pedido (solo en modo "order") */}
            {paymentScope === "order" && (
              <div className="space-y-2">
                <Label>Pedido con deuda <span className="text-destructive">*</span></Label>
                {pendingOrders.length > 0 ? (
                  <Select value={selectedOrder} onValueChange={(v) => { setSelectedOrder(v); setAmount("") }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar pedido..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingOrders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_number} — debe ${o.balance_due.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
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
            )}

            {/* Monto */}
            <div className="space-y-2">
              <Label>Monto a pagar <span className="text-destructive">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
              {paymentScope === "order" && selectedOrderData && (
                <p className="text-xs text-muted-foreground">
                  Máximo: ${selectedOrderData.balance_due.toLocaleString("es-AR", { minimumFractionDigits: 2 })} (deuda del pedido)
                </p>
              )}
              {paymentScope === "account" && currentBalance > 0 && (
                <p className="text-xs text-muted-foreground">
                  Deuda total: ${currentBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de pago <span className="text-destructive">*</span></Label>
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
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Transferencia recibida el 10/05, CBU 123..."
                rows={2}
              />
            </div>

            {/* Comprobante */}
            <div className="space-y-2">
              <Label>Comprobante (opcional)</Label>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
              {!proofFile ? (
                <Button type="button" variant="outline" className="w-full h-16 border-dashed" onClick={() => fileInputRef.current?.click()}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-sm">Adjuntar comprobante (imagen, PDF — max 5MB)</span>
                  </div>
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
                  {proofPreview
                    ? <img src={proofPreview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                    : <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{proofFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(proofFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeFile}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            {/* Resumen */}
            {amount && parseFloat(amount) > 0 && (paymentScope === "account" || selectedOrder) && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 mb-2">Resumen del pago</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {paymentScope === "order" && <li>• Pedido: {selectedOrderData?.order_number}</li>}
                  {paymentScope === "account" && <li>• Tipo: Pago a cuenta general</li>}
                  <li>• Monto: ${parseFloat(amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</li>
                  <li>• Método: {methodLabel(paymentMethod)}</li>
                  {paymentScope === "order" && selectedOrderData && (
                    <li>• Saldo restante del pedido: ${Math.max(0, selectedOrderData.balance_due - parseFloat(amount)).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</li>
                  )}
                  {paymentScope === "account" && (
                    <li>• Nuevo saldo del cliente: ${(currentBalance - parseFloat(amount)).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</li>
                  )}
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
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (paymentScope === "order" && pendingOrders.length === 0)}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</>
              ) : (
                <><DollarSign className="h-4 w-4 mr-2" />Confirmar Pago</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

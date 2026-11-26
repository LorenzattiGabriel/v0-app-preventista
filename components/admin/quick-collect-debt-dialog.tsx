"use client"

import { useRef, useState } from "react"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Loader2, Paperclip, X, FileText } from "lucide-react"
import {
  compressImage,
  createPreviewUrl,
  revokePreviewUrl,
  isImageFile,
  MAX_SOURCE_FILE_BYTES,
} from "@/lib/utils/image-compression"

interface QuickCollectDebtDialogProps {
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  balanceDue: number
}

/**
 * Acción directa desde el Cierre de Caja: registra el cobro de una venta
 * que quedó anotada "a cuenta corriente" pero que en realidad el cliente ya
 * pagó, sin tener que salir a la cuenta corriente del cliente.
 * Reusa el mismo endpoint que "Registrar pago" (modo "Aplicar a pedido").
 */
export function QuickCollectDebtDialog({
  orderId,
  orderNumber,
  customerId,
  customerName,
  balanceDue,
}: QuickCollectDebtDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState(balanceDue.toFixed(2))
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia" | "tarjeta" | "cheque">("efectivo")
  const [notes, setNotes] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setAmount(balanceDue.toFixed(2))
    setPaymentMethod("efectivo")
    setNotes("")
    setProofFile(null)
    revokePreviewUrl(proofPreview)
    setProofPreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setError("El archivo no puede superar 25MB")
      return
    }
    const prepared = await compressImage(file)
    if (prepared.size > 5 * 1024 * 1024) {
      setError("El archivo no puede superar 5MB")
      return
    }
    setProofFile(prepared)
    revokePreviewUrl(proofPreview)
    setProofPreview(isImageFile(prepared) ? createPreviewUrl(prepared) : null)
  }

  const removeFile = () => {
    setProofFile(null)
    revokePreviewUrl(proofPreview)
    setProofPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const uploadProofFile = async (): Promise<string | null> => {
    if (!proofFile) return null
    const supabase = createClient()
    const ext = proofFile.name.split(".").pop() || "file"
    const fileName = `debt_collect_${orderId}_${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from("delivery")
      .upload(fileName, proofFile, { cacheControl: "3600", upsert: false })
    if (error) {
      console.warn("Error uploading proof:", error)
      return null
    }
    const { data } = supabase.storage.from("delivery").getPublicUrl(fileName)
    return data.publicUrl
  }

  const amountNum = Number.parseFloat(amount) || 0

  const handleSubmit = async () => {
    setError(null)
    if (!amountNum || amountNum <= 0) {
      setError("Ingresá un monto válido mayor a $0")
      return
    }
    if (amountNum > balanceDue + 0.01) {
      setError(`El monto no puede superar la deuda de este pedido ($${balanceDue.toFixed(2)})`)
      return
    }

    setIsLoading(true)
    try {
      const proofUrl = proofFile ? await uploadProofFile() : null

      const response = await fetch("/api/admin/register-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentScope: "order",
          orderId,
          customerId,
          amount: amountNum,
          paymentMethod,
          notes: notes.trim() || "Cobro registrado desde Cierre de Caja",
          proofUrl,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al registrar el cobro")
        return
      }
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err) {
      console.error("Error registrando cobro:", err)
      setError("Error al registrar el cobro")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Marcar cobrado
      </Button>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Cobrar cuenta corriente</DialogTitle>
          <DialogDescription>
            {orderNumber} · {customerName} · debe ${balanceDue.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Monto cobrado <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pago <span className="text-destructive">*</span></Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                <SelectItem value="cheque">📝 Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: el cliente avisó que ya había pagado por transferencia"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Comprobante (opcional)</Label>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
            {!proofFile ? (
              <Button type="button" variant="outline" className="w-full h-14 border-dashed" onClick={() => fileInputRef.current?.click()}>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm">Adjuntar comprobante</span>
                </div>
              </Button>
            ) : (
              <div className="flex items-center gap-3 p-2 bg-muted rounded-lg border">
                {proofPreview ? (
                  <img src={proofPreview} alt="Preview" className="w-9 h-9 object-cover rounded" />
                ) : (
                  <div className="w-9 h-9 bg-blue-100 rounded flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <p className="flex-1 min-w-0 text-sm truncate">{proofFile.name}</p>
                <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Confirmar cobro"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

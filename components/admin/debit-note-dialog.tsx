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
  DialogTrigger,
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
import { FilePlus2, Loader2, Paperclip, X, FileText } from "lucide-react"
import { downloadDebitNote } from "@/lib/debit-note-generator"
import {
  compressImage,
  createPreviewUrl,
  revokePreviewUrl,
  isImageFile,
  MAX_SOURCE_FILE_BYTES,
} from "@/lib/utils/image-compression"

interface CustomerForPdf {
  commercial_name?: string
  street?: string
  street_number?: string
  locality?: string
  province?: string
  phone?: string
}

export interface OrderForDebitNote {
  id: string
  order_number: string
}

interface DebitNoteDialogProps {
  customerId: string
  customerName: string
  customer: CustomerForPdf
  /** Pedidos del cliente para vincular opcionalmente la ND (no obligatorio). */
  orders?: OrderForDebitNote[]
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "secondary"
}

export function DebitNoteDialog({
  customerId,
  customerName,
  customer,
  orders = [],
  triggerLabel = "Nota de débito",
  triggerVariant = "outline",
}: DebitNoteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [orderId, setOrderId] = useState<string>("none")
  const [notes, setNotes] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setAmount("")
    setReason("")
    setOrderId("none")
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
    const fileName = `debit_note_${customerId}_${Date.now()}.${ext}`
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
    if (reason.trim().length < 5) {
      setError("El motivo es obligatorio (mínimo 5 caracteres)")
      return
    }

    setIsLoading(true)
    try {
      const proofUrl = proofFile ? await uploadProofFile() : null

      const response = await fetch("/api/admin/debit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          orderId: orderId !== "none" ? orderId : null,
          reason: reason.trim(),
          amount: amountNum,
          notes: notes.trim() || undefined,
          proofUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al emitir la nota de débito")
        return
      }

      const nd = data.debitNote
      const linkedOrder = orders.find((o) => o.id === orderId)
      try {
        await downloadDebitNote({
          ...nd,
          customer,
          order_number: linkedOrder?.order_number ?? null,
        })
      } catch (pdfErr) {
        console.error("Error generando PDF de nota de débito:", pdfErr)
      }

      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err) {
      console.error("Error al emitir nota de débito:", err)
      setError("Error al emitir la nota de débito. Intentá nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          <FilePlus2 className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nota de débito · {customerName}</DialogTitle>
          <DialogDescription>
            Aumenta la deuda del cliente con un motivo documentado (ej: un cheque que vino rechazado).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Monto <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dn-reason">Motivo <span className="text-destructive">*</span></Label>
            <Textarea
              id="dn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Cheque rechazado - Banco Galicia nº 00012345"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Mínimo 5 caracteres. Queda impreso en la nota.</p>
          </div>

          <div className="space-y-2">
            <Label>Pedido vinculado (opcional)</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin pedido asociado</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2">
            <Label>Comprobante (opcional)</Label>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
            {!proofFile ? (
              <Button type="button" variant="outline" className="w-full h-14 border-dashed" onClick={() => fileInputRef.current?.click()}>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm">Adjuntar comprobante (ej: foto del cheque)</span>
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

          {amountNum > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              Se sumará <strong>${amountNum.toFixed(2)}</strong> a la deuda de {customerName}.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Emitiendo...</>
            ) : (
              <><FilePlus2 className="mr-2 h-4 w-4" />Emitir nota de débito</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

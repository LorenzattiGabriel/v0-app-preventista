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
import { Loader2, Paperclip, Receipt, X } from "lucide-react"

interface MarkInvoicedButtonProps {
  orderId: string
  orderNumber: string
  invoiceType?: string | null
}

export function MarkInvoicedButton({
  orderId,
  orderNumber,
  invoiceType,
}: MarkInvoicedButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setInvoiceNumber("")
    setFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setError("El archivo no puede superar 5MB")
      return
    }
    setFile(f)
    setError(null)
  }

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null
    const supabase = createClient()
    const ext = file.name.split(".").pop() || "file"
    const fileName = `invoice_${orderId}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from("delivery")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })
    if (upErr) {
      console.error("Error uploading invoice:", upErr)
      throw new Error("Error al subir el archivo")
    }
    const { data } = supabase.storage.from("delivery").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    setError(null)
    if (!invoiceNumber.trim() && !file) {
      setError("Ingresá un número de factura o adjuntá el archivo")
      return
    }
    setLoading(true)
    try {
      const fileUrl = await uploadFile()
      const res = await fetch(`/api/admin/orders/${orderId}/mark-invoiced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: invoiceNumber || null,
          invoice_file_url: fileUrl,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Error al marcar como facturada")
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="bg-orange-600 hover:bg-orange-700">
          <Receipt className="mr-2 h-4 w-4" />
          Marcar facturada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facturar pedido {orderNumber}</DialogTitle>
          <DialogDescription>
            {invoiceType ? `Factura tipo ${invoiceType}. ` : ""}
            Cargá el número y/o adjuntá el archivo de la factura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-number">Número de factura</Label>
            <Input
              id="invoice-number"
              placeholder="Ej: 0001-00012345"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Archivo (PDF o imagen, máx. 5MB)</Label>
            {file ? (
              <div className="flex items-center justify-between gap-2 p-2 border rounded-lg">
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Adjuntar factura
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive border border-destructive/40 bg-destructive/10 p-2 rounded">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Confirmar facturación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

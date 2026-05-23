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
import { Textarea } from "@/components/ui/textarea"
import {
  Wallet,
  Loader2,
  Paperclip,
  X,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react"

type AdjustmentDirection = "debit" | "credit"
type Step = "form" | "confirm"

interface AdjustBalanceDialogProps {
  customerId: string
  customerName: string
  currentBalance: number
}

export function AdjustBalanceDialog({
  customerId,
  customerName,
  currentBalance,
}: AdjustBalanceDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [direction, setDirection] = useState<AdjustmentDirection>("debit")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const amountNum = parseFloat(amount) || 0
  const newBalance = direction === "debit" ? currentBalance + amountNum : currentBalance - amountNum

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo no puede superar 5MB")
      return
    }
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
    const fileName = `account_adjustment_${customerId}_${Date.now()}.${ext}`
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

  const validateStep1 = (): boolean => {
    setError(null)
    if (!amountNum || amountNum <= 0) {
      setError("Ingresá un monto válido mayor a $0")
      return false
    }
    if (reason.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres")
      return false
    }
    return true
  }

  const goToConfirm = () => {
    if (validateStep1()) {
      setStep("confirm")
    }
  }

  const handleSubmit = async () => {
    setError(null)
    if (confirmText.trim().toUpperCase() !== "CONFIRMAR") {
      setError('Escribí "CONFIRMAR" para autorizar el ajuste')
      return
    }

    setIsLoading(true)
    try {
      const proofUrl = proofFile ? await uploadProofFile() : null

      const response = await fetch("/api/admin/account-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          direction,
          amount: amountNum,
          reason: reason.trim(),
          confirmText: confirmText.trim(),
          proofUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Error al registrar el ajuste")

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        resetForm()
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el ajuste")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setStep("form")
    setDirection("debit")
    setAmount("")
    setReason("")
    setConfirmText("")
    setProofFile(null)
    setProofPreview(null)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatARS = (n: number) =>
    n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Wallet className="h-4 w-4 mr-1" />
          Ajustar saldo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Ajuste de cuenta corriente" : "Confirmar ajuste"}
          </DialogTitle>
          <DialogDescription>
            {customerName}
            {currentBalance > 0 && ` · Deuda actual: $${formatARS(currentBalance)}`}
            {currentBalance < 0 && ` · Saldo a favor: $${formatARS(Math.abs(currentBalance))}`}
            {currentBalance === 0 && " · Sin saldo"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-600">¡Ajuste registrado exitosamente!</p>
          </div>
        ) : step === "form" ? (
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de ajuste</Label>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDirection("debit")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                    direction === "debit"
                      ? "bg-red-600 text-white"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Aumentar deuda
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("credit")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-l ${
                    direction === "credit"
                      ? "bg-green-600 text-white"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                  Reducir deuda
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {direction === "debit"
                  ? "Cargar saldo inicial preexistente o registrar deuda manual."
                  : "Aplicar nota de crédito o corrección a favor del cliente."}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Monto <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  $
                </span>
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
              <Label>
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Saldo inicial migración desde sistema anterior, nota de crédito 0001-00000123..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Mínimo 10 caracteres. Quedará registrado en el movimiento.</p>
            </div>

            <div className="space-y-2">
              <Label>Comprobante (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              {!proofFile ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-16 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-sm">Adjuntar comprobante (imagen, PDF — max 5MB)</span>
                  </div>
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
                  {proofPreview ? (
                    <img src={proofPreview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{proofFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(proofFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {amountNum > 0 && (
              <div
                className={`p-4 rounded-lg border ${
                  direction === "debit"
                    ? "bg-red-50 border-red-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold mb-2 ${
                    direction === "debit" ? "text-red-800" : "text-green-800"
                  }`}
                >
                  Resumen del ajuste
                </p>
                <ul
                  className={`text-sm space-y-1 ${
                    direction === "debit" ? "text-red-700" : "text-green-700"
                  }`}
                >
                  <li>• Saldo actual: ${formatARS(currentBalance)}</li>
                  <li>
                    • {direction === "debit" ? "Se sumará" : "Se restará"}: ${formatARS(amountNum)}
                  </li>
                  <li className="font-semibold">
                    • Nuevo saldo:{" "}
                    {newBalance > 0
                      ? `$${formatARS(newBalance)} (deuda)`
                      : newBalance < 0
                      ? `-$${formatARS(Math.abs(newBalance))} (a favor)`
                      : "$0.00"}
                  </li>
                </ul>
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Esta acción no se puede deshacer.</p>
                <p className="text-xs mt-1">
                  El movimiento queda registrado de forma permanente en la cuenta corriente. Para revertirlo
                  deberás crear un ajuste opuesto.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Step: confirm
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg border space-y-2">
              <p className="text-sm font-semibold">Confirmá los datos del ajuste</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className={`font-medium ${direction === "debit" ? "text-red-600" : "text-green-600"}`}>
                    {direction === "debit" ? "↑ Aumentar deuda" : "↓ Reducir deuda"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-medium">${formatARS(amountNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo actual:</span>
                  <span className="font-medium">${formatARS(currentBalance)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground font-semibold">Nuevo saldo:</span>
                  <span
                    className={`font-bold ${
                      newBalance > 0
                        ? "text-red-600"
                        : newBalance < 0
                        ? "text-green-600"
                        : ""
                    }`}
                  >
                    {newBalance > 0
                      ? `$${formatARS(newBalance)}`
                      : newBalance < 0
                      ? `-$${formatARS(Math.abs(newBalance))}`
                      : "$0.00"}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
                  <p className="text-sm italic">"{reason.trim()}"</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 font-medium">
                Esta operación es definitiva y no podrá deshacerse.
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Escribí <span className="font-mono font-semibold">CONFIRMAR</span> para autorizar{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                autoFocus
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Esta confirmación evita ajustes accidentales. La operación queda registrada con tu usuario.
              </p>
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            {step === "form" ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button onClick={goToConfirm} disabled={isLoading}>
                  Continuar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("form")
                    setConfirmText("")
                    setError(null)
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || confirmText.trim().toUpperCase() !== "CONFIRMAR"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Confirmar ajuste
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
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
import { KeyRound, Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface Props {
  customerId: string
  customerCode: string
  /** true si ya se confirmó (vía GET previo) que el cliente tiene portal activo. */
  hasAccess: boolean
}

const MIN_LENGTH = 6

export function CustomerAccessCodeDialog({ customerId, customerCode, hasAccess: initialHasAccess }: Props) {
  const [open, setOpen] = useState(false)
  const [hasAccess, setHasAccess] = useState(initialHasAccess)
  const [code, setCode] = useState("")
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const resetForm = () => {
    setCode("")
    setGeneratedCode(null)
    setCopied(false)
  }

  const handleSave = async () => {
    if (code.length < MIN_LENGTH) {
      toast.error(`El código debe tener al menos ${MIN_LENGTH} caracteres`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/access-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "Error al generar el código")
        return
      }
      setHasAccess(true)
      setGeneratedCode(code)
      toast.success(hasAccess ? "Código actualizado" : "Código generado")
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm("¿Revocar el acceso al portal de este cliente? Podrás generarle un código nuevo cuando quieras.")) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/access-code`, { method: "DELETE" })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "Error al revocar el acceso")
        return
      }
      setHasAccess(false)
      toast.success("Acceso revocado")
    } finally {
      setRevoking(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedCode) return
    await navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4 mr-1" />
          {hasAccess ? "Portal del cliente" : "Dar acceso al portal"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Portal del cliente</DialogTitle>
          <DialogDescription>
            El cliente entra en <span className="font-mono">/cliente/login</span> con su código de cuenta (
            <span className="font-mono">{customerCode}</span>) y este código de acceso. Solo ve su propia cuenta
            corriente.
          </DialogDescription>
        </DialogHeader>

        {generatedCode ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
              <p className="text-xs text-muted-foreground">Código de cuenta (para identificarse)</p>
              <p className="font-mono text-lg">{customerCode}</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Código de acceso</p>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="font-mono text-lg">{generatedCode}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Anotá o pasale estos dos datos al cliente — no se puede volver a mostrar el código después de cerrar
              esta ventana (podés generarle uno nuevo cuando quieras).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="access-code">
                {hasAccess ? "Nuevo código de acceso" : "Código de acceso"}
              </Label>
              <Input
                id="access-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Mínimo 6 caracteres, número o texto"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          {hasAccess && !generatedCode && (
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking || saving}>
              {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revocar acceso
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {generatedCode ? (
              <Button onClick={() => setOpen(false)}>Listo</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving || revoking}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {hasAccess ? "Actualizar código" : "Generar código"}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

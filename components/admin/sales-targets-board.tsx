"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createSalesTargetsService, type SalesTargetProgress, type SalesTargetChannel, type SalesTargetScope } from "@/lib/services/salesTargetsService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Loader2, Truck, Store } from "lucide-react"
import { toast } from "sonner"

interface Person {
  id: string
  full_name: string
}

interface Props {
  periodMonth: string
  targets: SalesTargetProgress[]
  preventistas: Person[]
  ventaDirectaSellers: Person[]
}

const fmtMoney = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const CHANNEL_LABELS: Record<SalesTargetChannel, string> = {
  preventista: "Preventista (reparto)",
  venta_directa: "Venta directa",
}

export function SalesTargetsBoard({ periodMonth, targets, preventistas, ventaDirectaSellers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [channel, setChannel] = useState<SalesTargetChannel>("preventista")
  const [scope, setScope] = useState<SalesTargetScope>("general")
  const [assignedTo, setAssignedTo] = useState<string>("")
  const [amount, setAmount] = useState("")

  const peopleForChannel = channel === "preventista" ? preventistas : ventaDirectaSellers

  const resetForm = () => {
    setChannel("preventista")
    setScope("general")
    setAssignedTo("")
    setAmount("")
  }

  const handleCreate = async () => {
    const targetAmount = parseFloat(amount.replace(",", "."))
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    if (scope === "individual" && !assignedTo) {
      toast.error("Elegí a quién asignarle el objetivo")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Sesión inválida")
        return
      }
      const service = createSalesTargetsService(supabase)
      const result = await service.createTarget({
        periodMonth,
        channel,
        scope,
        assignedTo: scope === "individual" ? assignedTo : null,
        targetAmount,
        createdBy: user.id,
      })

      if (!result.success) {
        toast.error(result.error || "Error al crear el objetivo")
        return
      }

      toast.success("Objetivo creado")
      setOpen(false)
      resetForm()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este objetivo?")) return
    setDeletingId(id)
    try {
      const supabase = createClient()
      const service = createSalesTargetsService(supabase)
      const result = await service.deleteTarget(id)
      if (!result.success) {
        toast.error(result.error || "Error al eliminar")
        return
      }
      toast.success("Objetivo eliminado")
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const byChannel = (ch: SalesTargetChannel) => targets.filter((t) => t.channel === ch)

  const renderChannel = (ch: SalesTargetChannel) => {
    const rows = byChannel(ch)
    return (
      <div key={ch} className="space-y-3">
        <div className="flex items-center gap-2">
          {ch === "preventista" ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
          <h3 className="font-medium">{CHANNEL_LABELS[ch]}</h3>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-6">Sin objetivos cargados para este mes</p>
        ) : (
          <div className="space-y-2">
            {rows.map((t) => {
              const pct = Math.min(100, t.percent)
              const overTarget = t.percent >= 100
              return (
                <div key={t.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={t.scope === "general" ? "secondary" : "outline"}>
                        {t.scope === "general" ? "General" : t.assigned_to_name || "Individual"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${overTarget ? "text-green-600" : ""}`}>
                        {fmtMoney(t.actual_amount)} / {fmtMoney(t.target_amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={deletingId === t.id}
                        onClick={() => handleDelete(t.id)}
                      >
                        {deletingId === t.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className={overTarget ? "[&>div]:bg-green-600" : ""} />
                  <p className="text-xs text-muted-foreground text-right">{t.percent.toFixed(1)}% cumplido</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo objetivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo objetivo de venta</DialogTitle>
              <DialogDescription>Para el mes seleccionado ({periodMonth.slice(0, 7)})</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={(v) => { setChannel(v as SalesTargetChannel); setAssignedTo("") }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventista">Preventista (reparto)</SelectItem>
                    <SelectItem value="venta_directa">Venta directa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Alcance</Label>
                <Select value={scope} onValueChange={(v) => { setScope(v as SalesTargetScope); setAssignedTo("") }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (todo el canal)</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scope === "individual" && (
                <div className="space-y-1.5">
                  <Label>Asignar a</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {peopleForChannel.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay personas activas en este canal
                        </div>
                      ) : (
                        peopleForChannel.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Objetivo ($)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="200000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear objetivo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {renderChannel("preventista")}
      {renderChannel("venta_directa")}
    </div>
  )
}

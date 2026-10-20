"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Clock,
  Info,
  RotateCcw,
  Pencil,
  AlertTriangle,
} from "lucide-react"
import { ActionButton } from "@/components/shared/action-button"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Stop {
  orderId: string
  orderNumber: string
  customerName: string
  address: string
  locality: string
  addressNotes: string | null
  hasTimeRestriction: boolean
  windowStart: string | null
  windowEnd: string | null
  timeRestrictionNotes: string | null
  total: number
  processed: boolean
}

interface Props {
  routeId: string
  routeStatus: string
  stops: Stop[]
  /** Orden sugerido por el sistema, del snapshot optimized_route */
  automaticOrder: string[] | null
}

function StopRow({
  stop,
  position,
  total,
  onMove,
  onSetPosition,
  disabled,
}: {
  stop: Stop
  position: number
  total: number
  onMove: (delta: number) => void
  onSetPosition: (value: number) => void
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.orderId,
    disabled: disabled || stop.processed,
  })

  const [positionDraft, setPositionDraft] = useState("")

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const commitPosition = () => {
    const value = Number.parseInt(positionDraft)
    setPositionDraft("")
    if (!Number.isFinite(value)) return
    if (value < 1 || value > total) {
      toast.error(`La posición tiene que estar entre 1 y ${total}`)
      return
    }
    onSetPosition(value)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-start gap-3 p-3 rounded-lg border ${
        stop.processed ? "bg-muted/50" : "bg-background"
      } ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
    >
      <button
        type="button"
        disabled={disabled || stop.processed}
        className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 mt-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar parada ${position}`}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {position}
      </div>

      <div className="flex-1 min-w-[200px] space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{stop.customerName}</span>
          <Badge variant="outline">{stop.orderNumber}</Badge>
          {stop.processed && <Badge variant="secondary">Ya visitada</Badge>}
        </div>

        <p className="text-sm text-muted-foreground">
          {stop.address}
          {stop.locality ? ` · ${stop.locality}` : ""}
        </p>

        {stop.addressNotes && (
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {stop.addressNotes}
          </p>
        )}

        {stop.hasTimeRestriction && (
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {stop.windowStart && stop.windowEnd
              ? `Entregar entre ${stop.windowStart.slice(0, 5)} y ${stop.windowEnd.slice(0, 5)}`
              : "Tiene restricción horaria"}
            {stop.timeRestrictionNotes ? ` · ${stop.timeRestrictionNotes}` : ""}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Input
          type="number"
          min={1}
          max={total}
          placeholder={String(position)}
          value={positionDraft}
          disabled={disabled || stop.processed}
          onChange={(e) => setPositionDraft(e.target.value)}
          onBlur={commitPosition}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitPosition()
            }
          }}
          className="w-16 h-8 text-center"
          aria-label="Número de posición"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={disabled || stop.processed || position === 1}
          onClick={() => onMove(-1)}
          aria-label="Subir"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={disabled || stop.processed || position === total}
          onClick={() => onMove(1)}
          aria-label="Bajar"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function RouteOrderEditor({ routeId, routeStatus, stops, automaticOrder }: Props) {
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [order, setOrder] = useState<string[]>(stops.map((s) => s.orderId))
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmInProgress, setConfirmInProgress] = useState(false)

  const stopById = useMemo(() => new Map(stops.map((s) => [s.orderId, s])), [stops])
  const originalOrder = useMemo(() => stops.map((s) => s.orderId), [stops])
  const hasChanges = order.some((id, i) => id !== originalOrder[i])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const isLocked = !["PLANIFICADO", "EN_CURSO"].includes(routeStatus)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const from = prev.indexOf(String(active.id))
      const to = prev.indexOf(String(over.id))
      if (from === -1 || to === -1) return prev
      return arrayMove(prev, from, to)
    })
  }

  function move(orderId: string, delta: number) {
    setOrder((prev) => {
      const from = prev.indexOf(orderId)
      const to = from + delta
      if (from === -1 || to < 0 || to >= prev.length) return prev
      return arrayMove(prev, from, to)
    })
  }

  function setPosition(orderId: string, position: number) {
    setOrder((prev) => {
      const from = prev.indexOf(orderId)
      if (from === -1) return prev
      return arrayMove(prev, from, position - 1)
    })
  }

  function restoreAutomatic() {
    if (!automaticOrder) return
    // El snapshot puede tener pedidos que ya no están en la ruta (o al revés),
    // así que se arma respetando el snapshot y se agrega al final lo que falte.
    const inSnapshot = automaticOrder.filter((id) => stopById.has(id))
    const missing = originalOrder.filter((id) => !inSnapshot.includes(id))
    setOrder([...inSnapshot, ...missing])
    toast.info("Se cargó el orden automático. Revisalo y guardá para aplicarlo.")
  }

  async function save(force = false) {
    if (!hasChanges) {
      toast.error("No hay cambios en el orden")
      return
    }
    if (reason.trim().length < 5) {
      toast.error("Escribí el motivo del cambio (mínimo 5 caracteres)")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/routes/${routeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_orders: order.map((orderId, index) => ({
            order_id: orderId,
            delivery_order: index + 1,
          })),
          reason,
          confirm_in_progress: force,
        }),
      })
      const data = await res.json()

      if (res.status === 409 && data.requiresConfirmation) {
        setConfirmInProgress(true)
        return
      }
      if (!res.ok) throw new Error(data.error || "Error al guardar el orden")

      toast.success(data.message)
      setEditing(false)
      setReason("")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message, { duration: 10000 })
    } finally {
      setSaving(false)
    }
  }

  if (isLocked) return null

  if (!editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Orden de entregas</CardTitle>
              <CardDescription>
                Definí el orden definitivo con el que el repartidor va a hacer el reparto.
              </CardDescription>
            </div>
            <Button onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar orden de entregas
            </Button>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const orderedStops = order.map((id) => stopById.get(id)).filter(Boolean) as Stop[]

  return (
    <>
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="text-base">Editar orden de entregas</CardTitle>
          <CardDescription>
            Arrastrá las paradas, usá las flechas o escribí el número de posición. Los cambios se
            aplican recién cuando guardás: lo que ves acá es la vista previa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {routeStatus === "EN_CURSO" && (
            <div className="flex items-start gap-2 p-3 rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>La ruta ya está en curso.</strong> El repartidor puede estar manejando con el
                orden actual en pantalla. Las paradas ya visitadas no se pueden mover.
              </p>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedStops.map((stop, index) => (
                  <StopRow
                    key={stop.orderId}
                    stop={stop}
                    position={index + 1}
                    total={orderedStops.length}
                    disabled={saving}
                    onMove={(delta) => move(stop.orderId, delta)}
                    onSetPosition={(value) => setPosition(stop.orderId, value)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="space-y-2">
            <Label htmlFor="reorder-reason">Motivo del cambio *</Label>
            <Textarea
              id="reorder-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: el cliente de la parada 8 pidió recibir temprano"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Queda registrado en el historial de cambios de la ruta.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving || !automaticOrder}
                onClick={restoreAutomatic}
                title={
                  automaticOrder
                    ? "Vuelve al orden que propuso el sistema"
                    : "Esta ruta no tiene guardado el orden automático"
                }
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar orden automático
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={saving || !hasChanges}
                onClick={() => setOrder(originalOrder)}
              >
                Deshacer cambios
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditing(false)
                  setOrder(originalOrder)
                  setReason("")
                }}
              >
                Cancelar
              </Button>
              <ActionButton
                onClick={() => save(false)}
                pending={saving}
                pendingText="Guardando…"
                disabled={!hasChanges}
              >
                Guardar orden definitivo
              </ActionButton>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmInProgress} onOpenChange={setConfirmInProgress}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>La ruta ya está en curso</AlertDialogTitle>
            <AlertDialogDescription>
              El repartidor ya salió y puede tener el orden actual en pantalla. Si guardás, va a ver
              el orden nuevo la próxima vez que se actualice la hoja de ruta. ¿Confirmás el cambio?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>No, dejarlo como está</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault()
                setConfirmInProgress(false)
                void save(true)
              }}
            >
              Sí, cambiar el orden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { ActionButton } from "@/components/shared/action-button"
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

interface Zone {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface Props {
  zones: Zone[]
  customerCounts: Record<string, number>
}

export function ZonesManager({ zones, customerCounts }: Props) {
  const router = useRouter()

  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null)

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Escribí el nombre de la zona")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear la zona")

      toast.success(data.message)
      setNewName("")
      setNewDescription("")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function patchZone(id: string, body: Record<string, any>, successMessage?: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/zones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al actualizar")

      toast.success(successMessage || data.message)
      setEditingId(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(zone: Zone) {
    setSavingId(zone.id)
    try {
      const res = await fetch(`/api/admin/zones/${zone.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al eliminar")

      toast.success(data.message)
      setDeleteTarget(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message, { duration: 10000 })
      setDeleteTarget(null)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Alta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva zona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="zone-name">Nombre *</Label>
              <Input
                id="zone-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: MIRAMAR"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate()
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone-description">Descripción (opcional)</Label>
              <Input
                id="zone-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ej: clientes de la costa"
              />
            </div>
            <ActionButton onClick={handleCreate} pending={creating} pendingText="Creando…">
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </ActionButton>
          </div>
        </CardContent>
      </Card>

      {/* Listado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Zonas cargadas</CardTitle>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Todavía no hay zonas cargadas</p>
          ) : (
            <div className="space-y-2">
              {zones.map((zone) => {
                const count = customerCounts[zone.id] || 0
                const isEditing = editingId === zone.id
                const isBusy = savingId === zone.id

                return (
                  <div
                    key={zone.id}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 min-w-[160px]"
                        />
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Descripción"
                          className="flex-1 min-w-[160px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() =>
                              patchZone(zone.id, { name: editName, description: editDescription })
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-[180px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{zone.name}</span>
                            {zone.is_active ? (
                              <Badge variant="secondary">Activa</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Inactiva
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {count} cliente{count === 1 ? "" : "s"}
                            {zone.description ? ` · ${zone.description}` : ""}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => {
                              setEditingId(zone.id)
                              setEditName(zone.name)
                              setEditDescription(zone.description || "")
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                              patchZone(
                                zone.id,
                                { is_active: !zone.is_active },
                                zone.is_active
                                  ? `"${zone.name}" ya no aparece al cargar clientes`
                                  : `"${zone.name}" vuelve a estar disponible`,
                              )
                            }
                          >
                            {zone.is_active ? "Desactivar" : "Activar"}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isBusy || count > 0}
                            title={
                              count > 0
                                ? "Tiene clientes asignados: desactivala en vez de borrarla"
                                : "Eliminar zona"
                            }
                            onClick={() => setDeleteTarget(zone)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar zona</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar la zona &quot;{deleteTarget?.name}&quot;. No tiene clientes asignados,
              así que no afecta a ningún cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (deleteTarget) handleDelete(deleteTarget)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

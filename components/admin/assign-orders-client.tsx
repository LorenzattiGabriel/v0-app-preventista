"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, CheckCircle, Users, Package } from "lucide-react"

interface OrderRow {
  id: string
  order_number: string
  delivery_date: string
  priority: string
  total: number
  assembled_by: string | null
  customer: any
}

interface Armador {
  id: string
  full_name: string
  email: string
}

interface Props {
  orders: OrderRow[]
  armadores: Armador[]
}

const PRIORITY_COLORS: Record<string, string> = {
  urgente: "bg-red-100 text-red-700 border-red-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  media: "bg-yellow-100 text-yellow-700 border-yellow-200",
  normal: "bg-gray-100 text-gray-700 border-gray-200",
  baja: "bg-green-100 text-green-700 border-green-200",
}

export function AssignOrdersClient({ orders, armadores }: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<"all" | "unassigned" | string>("all")
  const [bulkArmador, setBulkArmador] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const armadorById = useMemo(() => {
    const map = new Map<string, Armador>()
    armadores.forEach((a) => map.set(a.id, a))
    return map
  }, [armadores])

  // Resumen: cuántos pedidos por armador
  const summary = useMemo(() => {
    const counts = new Map<string, number>()
    let unassignedCount = 0
    orders.forEach((o) => {
      if (o.assembled_by) {
        counts.set(o.assembled_by, (counts.get(o.assembled_by) || 0) + 1)
      } else {
        unassignedCount += 1
      }
    })
    return { counts, unassignedCount }
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders
    if (filter === "unassigned") return orders.filter((o) => !o.assembled_by)
    return orders.filter((o) => o.assembled_by === filter)
  }, [orders, filter])

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)))
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const callAssign = async (orderIds: string[], armadorId: string | null) => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_ids: orderIds, armador_id: armadorId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Error al asignar")
      setSuccess(
        armadorId
          ? `${data.assigned_count} pedido(s) asignados a ${data.armador_name}`
          : `${data.assigned_count} pedido(s) desasignados`
      )
      setSelectedIds(new Set())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkAssign = () => {
    if (selectedIds.size === 0) {
      setError("No hay pedidos seleccionados")
      return
    }
    if (!bulkArmador) {
      setError("Seleccioná un armador")
      return
    }
    const armadorId = bulkArmador === "__unassign__" ? null : bulkArmador
    callAssign(Array.from(selectedIds), armadorId)
  }

  const handlePerRowAssign = (orderId: string, value: string) => {
    const armadorId = value === "__unassign__" ? null : value
    callAssign([orderId], armadorId)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Resumen por armador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Distribución actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setFilter("unassigned")}
              className={`p-3 rounded-lg border text-left transition ${
                filter === "unassigned"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <p className="text-xs text-muted-foreground">Sin asignar</p>
              <p className="text-2xl font-bold">{summary.unassignedCount}</p>
            </button>
            {armadores.map((a) => (
              <button
                key={a.id}
                onClick={() => setFilter(a.id)}
                className={`p-3 rounded-lg border text-left transition ${
                  filter === a.id
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <p className="text-xs text-muted-foreground truncate">{a.full_name}</p>
                <p className="text-2xl font-bold">{summary.counts.get(a.id) || 0}</p>
              </button>
            ))}
          </div>
          {filter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setFilter("all")}
            >
              Ver todos
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Toolbar de asignación masiva */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pedidos pendientes ({filteredOrders.length})
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {selectedIds.size} seleccionado(s)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Select value={bulkArmador} onValueChange={setBulkArmador}>
              <SelectTrigger className="sm:w-[260px]">
                <SelectValue placeholder="Asignar seleccionados a..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassign__">Sin asignar</SelectItem>
                {armadores.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBulkAssign}
              disabled={
                isLoading || selectedIds.size === 0 || !bulkArmador
              }
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aplicar a {selectedIds.size}
            </Button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No hay pedidos en este filtro</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left w-10">
                      <Checkbox
                        checked={
                          filteredOrders.length > 0 &&
                          selectedIds.size === filteredOrders.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Pedido</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Entrega</th>
                    <th className="px-3 py-2 text-left">Prioridad</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Armador</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const assigned = order.assembled_by
                      ? armadorById.get(order.assembled_by)
                      : null
                    return (
                      <tr key={order.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleOne(order.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {order.order_number}
                        </td>
                        <td className="px-3 py-2">
                          {order.customer?.commercial_name || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(order.delivery_date).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={PRIORITY_COLORS[order.priority] || ""}
                          >
                            {order.priority}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ${Number(order.total).toLocaleString("es-AR")}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={order.assembled_by || "__unassign__"}
                            onValueChange={(v) => handlePerRowAssign(order.id, v)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="h-8 w-[180px]">
                              <SelectValue>
                                {assigned ? assigned.full_name : "Sin asignar"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassign__">Sin asignar</SelectItem>
                              {armadores.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

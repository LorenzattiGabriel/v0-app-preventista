"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertTriangle,
  CheckCircle,
  Users,
  Package,
  HelpCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const PAGE_SIZE = 10

interface OrderRow {
  id: string
  order_number: string
  delivery_date: string
  priority: string
  total: number
  assembled_by: string | null
  early_assembly_allowed?: boolean
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
  const [filter, setFilter] = useState<"all" | "unassigned" | string>("all")
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
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
    let list = orders
    if (filter === "unassigned") list = list.filter((o) => !o.assembled_by)
    else if (filter !== "all") list = list.filter((o) => o.assembled_by === filter)

    if (priorityFilter !== "all") {
      list = list.filter((o) => o.priority === priorityFilter)
    }

    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((o) => {
        const num = (o.order_number || "").toLowerCase()
        const cliente = (o.customer?.commercial_name || "").toLowerCase()
        const loc = (o.customer?.locality || "").toLowerCase()
        return num.includes(term) || cliente.includes(term) || loc.includes(term)
      })
    }
    return list
  }, [orders, filter, priorityFilter, search])

  // Resetear paginación cuando cambian filtros
  useEffect(() => {
    setPage(1)
  }, [filter, priorityFilter, search])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredOrders.slice(start, start + PAGE_SIZE)
  }, [filteredOrders, currentPage])

  const clearFilters = () => {
    setFilter("all")
    setPriorityFilter("all")
    setSearch("")
  }

  // 🆕 Toggle de armado anticipado para un pedido
  const toggleEarlyAssembly = async (orderId: string, current: boolean) => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/orders/early-assembly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_ids: [orderId], allowed: !current }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Error al actualizar")
      setSuccess(
        !current
          ? "Armado anticipado habilitado"
          : "Armado anticipado deshabilitado"
      )
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
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
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
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

      {/* Filtro por armador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Filtrar por armador
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

      {/* Listado de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pedidos pendientes ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros adicionales */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por pedido, cliente o localidad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            {(filter !== "all" || priorityFilter !== "all" || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
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
                    <th className="px-3 py-2 text-left">Pedido</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Entrega</th>
                    <th className="px-3 py-2 text-left">Prioridad</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Armador</th>
                    <th className="px-3 py-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span>Adelantar armado</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Qué significa adelantar armado"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 text-xs" align="end">
                            <p className="font-semibold mb-1">¿Qué es adelantar el armado?</p>
                            <p className="text-muted-foreground">
                              Por defecto, los armadores sólo pueden armar pedidos cuya
                              fecha de entrega es <strong>hoy o mañana</strong>. Esto evita
                              que se armen pedidos demasiado temprano y queden ocupando
                              lugar en el depósito.
                            </p>
                            <p className="text-muted-foreground mt-2">
                              Si tildás esta casilla, autorizás a que se arme antes de
                              tiempo. Útil cuando hay capacidad de sobra o un cliente pidió
                              tener listo el pedido con anticipación.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((order) => {
                    const assigned = order.assembled_by
                      ? armadorById.get(order.assembled_by)
                      : null
                    return (
                      <tr key={order.id} className="border-t hover:bg-muted/30">
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
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={order.early_assembly_allowed === true}
                            onCheckedChange={() =>
                              toggleEarlyAssembly(order.id, order.early_assembly_allowed === true)
                            }
                            disabled={isLoading}
                            aria-label="Permitir armar antes de la fecha de entrega"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {filteredOrders.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} de{" "}
                {filteredOrders.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

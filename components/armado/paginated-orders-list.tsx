"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ChevronLeft, ChevronRight, FileText, MessageCircle, Search, X } from "lucide-react"
import { downloadAssemblyReceipt, getAssemblyReceiptBlob } from "@/lib/receipt-generator"
import { shareOnWhatsApp } from "@/lib/share-utils"
import { toast } from "sonner"

type Priority = "urgente" | "alta" | "media" | "normal" | "baja"

const PRIORITY_LABEL: Record<Priority, string> = {
  urgente: "🔴 Urgente",
  alta: "🟠 Alta",
  media: "🟡 Media",
  normal: "🔵 Normal",
  baja: "⚪ Baja",
}

const PRIORITY_ORDER: Record<Priority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  normal: 3,
  baja: 4,
}

const PRIORITY_BORDER: Record<Priority, string> = {
  urgente: "border-l-4 border-l-red-500",
  alta: "border-l-4 border-l-orange-500",
  media: "border-l-4 border-l-yellow-400",
  normal: "border-l-4 border-l-blue-400",
  baja: "border-l-4 border-l-gray-300",
}

interface PaginatedOrdersListProps {
  orders: any[]
  userId: string
  itemsPerPage?: number
  title: string
  emptyMessage: string
  variant: "pending" | "inProgress" | "finished"
}

export function PaginatedOrdersList({
  orders,
  userId,
  itemsPerPage = 10,
  title,
  emptyMessage,
  variant,
}: PaginatedOrdersListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all")

  // Priorities present in this list
  const availablePriorities = useMemo(() => {
    const set = new Set<Priority>()
    orders.forEach((o) => { if (o.priority) set.add(o.priority as Priority) })
    return Array.from(set).sort((a, b) => PRIORITY_ORDER[a] - PRIORITY_ORDER[b])
  }, [orders])

  // Filtered orders
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return orders.filter((o) => {
      const matchSearch =
        !q ||
        o.order_number?.toLowerCase().includes(q) ||
        o.customers?.commercial_name?.toLowerCase().includes(q) ||
        o.customers?.locality?.toLowerCase().includes(q)
      const matchPriority = priorityFilter === "all" || o.priority === priorityFilter
      return matchSearch && matchPriority
    })
  }, [orders, searchQuery, priorityFilter])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  // Reset to page 1 when filters change
  const safePage = Math.min(currentPage, totalPages || 1)
  const startIndex = (safePage - 1) * itemsPerPage
  const paginatedOrders = filtered.slice(startIndex, startIndex + itemsPerPage)

  const showFilters = orders.length >= 3 || variant === "inProgress"

  const clearSearch = () => {
    setSearchQuery("")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{title}</h3>
        {orders.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {filtered.length !== orders.length
              ? `${filtered.length} de ${orders.length}`
              : `${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}`}
          </span>
        )}
      </div>

      {/* Filters — solo si hay órdenes */}
      {showFilters && orders.length > 0 && (
        <div className="space-y-2">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente o localidad..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro de prioridad — solo si hay más de una prioridad */}
          {availablePriorities.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setPriorityFilter("all"); setCurrentPage(1) }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  priorityFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary"
                }`}
              >
                Todas
              </button>
              {availablePriorities.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPriorityFilter(p); setCurrentPage(1) }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    priorityFilter === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">{emptyMessage}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-muted-foreground text-sm">No hay pedidos que coincidan con el filtro.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setPriorityFilter("all") }}>
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <>
          {paginatedOrders.map((order) => (
            <OrderCard key={order.id} order={order} userId={userId} variant={variant} />
          ))}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                Página {safePage} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={safePage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OrderCard({ order, userId, variant }: { order: any; userId: string; variant: string }) {
  const priority = (order.priority || "normal") as Priority
  const borderClass = PRIORITY_BORDER[priority] || PRIORITY_BORDER.normal

  if (variant === "finished") {
    const isIncomplete = order.has_shortages === true

    const handleDownloadReceipt = async () => {
      try {
        const response = await fetch(`/api/orders/${order.id}`)
        if (!response.ok) throw new Error("No se pudo obtener el pedido")
        const fullOrder = await response.json()
        downloadAssemblyReceipt(fullOrder)
        toast.success("Comprobante descargado")
      } catch (error) {
        toast.error("Error al descargar comprobante")
      }
    }

    const handleSendWhatsApp = async () => {
      const phone = order.customers?.phone || ""
      if (!phone) {
        toast.error("El cliente no tiene teléfono registrado")
        return
      }

      const message =
        `Hola ${order.customers?.commercial_name}! 👋\n\n` +
        `Su pedido #${order.order_number} ha sido armado y está listo para ser despachado.\n\n` +
        `📦 Total: $${order.total?.toFixed(2) || "0.00"}\n` +
        (isIncomplete ? `⚠️ Nota: Hubo algunos productos faltantes.\n` : "") +
        `\nGracias por su compra! 🙏`

      let result: Awaited<ReturnType<typeof shareOnWhatsApp>>
      try {
        const response = await fetch(`/api/orders/${order.id}`)
        if (!response.ok) throw new Error()
        const fullOrder = await response.json()
        const blob = getAssemblyReceiptBlob(fullOrder)
        result = await shareOnWhatsApp(phone, order.order_number, blob, message)
      } catch {
        result = await shareOnWhatsApp(phone, order.order_number, null, message)
      }

      if (result === "shared") {
        toast.success("Comprobante compartido por WhatsApp")
      } else if (result === "downloaded") {
        toast.success(
          "PDF descargado. WhatsApp Web no permite adjuntar archivos automáticamente — arrastrá el PDF al chat para enviarlo.",
          { duration: 8000 },
        )
      } else if (result === "no-file") {
        toast.info("No se pudo generar el comprobante. Se abrió WhatsApp con el mensaje.")
      }
    }

    return (
      <div className={`flex flex-col gap-3 p-4 border rounded-lg bg-white ${borderClass}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{order.order_number}</span>
              <Badge variant="secondary">✅ Listo</Badge>
              {isIncomplete && <Badge variant="destructive">⚠️ Faltantes</Badge>}
            </div>
            <p className="text-sm font-medium">{order.customers?.commercial_name ?? "Sin cliente"}</p>
            <p className="text-xs text-muted-foreground">{order.customers?.locality}</p>
            <p className="text-xs text-muted-foreground">
              Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")}
            </p>
            <p className="text-xs text-green-600 font-medium">✓ Finalizado hoy</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadReceipt} className="flex-1 sm:flex-none">
            <FileText className="mr-1 h-4 w-4" />
            Comprobante
          </Button>
          <Button
            size="sm"
            onClick={handleSendWhatsApp}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="mr-1 h-4 w-4" />
            WhatsApp
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Link href={`/armado/orders/${order.id}/detalle`}>Ver detalle</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isTakenByOther = order.status === "EN_ARMADO" && order.assembled_by && order.assembled_by !== userId
  const isAssignedToMe = order.status === "EN_ARMADO" && order.assembled_by === userId

  const actionLabel = isAssignedToMe ? "Continuar" : isTakenByOther ? "En armado" : "Armar"
  const actionVariant = isTakenByOther ? "secondary" : "default"

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg bg-white ${borderClass} ${
        isTakenByOther ? "opacity-60" : ""
      }`}
    >
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{order.order_number}</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              priority === "urgente"
                ? "bg-red-100 text-red-700"
                : priority === "alta"
                ? "bg-orange-100 text-orange-700"
                : priority === "media"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {PRIORITY_LABEL[priority]}
          </span>
          {isTakenByOther && (
            <Badge variant="destructive" className="text-xs">
              🔒 Tomado
            </Badge>
          )}
        </div>

        <p className="text-sm font-medium truncate">{order.customers?.commercial_name ?? "Sin cliente"}</p>
        <p className="text-xs text-muted-foreground">
          {order.customers?.locality} · Entrega: {new Date(order.delivery_date).toLocaleDateString("es-AR")}
        </p>

        {isTakenByOther && (
          <p className="text-xs text-red-600 font-medium">Otro armador está trabajando en este pedido</p>
        )}
      </div>

      <Button
        asChild={!isTakenByOther}
        variant={actionVariant}
        disabled={isTakenByOther}
        className="w-full sm:w-auto shrink-0"
        size="default"
      >
        {isTakenByOther ? (
          <span>{actionLabel}</span>
        ) : (
          <Link href={`/armado/orders/${order.id}`}>{actionLabel}</Link>
        )}
      </Button>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Search, 
  Route, 
  RefreshCw,
  CheckCircle2
} from "lucide-react"
import type { DelayedOrder, DelaySeverity } from "@/lib/types/database"
import { RescheduleOrderDialog } from "./reschedule-order-dialog"
import { BulkRescheduleDialog } from "./bulk-reschedule-dialog"

interface DelayedOrdersListProps {
  orders: DelayedOrder[]
}

const severityConfig: Record<DelaySeverity, { label: string; color: string; icon: string }> = {
  minor: { label: "Leve", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🟡" },
  warning: { label: "Moderado", color: "bg-orange-100 text-orange-800 border-orange-300", icon: "🟠" },
  critical: { label: "Crítico", color: "bg-red-100 text-red-800 border-red-300", icon: "🔴" },
}

export function DelayedOrdersList({ orders: initialOrders }: DelayedOrdersListProps) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [rescheduleOrder, setRescheduleOrder] = useState<DelayedOrder | null>(null)
  const [showBulkDialog, setShowBulkDialog] = useState(false)

  // Filtrar pedidos
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_locality?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSeverity =
      severityFilter === "all" || order.delay_severity === severityFilter

    return matchesSearch && matchesSeverity
  })

  // Selección
  const handleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id))
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    )
  }

  // Después de reprogramar, actualizar lista
  const handleRescheduleSuccess = () => {
    router.refresh()
    setRescheduleOrder(null)
    setSelectedIds([])
  }

  const handleBulkSuccess = () => {
    router.refresh()
    setShowBulkDialog(false)
    setSelectedIds([])
  }

  // Ir a generar ruta con pedidos seleccionados
  const handleCreateRoute = () => {
    const orderIds = selectedIds.join(",")
    router.push(`/admin/routes/generate-smart?preselect=${orderIds}`)
  }

  // Estadísticas
  const stats = {
    total: orders.length,
    critical: orders.filter((o) => o.delay_severity === "critical").length,
    warning: orders.filter((o) => o.delay_severity === "warning").length,
    minor: orders.filter((o) => o.delay_severity === "minor").length,
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Retrasados</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <p className="text-sm text-red-600">Críticos (+7 días)</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-700">{stats.warning}</div>
            <p className="text-sm text-orange-600">Moderados (4-7 días)</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-700">{stats.minor}</div>
            <p className="text-sm text-yellow-600">Leves (1-3 días)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Pedidos Retrasados
              </CardTitle>
              <CardDescription>
                Pedidos con fecha de entrega vencida sin ruta asignada
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedIds.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkDialog(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Reprogramar ({selectedIds.length})
                  </Button>
                  <Button onClick={handleCreateRoute}>
                    <Route className="h-4 w-4 mr-2" />
                    Crear Ruta
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, cliente o localidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">🔴 Críticos</SelectItem>
                <SelectItem value="warning">🟠 Moderados</SelectItem>
                <SelectItem value="minor">🟡 Leves</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">¡Sin pedidos retrasados!</h3>
              <p className="text-muted-foreground">
                No hay pedidos pendientes con fecha de entrega vencida
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="block md:hidden space-y-4">
                {filteredOrders.map((order) => (
                  <Card
                    key={order.id}
                    className={`border-l-4 ${
                      order.delay_severity === "critical"
                        ? "border-l-red-500"
                        : order.delay_severity === "warning"
                        ? "border-l-orange-500"
                        : "border-l-yellow-500"
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedIds.includes(order.id)}
                            onCheckedChange={() => handleSelectOrder(order.id)}
                          />
                          <div>
                            <div className="font-semibold">#{order.order_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer_name}
                            </div>
                          </div>
                        </div>
                        <Badge className={severityConfig[order.delay_severity].color}>
                          {order.days_delayed} días
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">F. Original:</span>{" "}
                          {new Date(order.delivery_date).toLocaleDateString("es-AR")}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>{" "}
                          ${order.total.toLocaleString("es-AR")}
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Localidad:</span>{" "}
                          {order.customer_locality || "-"}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setRescheduleOrder(order)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reprogramar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Vista desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Localidad</TableHead>
                      <TableHead>F. Entrega Original</TableHead>
                      <TableHead>Días Retraso</TableHead>
                      <TableHead>Severidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(order.id)}
                            onCheckedChange={() => handleSelectOrder(order.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          #{order.order_number}
                          {order.reschedule_count && order.reschedule_count > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Rep. x{order.reschedule_count}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{order.customer_name}</div>
                          {order.customer_phone && (
                            <div className="text-xs text-muted-foreground">
                              {order.customer_phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{order.customer_locality || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {new Date(order.delivery_date).toLocaleDateString("es-AR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">{order.days_delayed}</span>
                          <span className="text-muted-foreground text-sm ml-1">días</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={severityConfig[order.delay_severity].color}>
                            {severityConfig[order.delay_severity].icon}{" "}
                            {severityConfig[order.delay_severity].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${order.total.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRescheduleOrder(order)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reprogramar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog reprogramar individual */}
      {rescheduleOrder && (
        <RescheduleOrderDialog
          order={rescheduleOrder}
          open={!!rescheduleOrder}
          onOpenChange={(open) => !open && setRescheduleOrder(null)}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Dialog reprogramar en lote */}
      <BulkRescheduleDialog
        orderIds={selectedIds}
        orderCount={selectedIds.length}
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        onSuccess={handleBulkSuccess}
      />
    </div>
  )
}





# 📝 Guía: Filtros y Detalle de Pedidos

**Para:** Lucía  
**De:** Gabriel  
**Tema:** Implementar filtros por fecha/prioridad y arreglar modal de detalle

---

## 🐛 PROBLEMA 1: Modal de detalle se ve en blanco

### ❌ Causa del problema:
El modal está intentando acceder a propiedades que **NO existen** en el objeto pedido.

**Lo que viene de la BD:**
```javascript
{
  order_number: "PED-0001",
  order_date: "2024-11-05",
  priority: "alta",
  status: "PENDIENTE_ARMADO",
  total: 15000,
  requires_invoice: true
}
```

**Lo que el modal intenta leer:**
```javascript
pedido.codigo    // ❌ No existe → debería ser order_number
pedido.estado    // ❌ No existe → debería ser status
pedido.cliente   // ❌ No existe → no está en el query
pedido.prioridad // ❌ No existe → debería ser priority
```

### ✅ SOLUCIÓN:

**Archivo:** `components/preventista/orders/pedido-detalle.tsx`

**REEMPLAZAR TODO EL ARCHIVO CON:**

```typescript
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type OrderDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pedido: any | null
}

export function OrderDetailModal({ open, onOpenChange, pedido }: OrderDetailModalProps) {
  if (!pedido) return null

  // Función para color de prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "baja":
        return "bg-green-100 text-green-700 border-green-200"
      case "normal":
        return "bg-gray-100 text-gray-700 border-gray-200"
      case "media":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "alta":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "urgente":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Pedido {pedido.order_number}{" "}
            <Badge variant="outline" className="ml-2">
              {pedido.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>Detalles completos del pedido</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Fecha de Creación</h4>
              <p className="text-lg">
                {new Date(pedido.order_date).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Fecha de Entrega</h4>
              <p className="text-lg">
                {pedido.delivery_date 
                  ? new Date(pedido.delivery_date).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })
                  : "No especificada"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Prioridad</h4>
              <Badge className={getPriorityColor(pedido.priority)}>
                {pedido.priority.toUpperCase()}
              </Badge>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Tipo de Pedido</h4>
              <p className="text-lg capitalize">{pedido.order_type || "Presencial"}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Montos</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">${pedido.subtotal?.toLocaleString() || pedido.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">${pedido.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Facturación</h4>
            <p className="text-lg">
              {pedido.requires_invoice ? (
                <span className="text-green-600 font-medium">✓ Requiere factura</span>
              ) : (
                <span className="text-gray-400">No requiere factura</span>
              )}
            </p>
          </div>

          {pedido.has_shortages && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <h4 className="font-semibold text-yellow-800">⚠️ Tiene faltantes</h4>
              <p className="text-sm text-yellow-700">Este pedido tiene productos con faltante de stock</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🔍 PROBLEMA 2: Agregar filtros por fecha y prioridad

### ✅ SOLUCIÓN: Actualizar el componente OrdersTable

**Archivo:** `app/preventista/orders/list/orders-table.tsx`

**REEMPLAZAR TODO EL ARCHIVO CON:**

```typescript
"use client"

import { useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { OrderDetailModal } from "@/components/preventista/orders/pedido-detalle"
import { Calendar, Filter } from "lucide-react"

export function OrdersTable({ pedidos }: { pedidos: any[] }) {
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    // Estados para filtros
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("")
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("")
    const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todas")
    const [filtroEstado, setFiltroEstado] = useState<string>("todos")

    // Función de colores según prioridad
    const getPriorityColor = (prioridad: string) => {
        switch (prioridad.toLowerCase()) {
            case "baja":
                return "bg-green-100 text-green-700 border-green-200"
            case "normal":
                return "bg-gray-100 text-gray-700 border-gray-200"
            case "media":
                return "bg-yellow-100 text-yellow-700 border-yellow-200"
            case "alta":
                return "bg-orange-100 text-orange-700 border-orange-200"
            case "urgente":
                return "bg-red-100 text-red-700 border-red-200"
            default:
                return "bg-gray-100 text-gray-700 border-gray-200"
        }
    }

    // Filtrar pedidos
    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter((pedido) => {
            // Filtro por fecha desde
            if (filtroFechaDesde) {
                const fechaPedido = new Date(pedido.order_date)
                const fechaDesde = new Date(filtroFechaDesde)
                if (fechaPedido < fechaDesde) return false
            }

            // Filtro por fecha hasta
            if (filtroFechaHasta) {
                const fechaPedido = new Date(pedido.order_date)
                const fechaHasta = new Date(filtroFechaHasta)
                if (fechaPedido > fechaHasta) return false
            }

            // Filtro por prioridad
            if (filtroPrioridad !== "todas" && pedido.priority !== filtroPrioridad) {
                return false
            }

            // Filtro por estado
            if (filtroEstado !== "todos" && pedido.status !== filtroEstado) {
                return false
            }

            return true
        })
    }, [pedidos, filtroFechaDesde, filtroFechaHasta, filtroPrioridad, filtroEstado])

    // Función para limpiar filtros
    const limpiarFiltros = () => {
        setFiltroFechaDesde("")
        setFiltroFechaHasta("")
        setFiltroPrioridad("todas")
        setFiltroEstado("todos")
    }

    return (
        <>
            <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold uppercase flex items-center justify-between">
                        <span>MIS PEDIDOS</span>
                        <Badge variant="outline">{pedidosFiltrados.length} de {pedidos.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Sección de filtros */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Filter className="h-4 w-4" />
                            <h3 className="font-semibold">Filtros</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Filtro fecha desde */}
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Desde
                                </label>
                                <Input
                                    type="date"
                                    value={filtroFechaDesde}
                                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                                />
                            </div>

                            {/* Filtro fecha hasta */}
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Hasta
                                </label>
                                <Input
                                    type="date"
                                    value={filtroFechaHasta}
                                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                                />
                            </div>

                            {/* Filtro por prioridad */}
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">Prioridad</label>
                                <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas">Todas</SelectItem>
                                        <SelectItem value="baja">Baja</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="media">Media</SelectItem>
                                        <SelectItem value="alta">Alta</SelectItem>
                                        <SelectItem value="urgente">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro por estado */}
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">Estado</label>
                                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="BORRADOR">Borrador</SelectItem>
                                        <SelectItem value="PENDIENTE_ARMADO">Pendiente Armado</SelectItem>
                                        <SelectItem value="EN_ARMADO">En Armado</SelectItem>
                                        <SelectItem value="PENDIENTE_ENTREGA">Pendiente Entrega</SelectItem>
                                        <SelectItem value="EN_REPARTICION">En Repartición</SelectItem>
                                        <SelectItem value="ENTREGADO">Entregado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={limpiarFiltros}
                            className="w-full md:w-auto"
                        >
                            Limpiar filtros
                        </Button>
                    </div>

                    {/* Tabla de pedidos */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-600 border-b">
                                <tr>
                                    <th className="py-2">Código</th>
                                    <th className="py-2">Fecha</th>
                                    <th className="py-2">Entrega</th>
                                    <th className="py-2">Prioridad</th>
                                    <th className="py-2">Estado</th>
                                    <th className="py-2 text-right">Total</th>
                                    <th className="py-2 text-center">Factura</th>
                                    <th className="py-2 text-center">Detalle</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No se encontraron pedidos con los filtros aplicados
                                        </td>
                                    </tr>
                                ) : (
                                    pedidosFiltrados.map((p) => (
                                        <tr key={p.id} className="border-b hover:bg-muted/50">
                                            <td className="py-3">{p.order_number}</td>
                                            <td>{new Date(p.order_date).toLocaleDateString("es-AR")}</td>
                                            <td>{p.delivery_date ? new Date(p.delivery_date).toLocaleDateString("es-AR") : "-"}</td>
                                            <td>
                                                <Badge className={getPriorityColor(p.priority)}>
                                                    {p.priority.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td>
                                                {p.status === "BORRADOR" ? (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
                                                        Borrador
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs">{p.status.replace(/_/g, " ")}</span>
                                                )}
                                            </td>
                                            <td className="text-right font-medium">${p.total.toLocaleString()}</td>
                                            <td className="text-center">
                                                {p.requires_invoice ? (
                                                    <span className="text-green-600 font-medium">✓</span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => { 
                                                        setSelectedOrder(p); 
                                                        setIsModalOpen(true); 
                                                    }}
                                                >
                                                    Ver
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <OrderDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                pedido={selectedOrder}
            />
        </>
    )
}
```

---

## 📋 Checklist de implementación:

- [ ] 1. Actualizar `components/preventista/orders/pedido-detalle.tsx`
- [ ] 2. Actualizar `app/preventista/orders/list/orders-table.tsx`
- [ ] 3. Probar el modal de detalle (debería mostrar info correcta)
- [ ] 4. Probar filtros por fecha
- [ ] 5. Probar filtros por prioridad
- [ ] 6. Probar filtros por estado
- [ ] 7. Verificar botón "Limpiar filtros"

## 🎯 Resultado esperado:

✅ Modal muestra correctamente: fecha, prioridad, total, estado, facturación  
✅ Filtros por fecha funcionan (desde/hasta)  
✅ Filtro por prioridad funciona  
✅ Filtro por estado funciona  
✅ Contador muestra "X de Y" pedidos filtrados  
✅ Botón limpiar filtros restaura todo  

---

**¿Dudas?** Pregúntale a Gabriel 👨‍💻







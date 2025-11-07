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

    const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todas")
    const [filtroEstado, setFiltroEstado] = useState<string>("todos")
    const [ordenFecha, setOrdenFecha] = useState("recientes");

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    function parseFecha(fecha: any): Date {
        if (!fecha) return new Date(8640000000000000);

        if (fecha instanceof Date) return fecha;

        if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
            return new Date(fecha);
        }

        const partes = fecha.split("/");
        if (partes.length === 3) {
            const [d, m, y] = partes;
            return new Date(`${y}-${m}-${d}`);
        }

        return new Date(fecha);
    }


    const getPriorityColor = (prioridad: string) => {
        switch (prioridad?.toLowerCase()) {
            case "baja": return "bg-green-100 text-green-700 border-green-200"
            case "normal": return "bg-gray-100 text-gray-700 border-gray-200"
            case "media": return "bg-yellow-100 text-yellow-700 border-yellow-200"
            case "alta": return "bg-orange-100 text-orange-700 border-orange-200"
            case "urgente": return "bg-red-100 text-red-700 border-red-200"
            default: return "bg-gray-100 text-gray-700 border-gray-200"
        }
    }

    const pedidosOrdenados = useMemo(() => {
        return [...pedidos].sort((a, b) => {
            switch (ordenFecha) {
                case "recientes": {
                    const ordenA = parseFecha(a.order_date);
                    const ordenB = parseFecha(b.order_date);
                    return ordenB.getTime() - ordenA.getTime();
                }
                case "proximos":
                case "atrasados": {
                    // para proximos y atrasados ordenamos por fecha de entrega ascendente
                    const fechaA = parseFecha(a.delivery_date ?? a.order_date);
                    const fechaB = parseFecha(b.delivery_date ?? b.order_date);
                    return fechaA.getTime() - fechaB.getTime();
                }
                default:
                    return 0;
            }
        });
    }, [pedidos, ordenFecha]);

    const pedidosFiltrados = useMemo(() => {
        let lista = [...pedidos];

        // Filtro por prioridad
        if (filtroPrioridad !== "todas") {
            lista = lista.filter(p => p.priority === filtroPrioridad);
        }

        // Filtro por estado
        if (filtroEstado !== "todos") {
            lista = lista.filter(p => p.status === filtroEstado);
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Orden por fecha
        lista.sort((a, b) => {
            if (ordenFecha === "recientes") {
                const ordenA = new Date(a.order_date);
                const ordenB = new Date(b.order_date);
                return ordenB.getTime() - ordenA.getTime();
            }

            const fechaA = new Date(a.delivery_date ?? a.order_date);
            const fechaB = new Date(b.delivery_date ?? b.order_date);

            if (ordenFecha === "proximos") {
                return fechaA.getTime() - fechaB.getTime();
            }
            if (ordenFecha === "atrasados") {
                // Atrasados = fecha de entrega < hoy
                const aAtrasado = fechaA < hoy ? 1 : 0;
                const bAtrasado = fechaB < hoy ? 1 : 0;
                return bAtrasado - aAtrasado;
            }
            return 0;
        });

        return lista;
    }, [pedidos, filtroPrioridad, filtroEstado, ordenFecha]);

    const limpiarFiltros = () => {
        setFiltroPrioridad("todas")
        setFiltroEstado("todos")
        setOrdenFecha("recientes")
    }

    return (
        <>
            <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold uppercase flex items-center justify-between">
                        MIS PEDIDOS
                        <Badge variant="outline">{pedidosFiltrados.length} de {pedidos.length}</Badge>
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">

                    {/*   --- FILTROS ---   */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Filter className="h-4 w-4" />
                            <h3 className="font-semibold text-sm">Filtros</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Fecha */}
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">Ordenar por Fecha</label>
                                <Select value={ordenFecha} onValueChange={setOrdenFecha}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recientes">Recientes</SelectItem>
                                        <SelectItem value="proximos">Próximos</SelectItem>
                                        <SelectItem value="atrasados">Atrasados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Prioridad */}
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">Prioridad</label>
                                <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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

                            {/* Estado */}
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">Estado</label>
                                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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

                        <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>

                    {/*   --- TABLA ---   */}
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-600 border-b">
                            <tr>
                                <th className="py-2">Código</th>
                                <th className="py-2">Cliente</th>
                                <th className="py-2">Fecha Pedido</th>
                                <th className="py-2">Fecha Entrega</th>
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
                                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No se encontraron pedidos con los filtros aplicados
                                    </td>
                                </tr>
                            ) : (
                                pedidosFiltrados.map((p) => (
                                    <tr key={p.id} className="border-b hover:bg-muted/50">
                                        <td>{p.order_number}</td>
                                        <td>{p.customer?.commercial_name ?? "Sin cliente"}</td>
                                        <td>{new Date(p.order_date).toLocaleDateString("es-AR")}</td>
                                        <td>{p.delivery_date ? new Date(p.delivery_date).toLocaleDateString("es-AR") : "-"}</td>
                                        <td><Badge className={getPriorityColor(p.priority)}>{p.priority.toUpperCase()}</Badge></td>
                                        <td className="text-xs">{p.status.replace(/_/g, " ")}</td>
                                        <td className="text-right font-medium">${p.total.toLocaleString()}</td>
                                        <td className="text-center">{p.requires_invoice ? "Sí" : "No"}</td>
                                        <td className="text-center">
                                            <Button variant="outline" size="sm" onClick={() => {
                                                setSelectedOrder(p)
                                                setIsModalOpen(true)
                                            }}>
                                                Ver
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                    </table>

                </CardContent>
            </Card >

            <OrderDetailModal open={isModalOpen} onOpenChange={setIsModalOpen} pedido={selectedOrder} />
        </>
    )
}

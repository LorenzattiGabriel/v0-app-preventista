"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrderDetailModal } from "@/components/preventista/orders/pedido-detalle"

export function OrdersTable({ pedidos }: { pedidos: any[] }) {
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // colores según prioridad
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

    return (
        <>
            <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold uppercase">MIS PEDIDOS</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-600 border-b">
                            <tr>
                                <th className="py-2">Código</th>
                                <th className="py-2">Cliente</th>
                                <th className="py-2">Fecha</th>
                                <th className="py-2">Prioridad</th>
                                <th className="py-2">Estado</th>
                                <th className="py-2 text-right">Total</th>
                                <th className="py-2 text-center">Factura</th>
                                <th className="py-2 text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidos.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.order_number}</td>
                                    <td>{new Date(p.order_date).toLocaleDateString("es-AR")}</td>
                                    <td>{p.delivery_date ? new Date(p.delivery_date).toLocaleDateString("es-AR") : "-"}</td>
                                    <td>
                                        <Badge className={getPriorityColor(p.priority)}>{p.priority.toUpperCase()}</Badge>
                                    </td>
                                    <td>
                                        {p.status === "BORRADOR" ? (
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">Borrador</Badge>
                                        ) : (
                                            <span>{p.status}</span>
                                        )}
                                    </td>
                                    <td className="text-right">${p.total.toLocaleString()}</td>
                                    <td className="text-center">
                                        {p.requires_invoice ? (
                                            <span className="text-green-600 font-medium">Sí</span>
                                        ) : (
                                            <span className="text-gray-400">No</span>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(p); setIsModalOpen(true); }}>
                                            Ver
                                        </Button>
                                    </td>
                                </tr>

                            ))}
                        </tbody>
                    </table>
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
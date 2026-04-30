"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Phone, User, Package, CreditCard, FileText } from "lucide-react"

type OrderDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pedido: any | null
}

export function OrderDetailModal({ open, onOpenChange, pedido }: OrderDetailModalProps) {
  if (!pedido) return null

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BORRADOR":
        return "bg-gray-100 text-gray-700"
      case "PENDIENTE_ARMADO":
        return "bg-blue-100 text-blue-700"
      case "EN_ARMADO":
        return "bg-indigo-100 text-indigo-700"
      case "PENDIENTE_ENTREGA":
        return "bg-purple-100 text-purple-700"
      case "EN_REPARTICION":
        return "bg-amber-100 text-amber-700"
      case "ENTREGADO":
        return "bg-green-100 text-green-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const items = pedido.items || []
  const customer = pedido.customer
  const discountAmount = (pedido.subtotal || 0) - (pedido.total || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Pedido {pedido.order_number}
            <Badge className={getStatusColor(pedido.status)}>
              {pedido.status?.replace(/_/g, " ")}
            </Badge>
            {pedido.priority && (
              <Badge className={getPriorityColor(pedido.priority)}>
                {pedido.priority.toUpperCase()}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Detalles completos del pedido</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {/* Cliente */}
            {customer && (
              <section className="rounded-lg border bg-muted/30 p-4">
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </h4>
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-base">
                    {customer.commercial_name || customer.legal_name || "Sin nombre"}
                  </p>
                  {customer.legal_name && customer.commercial_name && customer.legal_name !== customer.commercial_name && (
                    <p className="text-muted-foreground text-xs">Razón social: {customer.legal_name}</p>
                  )}
                  {customer.customer_type && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Tipo:</span>{" "}
                      <span className="capitalize">{customer.customer_type}</span>
                    </p>
                  )}
                  {(customer.street || customer.locality) && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        {customer.street} {customer.street_number}
                        {customer.floor_apt && `, ${customer.floor_apt}`}
                        {(customer.locality || customer.province) && (
                          <>
                            <br />
                            {customer.locality}
                            {customer.province && `, ${customer.province}`}
                          </>
                        )}
                        {customer.address_notes && (
                          <>
                            <br />
                            <span className="italic text-amber-700">
                              Ref: {customer.address_notes}
                            </span>
                          </>
                        )}
                      </span>
                    </p>
                  )}
                  {customer.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Info del pedido */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Fecha de Pedido
                </h4>
                <p className="text-sm">{formatDate(pedido.order_date || pedido.created_at)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Fecha de Entrega
                </h4>
                <p className="text-sm">{formatDate(pedido.delivery_date)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground mb-1">Tipo de Pedido</h4>
                <p className="text-sm capitalize">{pedido.order_type || "-"}</p>
              </div>
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Método de Pago
                </h4>
                <p className="text-sm">{pedido.payment_method || "-"}</p>
              </div>
            </section>

            {/* Franja horaria */}
            {pedido.has_time_restriction && (
              <section className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <h4 className="font-semibold text-sm text-orange-800 flex items-center gap-1.5 mb-1">
                  <Clock className="h-4 w-4" />
                  Franja Horaria de Entrega
                </h4>
                <p className="text-sm text-orange-700">
                  De {pedido.delivery_window_start || "-"} a {pedido.delivery_window_end || "-"}
                </p>
                {pedido.time_restriction_notes && (
                  <p className="text-xs text-orange-600 mt-1">{pedido.time_restriction_notes}</p>
                )}
              </section>
            )}

            {/* Productos */}
            <section>
              <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                <Package className="h-4 w-4" />
                Productos ({items.length})
              </h4>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Sin productos cargados</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium text-xs">Producto</th>
                        <th className="px-3 py-2 font-medium text-xs text-right">Cant.</th>
                        <th className="px-3 py-2 font-medium text-xs text-right">P. Unit.</th>
                        <th className="px-3 py-2 font-medium text-xs text-right">Desc.</th>
                        <th className="px-3 py-2 font-medium text-xs text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it: any) => {
                        const qty = Number(it.quantity_requested || 0)
                        const unit = it.product?.unit_of_measure
                        return (
                          <tr key={it.id} className="border-t">
                            <td className="px-3 py-2">
                              <div className="font-medium">{it.product?.name || "Producto"}</div>
                              {it.product?.brand && (
                                <div className="text-xs text-muted-foreground">{it.product.brand}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {Number.isInteger(qty) ? qty : qty.toFixed(2)}
                              {unit && unit !== "unidad" && (
                                <span className="text-xs text-muted-foreground ml-1">{unit}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ${Number(it.unit_price || 0).toLocaleString("es-AR")}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {Number(it.discount || 0) > 0
                                ? `-$${Number(it.discount).toLocaleString("es-AR")}`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              ${Number(it.subtotal || 0).toLocaleString("es-AR")}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Totales */}
            <section className="rounded-lg border bg-muted/30 p-4">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Montos</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    ${Number(pedido.subtotal || 0).toLocaleString("es-AR")}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Descuento general:</span>
                    <span className="font-medium">
                      -${discountAmount.toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-green-600">
                    ${Number(pedido.total || 0).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            </section>

            {/* Observaciones */}
            {pedido.observations && (
              <section>
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                  <FileText className="h-4 w-4" />
                  Observaciones
                </h4>
                <p className="text-sm whitespace-pre-wrap rounded-lg border bg-muted/30 p-3">
                  {pedido.observations}
                </p>
              </section>
            )}

            {/* Facturación + flags */}
            <section className="flex flex-wrap gap-2">
              {pedido.requires_invoice ? (
                <Badge variant="outline" className="text-green-700 border-green-200">
                  ✓ Requiere factura{pedido.invoice_type ? ` ${pedido.invoice_type}` : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Sin factura
                </Badge>
              )}
              {pedido.has_shortages && (
                <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50">
                  ⚠️ Tiene faltantes
                </Badge>
              )}
              {pedido.payment_status && (
                <Badge variant="outline">Pago: {pedido.payment_status}</Badge>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

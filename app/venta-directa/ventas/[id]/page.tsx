import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VentaDetallePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const service = createDirectSalesService(supabase)
  const sale = await service.getSaleById(id)
  if (!sale) notFound()

  // Solo el creador o un admin pueden ver el detalle desde acá.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (
    sale.created_by !== user.id &&
    profile?.role !== "administrativo"
  ) {
    redirect("/venta-directa/ventas")
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/venta-directa/ventas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Venta {sale.order_number}</CardTitle>
            <Badge variant="default">{sale.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Cliente</div>
              <div className="font-medium">
                {sale.customer?.commercial_name || "—"}
              </div>
              {sale.customer?.phone && (
                <div className="text-muted-foreground">Tel: {sale.customer.phone}</div>
              )}
            </div>
            <div>
              <div className="text-muted-foreground">Fecha</div>
              <div className="font-medium">
                {new Date(sale.created_at).toLocaleString("es-AR")}
              </div>
              <div className="text-muted-foreground">
                Tipo: Venta directa en local
              </div>
            </div>
          </div>
          {sale.observations && (
            <div>
              <div className="text-muted-foreground">Observaciones</div>
              <div>{sale.observations}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2 text-right">Desc.</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">
                      {it.product?.code} — {it.product?.name}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {it.quantity_requested}{" "}
                      {it.product?.unit_of_measure}
                    </td>
                    <td className="px-3 py-2 text-right">
                      ${it.unit_price.toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {it.discount > 0 ? `$${it.discount.toLocaleString("es-AR")}` : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ${it.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totales y pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${sale.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          </div>
          {sale.general_discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Descuento general</span>
              <span>-${sale.general_discount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold border-t pt-2">
            <span>Total</span>
            <span>${sale.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="pt-3 border-t mt-2">
            <div className="text-muted-foreground mb-1">Método de pago</div>
            {sale.payment_methods_json && sale.payment_methods_json.length > 0 ? (
              <ul className="space-y-1">
                {sale.payment_methods_json.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{p.method}</span>
                    <span>${p.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div>{sale.payment_method || "—"}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

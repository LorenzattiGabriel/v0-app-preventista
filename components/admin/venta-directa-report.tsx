// Reporte admin de Venta Directa: KPIs del canal, tendencia mensual,
// ranking de vendedores y productos más vendidos.

import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Package } from "lucide-react"
import { SaleKpiCards } from "@/components/venta-directa/sale-kpi-cards"
import { VentaDirectaTrendChart } from "./venta-directa-trend-chart"
import { ReportDateFilter } from "./report-date-filter"
import { VentaDirectaSellerFilter } from "./venta-directa-seller-filter"

interface Props {
  startDate: Date
  endDate: Date
  sellerId?: string
}

const fmtMoney = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export async function VentaDirectaReport({ startDate, endDate, sellerId }: Props) {
  const supabase = await createClient()
  const service = createDirectSalesService(supabase)

  const { data: sellers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "venta_directa")
    .eq("is_active", true)
    .order("full_name")

  const range = { from: startDate, to: endDate }
  const [kpis, monthlyTrend, sellerRanking, topProducts] = await Promise.all([
    service.getKPIs({ channel: "venta_directa", range, userId: sellerId }),
    service.getMonthlyTrend(endDate, sellerId),
    sellerId ? Promise.resolve([]) : service.getSellerRanking(range),
    service.getTopProducts(range, 10, sellerId),
  ])

  const selectedSellerName = sellerId ? sellers?.find((s) => s.id === sellerId)?.full_name : undefined

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Venta Directa{selectedSellerName ? ` — ${selectedSellerName}` : ""}</CardTitle>
              <CardDescription>Estadísticas del canal de venta directa (local)</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <VentaDirectaSellerFilter sellers={sellers || []} value={sellerId} />
              <ReportDateFilter startDate={startDate} endDate={endDate} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <SaleKpiCards kpis={kpis} />

      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
          <CardDescription>
            Evolución de ventas y facturación en los últimos 6 meses
            {selectedSellerName ? ` — ${selectedSellerName}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VentaDirectaTrendChart data={monthlyTrend} />
        </CardContent>
      </Card>

      {!sellerId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking de Vendedores
            </CardTitle>
            <CardDescription>Desempeño por vendedor en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            {sellerRanking.length > 0 ? (
              <div className="space-y-2">
                {sellerRanking.map((s, i) => (
                  <div key={s.sellerId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium">{s.sellerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.sales} {s.sales === 1 ? "venta" : "ventas"} · ticket prom. {fmtMoney(s.averageTicket)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">{fmtMoney(s.revenue)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay ventas directas en el período seleccionado
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Más Vendidos
          </CardTitle>
          <CardDescription>
            Top 10 por facturación en el período seleccionado
            {selectedSellerName ? ` — ${selectedSellerName}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.code} · {p.quantity.toLocaleString("es-AR", { maximumFractionDigits: 2 })} unidades
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{fmtMoney(p.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay productos vendidos en el período seleccionado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

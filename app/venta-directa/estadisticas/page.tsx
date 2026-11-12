import Link from "next/link"
import { redirect } from "next/navigation"
import { startOfMonth, endOfMonth } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Package } from "lucide-react"
import { SaleKpiCards } from "@/components/venta-directa/sale-kpi-cards"
import { VentaDirectaTrendChart } from "@/components/admin/venta-directa-trend-chart"

export const dynamic = "force-dynamic"
export const revalidate = 0

const fmtMoney = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function VentaDirectaEstadisticasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const service = createDirectSalesService(supabase)

  const now = new Date()
  const range = { from: startOfMonth(now), to: endOfMonth(now) }

  const [kpis, monthlyTrend, topProducts] = await Promise.all([
    service.getKPIs({ channel: "venta_directa", range, userId: user.id }),
    service.getMonthlyTrend(now, user.id),
    service.getTopProducts(range, 10, user.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" asChild>
          <Link href="/venta-directa/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Mis Estadísticas</h1>
        <p className="text-sm text-muted-foreground">Mes en curso y tendencia de los últimos 6 meses</p>
      </div>

      <SaleKpiCards kpis={kpis} />

      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
          <CardDescription>Evolución de tus ventas y facturación en los últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <VentaDirectaTrendChart data={monthlyTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Tus Productos Más Vendidos
          </CardTitle>
          <CardDescription>Top 10 por facturación en el mes en curso</CardDescription>
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
              Todavía no vendiste productos este mes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

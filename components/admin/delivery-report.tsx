import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Clock, MapPin, Star, Wallet, DollarSign, AlertTriangle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/server"
import { createReportsService } from "@/lib/services/reportsService"
import { ReportDateFilter } from "./report-date-filter"
import { ExportReportButton } from "./export-report-button"
import { DeliveryBalanceChart } from "./delivery-balance-chart"

interface DeliveryReportProps {
  startDate: Date
  endDate: Date
}

const money = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export async function DeliveryReport({ startDate, endDate }: DeliveryReportProps) {
  const supabase = await createClient()
  const reportsService = createReportsService(supabase)

  const { stats, driverPerformance } = await reportsService.getDeliveryReport(startDate, endDate)
  const balance = await reportsService.getDeliveryBalanceReport(startDate, endDate)
  const collectionRate = balance.totals.totalExpected > 0
    ? (balance.totals.totalCollected / balance.totals.totalExpected) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Reporte de Entregas</CardTitle>
              <CardDescription>Análisis de rutas y rendimiento de repartidores</CardDescription>
            </div>
            <div className="flex gap-2">
              <ReportDateFilter startDate={startDate} endDate={endDate} />
              <ExportReportButton
                reportType="delivery"
                data={{ stats, driverPerformance }}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rutas Completadas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedRoutes}</div>
            <p className="text-xs text-muted-foreground">de {stats.totalRoutes} rutas totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDeliveryTime} min</div>
            <p className="text-xs text-muted-foreground">por entrega</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entregas a Tiempo</CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedRoutes > 0 ? `${stats.completedRoutes} rutas completadas` : "Sin datos"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}</div>
            <p className="text-xs text-muted-foreground">de 5 estrellas</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Financiero de Repartos — armado desde el arqueo de caja real
          (route_cash_closures), no estimado sumando totales de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Balance Financiero de Repartos
          </CardTitle>
          <CardDescription>
            Cobrado real según el cierre de caja de cada ruta, {balance.totals.totalRoutes}{" "}
            {balance.totals.totalRoutes === 1 ? "cierre" : "cierres"} en el período
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Esperado</p>
              <p className="text-xl font-bold">{money(balance.totals.totalExpected)}</p>
            </div>
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
              <p className="text-xs text-muted-foreground mb-1">Cobrado</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                {money(balance.totals.totalCollected)}
              </p>
              <p className="text-xs text-muted-foreground">{collectionRate.toFixed(1)}% del esperado</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Deuda vieja cobrada en ruta</p>
              <p className="text-xl font-bold">{money(balance.totals.debtCollected)}</p>
            </div>
            <div className={`p-4 border rounded-lg ${balance.totals.difference < 0 ? "bg-red-50 dark:bg-red-950/30" : ""}`}>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                {balance.totals.difference < 0 && <AlertTriangle className="h-3 w-3 text-red-600" />}
                Diferencia
              </p>
              <p className={`text-xl font-bold ${balance.totals.difference < 0 ? "text-red-600" : ""}`}>
                {money(balance.totals.difference)}
              </p>
            </div>
          </div>

          {/* Desglose por método de pago */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Desglose por método de pago
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              {[
                { label: "Efectivo", value: balance.totals.cash },
                { label: "Transferencia", value: balance.totals.transfer },
                { label: "Tarjeta", value: balance.totals.card },
                { label: "Cheque", value: balance.totals.cheque },
                { label: "Cta. Corriente", value: balance.totals.account },
                { label: "Otro", value: balance.totals.other },
              ].map((m) => (
                <div key={m.label} className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="font-semibold">{money(m.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tendencia mensual */}
          <div>
            <p className="text-sm font-medium mb-3">Tendencia mensual (esperado vs. cobrado)</p>
            <DeliveryBalanceChart data={balance.monthlyTrend} />
          </div>

          {/* Por repartidor */}
          {balance.byDriver.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Por repartidor</p>
              <div className="space-y-2">
                {balance.byDriver.map((d) => {
                  const rate = d.expected > 0 ? (d.collected / d.expected) * 100 : 0
                  return (
                    <div key={d.driverId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{d.driverName}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.routes} {d.routes === 1 ? "ruta" : "rutas"}
                          {d.debtCollected > 0 && ` · deuda vieja cobrada: ${money(d.debtCollected)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {money(d.collected)} <span className="text-muted-foreground font-normal">/ {money(d.expected)}</span>
                        </p>
                        <p className={`text-xs ${d.difference < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {rate.toFixed(1)}% cobrado
                          {d.difference < 0 && ` · faltante ${money(Math.abs(d.difference))}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento de Repartidores</CardTitle>
          <CardDescription>Métricas de desempeño por repartidor en el período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          {driverPerformance.length > 0 ? (
            <div className="space-y-6">
              {driverPerformance.map((driver) => (
                <div key={driver.driverId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{driver.driverName}</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.deliveries} {driver.deliveries === 1 ? "ruta" : "rutas"} (
                        {driver.completedDeliveries} {driver.completedDeliveries === 1 ? "completada" : "completadas"})
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium">{Math.round(driver.onTime)}%</p>
                        <p className="text-muted-foreground">Completadas</p>
                      </div>
                      {driver.rating > 0 && (
                        <div className="text-right">
                          <p className="font-medium flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {driver.rating.toFixed(1)}
                          </p>
                          <p className="text-muted-foreground">Rating</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Progress value={driver.onTime} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos de repartidores en el período seleccionado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Active Routes Alert */}
      {stats.activeRoutes > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {stats.activeRoutes} {stats.activeRoutes === 1 ? "ruta activa" : "rutas activas"} en este momento
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Repartidores en curso de entrega
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Clock, MapPin, Star } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/server"
import { createReportsService } from "@/lib/services/reportsService"
import { ReportDateFilter } from "./report-date-filter"
import { ExportReportButton } from "./export-report-button"

interface DeliveryReportProps {
  startDate: Date
  endDate: Date
}

export async function DeliveryReport({ startDate, endDate }: DeliveryReportProps) {
  const supabase = await createClient()
  const reportsService = createReportsService(supabase)

  const { stats, driverPerformance } = await reportsService.getDeliveryReport(startDate, endDate)

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

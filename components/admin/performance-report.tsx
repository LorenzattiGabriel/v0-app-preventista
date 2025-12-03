import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createReportsService } from "@/lib/services/reportsService"
import { ReportDateFilter } from "./report-date-filter"
import { ExportReportButton } from "./export-report-button"
import { PerformanceChart } from "./performance-chart"

interface PerformanceReportProps {
  startDate: Date
  endDate: Date
}

export async function PerformanceReport({ startDate, endDate }: PerformanceReportProps) {
  const supabase = await createClient()
  const reportsService = createReportsService(supabase)

  const { monthlyData, teamStats } = await reportsService.getPerformanceReport(startDate, endDate)

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Reporte de Rendimiento</CardTitle>
              <CardDescription>Análisis de tendencias y desempeño por equipo</CardDescription>
            </div>
            <div className="flex gap-2">
              <ReportDateFilter startDate={startDate} endDate={endDate} />
              <ExportReportButton
                reportType="performance"
                data={{ monthlyData, teamStats }}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Trend Chart */}
      <PerformanceChart monthlyData={monthlyData} />

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Equipo</CardTitle>
          <CardDescription>Métricas de eficiencia por área en el período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          {teamStats.length > 0 ? (
            <div className="space-y-6">
              {teamStats.map((team) => (
                <div key={team.role} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{team.role}</p>
                      <p className="text-sm text-muted-foreground">
                        {team.count} {team.count === 1 ? "miembro" : "miembros"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-8 text-right">
                    <div>
                      <p className="text-2xl font-bold">{team.avgOrders}</p>
                      <p className="text-xs text-muted-foreground">Promedio</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                        {team.efficiency}%
                        <TrendingUp className="h-4 w-4" />
                      </p>
                      <p className="text-xs text-muted-foreground">Eficiencia</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos de equipos en el período seleccionado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Total de {teamStats.reduce((sum, t) => sum + t.count, 0)} colaboradores activos
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Eficiencia general del sistema:{" "}
                {teamStats.length > 0
                  ? `${Math.round(teamStats.reduce((sum, t) => sum + t.efficiency, 0) / teamStats.length)}%`
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

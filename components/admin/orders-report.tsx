import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, TrendingUp, AlertCircle, CheckCircle, TrendingDown } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createReportsService } from "@/lib/services/reportsService"
import { ReportDateFilter } from "./report-date-filter"
import { ExportReportButton } from "./export-report-button"
import { OrdersChart } from "./orders-chart"

interface OrdersReportProps {
  startDate: Date
  endDate: Date
}

export async function OrdersReport({ startDate, endDate }: OrdersReportProps) {
  const supabase = await createClient()
  const reportsService = createReportsService(supabase)

  const { stats, ordersByDay, ordersByStatus } = await reportsService.getOrdersReport(startDate, endDate)

  // Calculate percentage changes
  const totalOrdersChange = stats.previousPeriodTotal
    ? ((stats.totalOrders - stats.previousPeriodTotal) / stats.previousPeriodTotal) * 100
    : 0

  const avgValueChange = stats.previousPeriodAvg
    ? ((stats.avgOrderValue - stats.previousPeriodAvg) / stats.previousPeriodAvg) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Reporte de Pedidos</CardTitle>
              <CardDescription>Análisis detallado de pedidos en el período seleccionado</CardDescription>
            </div>
            <div className="flex gap-2">
              <ReportDateFilter startDate={startDate} endDate={endDate} />
              <ExportReportButton
                reportType="orders"
                data={{ stats, ordersByDay, ordersByStatus }}
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
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {totalOrdersChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{totalOrdersChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{totalOrdersChange.toFixed(1)}%</span>
                </>
              )}{" "}
              vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalOrders > 0 ? ((stats.pendingOrders / stats.totalOrders) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {avgValueChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{avgValueChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{avgValueChange.toFixed(1)}%</span>
                </>
              )}{" "}
              vs período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <OrdersChart ordersByDay={ordersByDay} ordersByStatus={ordersByStatus} />
    </div>
  )
}

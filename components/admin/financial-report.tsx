import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, CreditCard, Wallet, TrendingDown } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createReportsService } from "@/lib/services/reportsService"
import { ReportDateFilter } from "./report-date-filter"
import { ExportReportButton } from "./export-report-button"
import { FinancialChart } from "./financial-chart"

interface FinancialReportProps {
  startDate: Date
  endDate: Date
}

export async function FinancialReport({ startDate, endDate }: FinancialReportProps) {
  const supabase = await createClient()
  const reportsService = createReportsService(supabase)

  const { stats, revenueByZone, paymentMethods } = await reportsService.getFinancialReport(startDate, endDate)

  // Calculate percentage changes
  const revenueChange = stats.previousPeriodRevenue
    ? ((stats.totalRevenue - stats.previousPeriodRevenue) / stats.previousPeriodRevenue) * 100
    : 0

  const ticketChange = stats.previousPeriodTicket
    ? ((stats.avgTicket - stats.previousPeriodTicket) / stats.previousPeriodTicket) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Reporte Financiero</CardTitle>
              <CardDescription>Análisis de facturación y cobros</CardDescription>
            </div>
            <div className="flex gap-2">
              <ReportDateFilter startDate={startDate} endDate={endDate} />
              <ExportReportButton
                reportType="financial"
                data={{ stats, revenueByZone, paymentMethods }}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Financial KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.totalRevenue / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {revenueChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{revenueChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{revenueChange.toFixed(1)}%</span>
                </>
              )}{" "}
              vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cobrado</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.collected / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0 ? ((stats.collected / stats.totalRevenue) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.pending / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0 ? ((stats.pending / stats.totalRevenue) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.avgTicket.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {ticketChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{ticketChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{ticketChange.toFixed(1)}%</span>
                </>
              )}{" "}
              vs período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <FinancialChart revenueByZone={revenueByZone} paymentMethods={paymentMethods} />
    </div>
  )
}

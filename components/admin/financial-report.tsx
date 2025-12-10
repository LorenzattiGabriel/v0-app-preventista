import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, CreditCard, Wallet, TrendingDown, AlertTriangle, Users, Clock, ArrowDownRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createReportsService } from "@/lib/services/reportsService"
import { ReportDateFilter } from "./report-date-filter"
import { ExportReportButton } from "./export-report-button"
import { FinancialChart } from "./financial-chart"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface FinancialReportProps {
  startDate: Date
  endDate: Date
}

export async function FinancialReport({ startDate, endDate }: FinancialReportProps) {
  const supabase = await createClient()
  const reportsService = createReportsService(supabase)

  const { stats, revenueByZone, paymentMethods } = await reportsService.getFinancialReport(startDate, endDate)
  const accountsReceivable = await reportsService.getAccountsReceivableReport()

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

      {/* Accounts Receivable Section */}
      <Card className="border-2 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                Cuentas Corrientes
              </CardTitle>
              <CardDescription>Estado de deudas y cobranzas de clientes</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/customers?debt=with_debt">
                Ver Clientes con Deuda
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPIs de Cuentas Corrientes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Total por Cobrar</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                ${accountsReceivable.totalDebt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Deuda total en cuentas corrientes
              </p>
            </div>

            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Clientes con Deuda</span>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {accountsReceivable.customersWithDebt}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Promedio: ${accountsReceivable.avgDebtPerCustomer.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Deuda Vencida</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                ${accountsReceivable.overdueDebt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Pagos fuera de fecha
              </p>
            </div>

            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <ArrowDownRight className="h-4 w-4" />
                <span className="text-sm font-medium">Cobrado (30 días)</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                ${accountsReceivable.recentPayments.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Pagos recibidos últimos 30 días
              </p>
            </div>
          </div>

          {/* Deuda por Antigüedad y Top Deudores */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Antigüedad de Deuda */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground">Antigüedad de Deuda</h4>
              <div className="space-y-3">
                {accountsReceivable.debtByAge.map((item, idx) => {
                  const percentage = accountsReceivable.totalDebt > 0 
                    ? (item.amount / accountsReceivable.totalDebt) * 100 
                    : 0
                  const colors = [
                    "bg-green-500",
                    "bg-yellow-500", 
                    "bg-orange-500",
                    "bg-red-500"
                  ]
                  return (
                    <div key={item.range} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.range}</span>
                        <span className="font-medium">
                          ${item.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          <span className="text-muted-foreground ml-1">({item.count})</span>
                        </span>
                      </div>
                      <Progress value={percentage} className={`h-2 ${colors[idx]}`} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Deudores */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground">Top 5 Clientes con Mayor Deuda</h4>
              {accountsReceivable.topDebtors.length > 0 ? (
                <div className="space-y-2">
                  {accountsReceivable.topDebtors.map((debtor, idx) => (
                    <Link 
                      key={debtor.customerId}
                      href={`/admin/customers/${debtor.customerId}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={idx === 0 ? "destructive" : "secondary"} className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {idx + 1}
                        </Badge>
                        <span className="font-medium text-sm truncate max-w-[150px]">
                          {debtor.customerName}
                        </span>
                      </div>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        ${debtor.debt.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay clientes con deuda</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Cobrabilidad */}
          {accountsReceivable.totalDebt > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-semibold text-sm mb-3">Índice de Cobrabilidad</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {accountsReceivable.totalDebt > 0 
                      ? ((accountsReceivable.recentPayments / (accountsReceivable.totalDebt + accountsReceivable.recentPayments)) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Tasa de cobro (30d)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {accountsReceivable.totalDebt > 0 
                      ? ((accountsReceivable.overdueDebt / accountsReceivable.totalDebt) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Deuda vencida</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {accountsReceivable.customersWithDebt > 0 
                      ? Math.round(accountsReceivable.totalDebt / accountsReceivable.customersWithDebt)
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Deuda promedio/cliente</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

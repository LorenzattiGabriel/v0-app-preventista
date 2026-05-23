import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/server"
import { createExpensesService } from "@/lib/services/expensesService"
import { ReportDateFilter } from "./report-date-filter"
import { DollarSign, TrendingDown, TrendingUp, Receipt, ArrowDownRight } from "lucide-react"

interface ExpensesReportProps {
  startDate: Date
  endDate: Date
}

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export async function ExpensesReport({ startDate, endDate }: ExpensesReportProps) {
  const supabase = await createClient()
  const service = createExpensesService(supabase)
  const { stats, byCategory, bySupplier, byMonth } = await service.getExpensesReport(startDate, endDate)

  const change =
    stats.previousPeriodAmount > 0
      ? ((stats.totalAmount - stats.previousPeriodAmount) / stats.previousPeriodAmount) * 100
      : 0

  const maxCategoryAmount = byCategory[0]?.amount || 1
  const maxMonthAmount = Math.max(...byMonth.map((m) => m.amount), 1)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Reporte de Egresos</CardTitle>
              <CardDescription>Análisis de egresos por categoría y proveedor</CardDescription>
            </div>
            <ReportDateFilter startDate={startDate} endDate={endDate} />
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Egresado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${fmt(stats.totalAmount)}</div>
            {stats.previousPeriodAmount > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {change >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">+{change.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">{change.toFixed(1)}%</span>
                  </>
                )}{" "}
                vs período anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cantidad</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCount}</div>
            <p className="text-xs text-muted-foreground">Egresos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos Fijos</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${fmt(stats.totalFijo)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAmount > 0 ? ((stats.totalFijo / stats.totalAmount) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos Variables</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${fmt(stats.totalVariable)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAmount > 0 ? ((stats.totalVariable / stats.totalAmount) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Egresos por Categoría</CardTitle>
            <CardDescription>Distribución del período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              byCategory.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.category}</span>
                      <Badge
                        variant="outline"
                        className={
                          c.type === "fijo"
                            ? "border-blue-300 text-blue-700 text-xs"
                            : "border-purple-300 text-purple-700 text-xs"
                        }
                      >
                        {c.type}
                      </Badge>
                    </div>
                    <span className="font-mono">${fmt(c.amount)}</span>
                  </div>
                  <Progress value={(c.amount / maxCategoryAmount) * 100} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top proveedores */}
        <Card>
          <CardHeader>
            <CardTitle>Top Proveedores</CardTitle>
            <CardDescription>Los 10 con mayor egreso en el período</CardDescription>
          </CardHeader>
          <CardContent>
            {bySupplier.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 font-medium">Proveedor</th>
                    <th className="py-2 font-medium text-right">Egresos</th>
                    <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bySupplier.map((s) => (
                    <tr key={s.supplier} className="border-b last:border-0">
                      <td className="py-2">{s.supplier}</td>
                      <td className="py-2 text-right">{s.count}</td>
                      <td className="py-2 text-right font-mono">${fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolución mensual */}
      {byMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución Mensual</CardTitle>
            <CardDescription>Egresos por mes en el período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byMonth.map((m) => (
              <div key={m.month} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{m.month}</span>
                  <span className="font-mono">${fmt(m.amount)}</span>
                </div>
                <Progress value={(m.amount / maxMonthAmount) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

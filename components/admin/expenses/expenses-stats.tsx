import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingDown, TrendingUp, ArrowDownRight, Receipt } from "lucide-react"
import type { ExpenseStats } from "@/lib/services/expensesService"

interface Props {
  stats: ExpenseStats
}

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function ExpensesStats({ stats }: Props) {
  const change =
    stats.previousPeriodAmount > 0
      ? ((stats.totalAmount - stats.previousPeriodAmount) / stats.previousPeriodAmount) * 100
      : 0

  return (
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
          <CardTitle className="text-sm font-medium">Fijos</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">${fmt(stats.totalFijo)}</div>
          <p className="text-xs text-muted-foreground">Variables: ${fmt(stats.totalVariable)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topCategory ? (
            <>
              <div className="text-lg font-bold truncate">{stats.topCategory.name}</div>
              <p className="text-xs text-muted-foreground">${fmt(stats.topCategory.amount)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos</p>
          )}
          {stats.topSupplier && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">Top proveedor:</p>
              <p className="text-sm font-medium truncate">{stats.topSupplier.name}</p>
              <p className="text-xs text-muted-foreground">${fmt(stats.topSupplier.amount)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

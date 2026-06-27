// Cards de KPIs reutilizables: dashboard del rol y reporte admin de canales.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, DollarSign, Receipt, CreditCard } from "lucide-react"
import type { DirectSaleKPIs } from "@/lib/types/venta-directa"

interface SaleKpiCardsProps {
  kpis: DirectSaleKPIs
  title?: string
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SaleKpiCards({ kpis, title }: SaleKpiCardsProps) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <div className="grid gap-3 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold tabular-nums break-words leading-tight">{kpis.totalSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold tabular-nums break-words leading-tight">{fmtMoney(kpis.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket promedio</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold tabular-nums break-words leading-tight">{fmtMoney(kpis.averageTicket)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A cuenta corriente</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold tabular-nums break-words leading-tight">{fmtMoney(kpis.accountReceivable)}</div>
          </CardContent>
        </Card>
      </div>

      {kpis.paymentBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por método de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kpis.paymentBreakdown
                .sort((a, b) => b.amount - a.amount)
                .map((b) => (
                  <div key={b.method} className="flex justify-between text-sm">
                    <span>
                      {b.method}{" "}
                      <span className="text-muted-foreground">({b.count} pagos)</span>
                    </span>
                    <span className="font-medium">{fmtMoney(b.amount)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

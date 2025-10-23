"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function FinancialReport() {
  // Mock data
  const stats = {
    totalRevenue: 19229543.5,
    collected: 17450230.2,
    pending: 1779313.3,
    avgTicket: 15420.5,
  }

  const revenueByZone = [
    { zone: "Norte", revenue: 5200000 },
    { zone: "Sur", revenue: 4800000 },
    { zone: "Este", revenue: 4100000 },
    { zone: "Oeste", revenue: 3500000 },
    { zone: "Centro", revenue: 1629543 },
  ]

  const paymentMethods = [
    { method: "Efectivo", amount: 8500000, percentage: 44.2 },
    { method: "Transferencia", amount: 6200000, percentage: 32.2 },
    { method: "Tarjeta", amount: 3100000, percentage: 16.1 },
    { method: "Cuenta Corriente", amount: 1429543, percentage: 7.4 },
  ]

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalRevenue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+15.3%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cobrado</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.collected / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              {((stats.collected / stats.totalRevenue) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.pending / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              {((stats.pending / stats.totalRevenue) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgTicket.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Facturación por Zona</CardTitle>
          <CardDescription>Distribución de ingresos por zona geográfica</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: { label: "Facturación", color: "hsl(var(--chart-1))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByZone}>
                <XAxis dataKey="zone" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pago</CardTitle>
          <CardDescription>Distribución de cobros por método de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.method} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{method.method}</span>
                  <span className="text-muted-foreground">
                    ${(method.amount / 1000000).toFixed(1)}M ({method.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${method.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

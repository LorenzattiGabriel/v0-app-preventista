"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RevenueByZone {
  zone: string
  revenue: number
}

interface PaymentMethod {
  method: string
  amount: number
  percentage: number
}

interface FinancialChartProps {
  revenueByZone: RevenueByZone[]
  paymentMethods: PaymentMethod[]
}

export function FinancialChart({ revenueByZone, paymentMethods }: FinancialChartProps) {
  return (
    <>
      {/* Revenue by Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Facturación por Zona</CardTitle>
          <CardDescription>Top 5 zonas con mayor facturación</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueByZone.length > 0 ? (
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
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos de zonas para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pago</CardTitle>
          <CardDescription>Distribución de cobros por método de pago</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.method} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{method.method}</span>
                    <span className="text-muted-foreground">
                      ${(method.amount / 1000000).toFixed(2)}M ({method.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${method.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No hay datos de métodos de pago para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}


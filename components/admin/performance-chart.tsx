"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface PerformanceChartProps {
  monthlyData: {
    month: string
    orders: number
    revenue: number
  }[]
}

export function PerformanceChart({ monthlyData }: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia Mensual</CardTitle>
        <CardDescription>Evolución de pedidos y facturación en los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        {monthlyData.length > 0 ? (
          <ChartContainer
            config={{
              orders: { label: "Pedidos", color: "hsl(var(--chart-1))" },
              revenue: { label: "Facturación", color: "hsl(var(--chart-2))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Pedidos</span>
                              <span className="font-bold text-muted-foreground">{payload[0].value}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Facturación</span>
                              <span className="font-bold text-muted-foreground">
                                ${((payload[1].value as number) / 1000000).toFixed(2)}M
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-orders)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Pedidos"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Facturación ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">
            No hay datos de tendencia mensual para mostrar
          </p>
        )}
      </CardContent>
    </Card>
  )
}


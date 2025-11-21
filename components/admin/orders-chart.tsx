"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface OrdersByDay {
  date: string
  orders: number
  completed: number
}

interface OrdersByStatus {
  status: string
  count: number
  percentage: number
}

interface OrdersChartProps {
  ordersByDay: OrdersByDay[]
  ordersByStatus: OrdersByStatus[]
}

export function OrdersChart({ ordersByDay, ordersByStatus }: OrdersChartProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pedidos por Día</CardTitle>
          <CardDescription>Últimos 7 días con datos</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersByDay.length > 0 ? (
            <ChartContainer
              config={{
                orders: { label: "Pedidos", color: "hsl(var(--chart-1))" },
                completed: { label: "Completados", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByDay}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="orders" fill="var(--color-orders)" name="Pedidos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="var(--color-completed)" name="Completados" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribución por Estado</CardTitle>
          <CardDescription>Porcentaje de pedidos por estado</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersByStatus.some(item => item.count > 0) ? (
            <div className="space-y-4">
              {ordersByStatus.map((item) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.status}</span>
                    <span className="text-muted-foreground">
                      {item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.status === "Entregado"
                          ? "bg-green-500"
                          : item.status === "En Reparto"
                            ? "bg-blue-500"
                            : item.status === "Pendiente"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No hay datos para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


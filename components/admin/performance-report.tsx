"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function PerformanceReport() {
  // Mock data
  const monthlyData = [
    { month: "Ene", orders: 320, revenue: 4200000 },
    { month: "Feb", orders: 385, revenue: 4850000 },
    { month: "Mar", orders: 412, revenue: 5320000 },
    { month: "Abr", orders: 398, revenue: 5100000 },
    { month: "May", orders: 445, revenue: 5780000 },
    { month: "Jun", orders: 487, revenue: 6240000 },
  ]

  const teamStats = [
    { role: "Preventistas", count: 3, avgOrders: 148, efficiency: 94 },
    { role: "Armado", count: 3, avgOrders: 156, efficiency: 96 },
    { role: "Repartidores", count: 4, avgDeliveries: 117, efficiency: 91 },
  ]

  return (
    <div className="space-y-6">
      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
          <CardDescription>Evolución de pedidos y facturación</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              orders: { label: "Pedidos", color: "hsl(var(--chart-1))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Equipo</CardTitle>
          <CardDescription>Métricas de eficiencia por área</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {teamStats.map((team) => (
              <div key={team.role} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{team.role}</p>
                    <p className="text-sm text-muted-foreground">{team.count} miembros</p>
                  </div>
                </div>
                <div className="flex gap-8 text-right">
                  <div>
                    <p className="text-2xl font-bold">{team.avgOrders || team.avgDeliveries}</p>
                    <p className="text-xs text-muted-foreground">Promedio</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{team.efficiency}%</p>
                    <p className="text-xs text-muted-foreground">Eficiencia</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

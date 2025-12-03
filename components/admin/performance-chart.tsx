"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar, ComposedChart } from "recharts"
import { TrendingUp, Package } from "lucide-react"

interface PerformanceChartProps {
  monthlyData: {
    month: string
    orders: number
    revenue: number
  }[]
}

export function PerformanceChart({ monthlyData }: PerformanceChartProps) {
  // Calculate max values for better scaling
  const maxOrders = Math.max(...monthlyData.map(d => d.orders), 1)
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia Mensual</CardTitle>
        <CardDescription>Evolución de pedidos y facturación en los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        {monthlyData.length > 0 ? (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-muted-foreground">Pedidos</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Facturación</span>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#3b82f6"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Pedidos', angle: -90, position: 'insideLeft', style: { fill: '#3b82f6', fontSize: 12 } }}
                  domain={[0, Math.ceil(maxOrders * 1.2)]}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  stroke="#22c55e"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Facturación ($)', angle: 90, position: 'insideRight', style: { fill: '#22c55e', fontSize: 12 } }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  domain={[0, Math.ceil(maxRevenue * 1.2)]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="text-sm font-medium mb-2">{payload[0].payload.month}</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                              <span className="text-sm text-muted-foreground">Pedidos:</span>
                              <span className="text-sm font-bold">{payload[0].value}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-600"></div>
                              <span className="text-sm text-muted-foreground">Facturación:</span>
                              <span className="text-sm font-bold text-green-600">
                                ${Number(payload[1].value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="orders"
                  fill="url(#colorOrders)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: '#22c55e', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {monthlyData.reduce((sum, d) => sum + d.orders, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${(monthlyData.reduce((sum, d) => sum + d.revenue, 0) / 1000000).toFixed(2)}M
                </p>
                <p className="text-sm text-muted-foreground">Total Facturación</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">
            No hay datos de tendencia mensual para mostrar
          </p>
        )}
      </CardContent>
    </Card>
  )
}


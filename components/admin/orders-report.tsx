"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download, Package, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function OrdersReport() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })

  // Mock data - replace with real data from Supabase
  const stats = {
    totalOrders: 1247,
    completedOrders: 1089,
    pendingOrders: 98,
    cancelledOrders: 60,
    avgOrderValue: 15420.5,
    totalRevenue: 19229543.5,
  }

  const ordersByDay = [
    { date: "Lun", orders: 45, completed: 42 },
    { date: "Mar", orders: 52, completed: 48 },
    { date: "Mié", orders: 48, completed: 45 },
    { date: "Jue", orders: 61, completed: 58 },
    { date: "Vie", orders: 55, completed: 51 },
    { date: "Sáb", orders: 38, completed: 35 },
    { date: "Dom", orders: 28, completed: 26 },
  ]

  const ordersByStatus = [
    { status: "Entregado", count: 1089, percentage: 87.3 },
    { status: "En Reparto", count: 45, percentage: 3.6 },
    { status: "Pendiente", count: 53, percentage: 4.2 },
    { status: "Cancelado", count: 60, percentage: 4.8 },
  ]

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reporte de Pedidos</CardTitle>
              <CardDescription>Análisis detallado de pedidos en el período seleccionado</CardDescription>
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd/MM/yyyy", { locale: es })} -{" "}
                    {format(dateRange.to, "dd/MM/yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="range" selected={dateRange} locale={es} />
                </PopoverContent>
              </Popover>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.pendingOrders / stats.totalOrders) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Día</CardTitle>
            <CardDescription>Comparación de pedidos totales vs completados</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>Porcentaje de pedidos por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ordersByStatus.map((item) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.status}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.status === "Entregado" && "bg-green-500",
                        item.status === "En Reparto" && "bg-blue-500",
                        item.status === "Pendiente" && "bg-yellow-500",
                        item.status === "Cancelado" && "bg-red-500",
                      )}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

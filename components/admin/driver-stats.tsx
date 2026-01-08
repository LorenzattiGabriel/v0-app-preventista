"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Truck, Package, Clock, DollarSign, TrendingUp } from "lucide-react"

interface DriverStats {
  id: string
  full_name: string
  email: string
  totalRoutes: number
  totalDeliveries: number
  completedDeliveries: number
  totalCollected: number
  avgDeliveriesPerRoute: number
  lastDeliveryDate: string | null
}

export function DriverStats() {
  const [drivers, setDrivers] = useState<DriverStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDriverStats = async () => {
      try {
        const supabase = createClient()

        // 1. Get all drivers
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("role", "repartidor")
          .eq("is_active", true)

        if (profilesError) throw profilesError

        // 2. Get routes data for each driver
        const driversWithStats: DriverStats[] = []

        for (const profile of profiles || []) {
          // Get routes assigned to this driver
          const { data: routes } = await supabase
            .from("routes")
            .select(`
              id,
              status,
              route_orders (
                order_id,
                orders (
                  id,
                  status,
                  total,
                  amount_paid,
                  delivered_at
                )
              )
            `)
            .eq("driver_id", profile.id)

          let totalDeliveries = 0
          let completedDeliveries = 0
          let totalCollected = 0
          let lastDeliveryDate: string | null = null

          for (const route of routes || []) {
            for (const ro of route.route_orders || []) {
              totalDeliveries++
              const order = ro.orders as any
              if (order?.status === "ENTREGADO") {
                completedDeliveries++
                totalCollected += order.amount_paid || 0
                if (!lastDeliveryDate || (order.delivered_at && order.delivered_at > lastDeliveryDate)) {
                  lastDeliveryDate = order.delivered_at
                }
              }
            }
          }

          driversWithStats.push({
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            totalRoutes: routes?.length || 0,
            totalDeliveries,
            completedDeliveries,
            totalCollected,
            avgDeliveriesPerRoute: routes?.length ? totalDeliveries / routes.length : 0,
            lastDeliveryDate,
          })
        }

        // Sort by total deliveries (most active first)
        driversWithStats.sort((a, b) => b.completedDeliveries - a.completedDeliveries)

        setDrivers(driversWithStats)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando estadísticas")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDriverStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error: {error}
      </div>
    )
  }

  if (drivers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay repartidores activos
      </div>
    )
  }

  // Calculate totals
  const totals = drivers.reduce(
    (acc, d) => ({
      routes: acc.routes + d.totalRoutes,
      deliveries: acc.deliveries + d.completedDeliveries,
      collected: acc.collected + d.totalCollected,
    }),
    { routes: 0, deliveries: 0, collected: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repartidores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground">activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rutas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.routes}</div>
            <p className="text-xs text-muted-foreground">rutas asignadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Completadas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.deliveries}</div>
            <p className="text-xs text-muted-foreground">pedidos entregados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totals.collected.toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground">por repartidores</p>
          </CardContent>
        </Card>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Repartidor</CardTitle>
          <CardDescription>Estadísticas detalladas de cada repartidor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Repartidor</th>
                  <th className="text-center py-3 px-2 font-medium">Rutas</th>
                  <th className="text-center py-3 px-2 font-medium">Entregas</th>
                  <th className="text-center py-3 px-2 font-medium">Promedio/Ruta</th>
                  <th className="text-right py-3 px-2 font-medium">Cobrado</th>
                  <th className="text-right py-3 px-2 font-medium">Última Entrega</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver, idx) => (
                  <tr key={driver.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Badge variant="default">🏆 Top</Badge>}
                        <div>
                          <p className="font-medium">{driver.full_name}</p>
                          <p className="text-xs text-muted-foreground">{driver.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">{driver.totalRoutes}</td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="secondary">{driver.completedDeliveries}</Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      {driver.avgDeliveriesPerRoute.toFixed(1)}
                    </td>
                    <td className="text-right py-3 px-2 font-medium text-green-600">
                      ${driver.totalCollected.toLocaleString("es-AR")}
                    </td>
                    <td className="text-right py-3 px-2 text-muted-foreground">
                      {driver.lastDeliveryDate
                        ? new Date(driver.lastDeliveryDate).toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




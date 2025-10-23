"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Clock, MapPin, Star } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function DeliveryReport() {
  // Mock data - replace with real data from Supabase
  const stats = {
    totalRoutes: 156,
    completedRoutes: 142,
    activeRoutes: 8,
    avgDeliveryTime: 45,
    onTimeDelivery: 91.2,
    avgRating: 4.6,
  }

  const driverPerformance = [
    { name: "Carlos Méndez", deliveries: 234, onTime: 95, rating: 4.8 },
    { name: "Roberto Díaz", deliveries: 198, onTime: 92, rating: 4.7 },
    { name: "Martín Gómez", deliveries: 187, onTime: 89, rating: 4.5 },
    { name: "Diego Transportista", deliveries: 176, onTime: 88, rating: 4.4 },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rutas Completadas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedRoutes}</div>
            <p className="text-xs text-muted-foreground">de {stats.totalRoutes} rutas totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDeliveryTime} min</div>
            <p className="text-xs text-muted-foreground">por entrega</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entregas a Tiempo</CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+3.2%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">de 5 estrellas</p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento de Repartidores</CardTitle>
          <CardDescription>Métricas de desempeño por repartidor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {driverPerformance.map((driver) => (
              <div key={driver.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-muted-foreground">{driver.deliveries} entregas</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{driver.onTime}%</p>
                      <p className="text-muted-foreground">A tiempo</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {driver.rating}
                      </p>
                      <p className="text-muted-foreground">Rating</p>
                    </div>
                  </div>
                </div>
                <Progress value={driver.onTime} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

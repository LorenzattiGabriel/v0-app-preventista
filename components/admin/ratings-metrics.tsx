import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, Package, Truck, TrendingUp } from 'lucide-react'

interface RatingsMetricsProps {
  startDate?: string
  endDate?: string
}

/**
 * Ratings Metrics Component
 * Displays customer satisfaction metrics for admin dashboard
 * Can be filtered by date range
 */
export async function RatingsMetrics({ startDate, endDate }: RatingsMetricsProps) {
  const supabase = await createClient()

  // Build query with date filters
  let query = supabase
    .from('order_ratings')
    .select('rating, driver_rating, created_at')

  if (startDate) {
    query = query.gte('created_at', startDate)
  }

  if (endDate) {
    // Add one day to include the entire end date
    const endDatePlusOne = new Date(endDate)
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)
    query = query.lt('created_at', endDatePlusOne.toISOString().split('T')[0])
  }

  const { data: ratings } = await query

  if (!ratings || ratings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calificaciones de Clientes</CardTitle>
          <CardDescription>
            {startDate || endDate 
              ? 'No hay calificaciones en el período seleccionado' 
              : 'Métricas de satisfacción del cliente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {startDate || endDate 
              ? 'No se encontraron calificaciones en el rango de fechas seleccionado. Intenta con otro período.' 
              : 'No hay calificaciones registradas aún'}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate averages
  const avgOrderRating = ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
  const avgDriverRating = ratings.filter(r => r.driver_rating).reduce((sum, r) => sum + (r.driver_rating || 0), 0) / ratings.filter(r => r.driver_rating).length || 0

  // Calculate rating distribution for orders
  const distributionOrder = ratings.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  // Calculate rating distribution for drivers
  const distributionDriver = ratings.filter(r => r.driver_rating).reduce((acc, r) => {
    acc[r.driver_rating!] = (acc[r.driver_rating!] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  const getStarPercentage = (star: number, distribution: Record<number, number>, total: number) => {
    return ((distribution[star] || 0) / total) * 100
  }

  // Format period info
  const getPeriodInfo = () => {
    if (startDate && endDate) {
      return `del ${new Date(startDate).toLocaleDateString('es-AR')} al ${new Date(endDate).toLocaleDateString('es-AR')}`
    } else if (startDate) {
      return `desde ${new Date(startDate).toLocaleDateString('es-AR')}`
    } else if (endDate) {
      return `hasta ${new Date(endDate).toLocaleDateString('es-AR')}`
    }
    return 'de todos los tiempos'
  }

  return (
    <div className="space-y-6">
      {/* Period indicator */}
      {(startDate || endDate) && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            📅 Mostrando métricas {getPeriodInfo()}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificación Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{avgOrderRating.toFixed(1)}</div>
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Promedio de {ratings.length} calificaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificación Repartidores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{avgDriverRating.toFixed(1)}</div>
              <Star className="h-5 w-5 fill-blue-500 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Promedio de {ratings.filter(r => r.driver_rating).length} calificaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfacción General</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(((avgOrderRating + avgDriverRating) / 2)).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Promedio combinado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Ratings Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución - Pedidos</CardTitle>
            <CardDescription>Cantidad de calificaciones por estrella</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                </div>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{ width: `${getStarPercentage(star, distributionOrder, ratings.length)}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {distributionOrder[star] || 0}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Driver Ratings Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución - Repartidores</CardTitle>
            <CardDescription>Cantidad de calificaciones por estrella</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const driverRatingsCount = ratings.filter(r => r.driver_rating).length
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm">{star}</span>
                    <Star className="h-3 w-3 fill-blue-500 text-blue-500" />
                  </div>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${getStarPercentage(star, distributionDriver, driverRatingsCount)}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {distributionDriver[star] || 0}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


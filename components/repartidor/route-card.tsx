import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Package, CalendarDays, Clock, CircleDollarSign, CheckCircle } from "lucide-react"

interface RouteCardProps {
  route: any
  isDelayed?: boolean
  showMoneyCollected?: boolean
  showStatusBadge?: boolean
  inProgressRouteId?: string | null
}

export function RouteCard({ 
  route, 
  isDelayed = false, 
  showMoneyCollected = false, 
  showStatusBadge = false,
  inProgressRouteId = null
}: RouteCardProps) {
  const totalOrders = route.route_orders?.length || 0
  const deliveredOrders =
    route.route_orders?.filter((ro: any) => ro.orders?.status === "ENTREGADO").length || 0

  const statusLabels = {
    PLANIFICADO: "Planificado",
    EN_CURSO: "En Curso",
    COMPLETADO: "Completado",
    CANCELADO: "Cancelado",
  } as const

  const statusColors = {
    PLANIFICADO: "secondary",
    EN_CURSO: "default",
    COMPLETADO: "outline",
    CANCELADO: "destructive",
  } as const

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${isDelayed ? 'border-amber-500/50 bg-amber-500/5' : showMoneyCollected ? 'bg-muted/30' : ''}`}>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${showMoneyCollected ? 'text-muted-foreground' : ''}`}>{route.route_code}</span>
          
          {isDelayed && (
            <Badge variant="outline" className="border-amber-600 text-amber-700">
              <Clock className="mr-1 h-3 w-3" />
              Atrasada
            </Badge>
          )}

          {showStatusBadge && (
            <Badge variant={statusColors[route.status as keyof typeof statusColors]}>
              {statusLabels[route.status as keyof typeof statusLabels]}
            </Badge>
          )}

          {route.status === 'COMPLETADO' && showMoneyCollected && (
             <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">
                <CheckCircle className="mr-1 h-3 w-3" />
                Completada
             </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{route.zones?.name || "Sin zona"}</span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <Package className="h-4 w-4" />
            <span>
              {deliveredOrders}/{totalOrders} entregas
            </span>
          </div>
          
          {showMoneyCollected ? (
            <div className="flex items-center gap-1">
              <CircleDollarSign className="h-4 w-4" />
              <span>
                {(() => {
                  const collected = route.route_orders?.reduce((sum: number, ro: any) => sum + (ro.was_collected ? ro.collected_amount || 0 : 0), 0) || 0
                  const totalExpected = route.route_orders?.reduce((sum: number, ro: any) => sum + (ro.orders?.total || 0), 0) || 0
                  const debt = totalExpected - collected
                  
                  return (
                    <>
                      ${collected.toFixed(2)} <span className="text-muted-foreground">/ ${totalExpected.toFixed(2)}</span>
                      {debt > 0 && (
                        <span className="ml-1 text-red-600 dark:text-red-400 text-xs font-medium">
                          (Deuda: ${debt.toFixed(2)})
                        </span>
                      )}
                    </>
                  )
                })()}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 font-semibold">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {new Date(route.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}
              </span>
              {route.scheduled_start_time && (
                <>
                  -
                  <Clock className="h-4 w-4" />
                  {route.scheduled_start_time.slice(0, 5)}hs
                </>
              )}
            </div>
          )}
        </div>

        {!showMoneyCollected && route.total_distance && (
          <p className="text-xs text-muted-foreground">
            Distancia: {route.total_distance.toFixed(1)} km | Duración estimada:{" "}
            {Math.floor((route.estimated_duration || 0) / 60)}h {(route.estimated_duration || 0) % 60}
            min
          </p>
        )}
      </div>

      <Button 
        asChild 
        disabled={!!inProgressRouteId && route.status !== 'COMPLETADO'} 
        variant={showMoneyCollected ? "outline" : "default"}
        className={`cursor-pointer transition-all duration-300 ${showMoneyCollected ? 'hover:bg-primary/10 hover:shadow-sm' : 'hover:bg-primary/90 hover:shadow-md hover:scale-[1.02]'}`}
      >
        <Link href={`/repartidor/routes/${route.id}`}>
          {showMoneyCollected ? "Ver Detalle" : "Ver Ruta"}
        </Link>
      </Button>
    </div>
  )
}

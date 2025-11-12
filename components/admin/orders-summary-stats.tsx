"use client"

interface OrdersSummaryStatsProps {
  totalOrders: number
  selectedCount: number
}

/**
 * OrdersSummaryStats - Componente que muestra estadísticas resumidas de los pedidos
 * Muestra total de pedidos disponibles y seleccionados
 */
export function OrdersSummaryStats({ 
  totalOrders, 
  selectedCount
}: OrdersSummaryStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
      <div className="text-center p-2 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">Total Pedidos</p>
        <p className="text-lg font-bold">{totalOrders}</p>
      </div>
      <div className="text-center p-2 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">Seleccionados</p>
        <p className="text-lg font-bold text-primary">{selectedCount}</p>
      </div>
    </div>
  )
}


// Reporte de canales: compara ventas vía preventista vs venta directa.
// Server component que delega cálculo al DirectSalesService.

import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SaleKpiCards } from "@/components/venta-directa/sale-kpi-cards"
import { ChannelsChart } from "./channels-chart"

interface Props {
  startDate: Date
  endDate: Date
}

export async function ChannelsReport({ startDate, endDate }: Props) {
  const supabase = await createClient()
  const service = createDirectSalesService(supabase)
  const comparison = await service.compareChannels({ from: startDate, to: endDate })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Canales de venta</h2>
        <p className="text-muted-foreground text-sm">
          Comparativa entre pedidos vía preventista y ventas directas en local
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium mb-3">Preventista</h3>
          <SaleKpiCards kpis={comparison.preventista} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-3">Venta directa</h3>
          <SaleKpiCards kpis={comparison.ventaDirecta} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolución por canal</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelsChart series={comparison.series} />
        </CardContent>
      </Card>
    </div>
  )
}

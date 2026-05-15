import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { SaleKpiCards } from "@/components/venta-directa/sale-kpi-cards"
import { SalesTable } from "@/components/venta-directa/sales-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function VentaDirectaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const service = createDirectSalesService(supabase)

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todayKpis, monthKpis, allSales] = await Promise.all([
    service.getKPIs({
      channel: "venta_directa",
      range: { from: startOfDay, to: now },
      userId: user.id,
    }),
    service.getKPIs({
      channel: "venta_directa",
      range: { from: startOfMonth, to: now },
      userId: user.id,
    }),
    service.listSales({ userId: user.id, limit: 500 }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Venta Directa</h1>
          <p className="text-sm text-muted-foreground">
            Hola{" "}
            <span className="font-medium">
              {user.user_metadata?.full_name || user.email}
            </span>
          </p>
        </div>
        <Link href="/venta-directa/ventas/nueva">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-1" />
            Nueva venta
          </Button>
        </Link>
      </div>

      <SaleKpiCards kpis={todayKpis} title="Hoy" />
      <SaleKpiCards kpis={monthKpis} title="Mes en curso" />

      <Card>
        <CardHeader>
          <CardTitle>Todas mis ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesTable sales={allSales} pageSize={20} />
        </CardContent>
      </Card>
    </div>
  )
}

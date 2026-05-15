import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { DashboardKpis } from "@/components/venta-directa/dashboard-kpis"
import { SalesTable } from "@/components/venta-directa/sales-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function VentaDirectaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const service = createDirectSalesService(supabase)
  const allSales = await service.listSales({ userId: user.id, limit: 1000 })

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

      <DashboardKpis sales={allSales} />

      <Card>
        <CardHeader>
          <CardTitle>Historial de ventas ({allSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesTable sales={allSales} pageSize={20} />
        </CardContent>
      </Card>
    </div>
  )
}

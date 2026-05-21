import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus } from "lucide-react"
import { SalesTable } from "@/components/venta-directa/sales-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function VentasListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const service = createDirectSalesService(supabase)
  const sales = await service.listSales({ userId: user.id, limit: 1000 })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/venta-directa/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Mis ventas</h1>
        </div>
        <Link href="/venta-directa/ventas/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Nueva venta
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial completo ({sales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesTable sales={sales} pageSize={25} />
        </CardContent>
      </Card>
    </div>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { DownloadSaleReceiptButton } from "@/components/venta-directa/download-sale-receipt-button"

export const dynamic = "force-dynamic"

export default async function VentasListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const service = createDirectSalesService(supabase)
  const sales = await service.listSales({ userId: user.id, limit: 200 })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis ventas</h1>
        <Link href="/venta-directa/ventas/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Nueva venta
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas {sales.length} ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no registraste ventas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-left">Pago</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 font-mono">{s.order_number}</td>
                      <td className="px-3 py-2">{s.customer?.commercial_name || "—"}</td>
                      <td className="px-3 py-2">
                        {new Date(s.created_at).toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        ${s.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">{s.payment_method || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/venta-directa/ventas/${s.id}`}
                            className="text-primary hover:underline"
                          >
                            Ver
                          </Link>
                          <DownloadSaleReceiptButton sale={s} variant="ghost" size="icon">
                            {null}
                          </DownloadSaleReceiptButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

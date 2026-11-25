import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createDirectSalesService } from "@/lib/services/directSalesService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Wallet, Store } from "lucide-react"
import { getLocalDateString } from "@/lib/utils/dates"
import { CierreCajaPrintButton } from "@/components/admin/cierre-caja-print-button"

export const dynamic = "force-dynamic"
export const revalidate = 0

function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return getLocalDateString(d)
}

function dateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

const fmtMoney = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function CierreCajaVentaDirectaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const date = params.date || getLocalDateString()
  const range = {
    from: new Date(`${date}T00:00:00`),
    to: new Date(`${date}T23:59:59.999`),
  }

  const service = createDirectSalesService(supabase)
  const [kpis, sellerRanking, salesRaw] = await Promise.all([
    service.getKPIs({ channel: "venta_directa", range }),
    service.getSellerRanking(range),
    service.listSales({ from: range.from, to: range.to, limit: 500 }),
  ])

  // listSales no filtra CANCELADO (tiene sentido para el historial del
  // vendedor, donde querés ver tus cancelaciones) — pero acá es un cierre de
  // caja: si se deja una cancelada mezclada, el total de la tabla no
  // coincide con el de getKPIs (que sí la excluye) y puede mostrar plata que
  // nunca entró a la caja.
  const sales = salesRaw.filter((s) => s.status !== "CANCELADO")

  // Nombre del vendedor por venta: listSales no lo trae embebido (lo arma a
  // partir del rol venta_directa, no de un join), así que resolvemos los
  // nombres en un segundo paso con los profiles de quienes vendieron ese día.
  const sellerIds = Array.from(new Set(sales.map((s) => s.created_by).filter(Boolean))) as string[]
  const { data: sellerProfiles } = sellerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", sellerIds)
    : { data: [] as { id: string; full_name: string }[] }
  const nameById = new Map((sellerProfiles || []).map((p) => [p.id, p.full_name]))

  const paymentBreakdown = [...kpis.paymentBreakdown].sort((a, b) => b.amount - a.amount)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Cierre de Caja — Venta Directa</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <form action="/auth/logout" method="post">
              <Button variant="outline" size="sm">Cerrar Sesión</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link href="/admin/reports">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Reportes
              </Link>
            </Button>
            <CierreCajaPrintButton
              date={date}
              dateLabel={dateLabel(date)}
              totals={{
                totalSales: kpis.totalSales,
                totalRevenue: kpis.totalRevenue,
                averageTicket: kpis.averageTicket,
                accountReceivable: kpis.accountReceivable,
              }}
              paymentBreakdown={paymentBreakdown}
              sellerRanking={sellerRanking}
              sales={sales.map((s) => ({
                orderNumber: s.order_number,
                createdAt: s.created_at,
                sellerName: s.created_by ? nameById.get(s.created_by) || "—" : "—",
                customerName: s.customer?.commercial_name || "Consumidor final",
                total: s.total,
                paymentMethod: s.payment_method || "—",
              }))}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="capitalize">{dateLabel(date)}</CardTitle>
                  <CardDescription>
                    Total vendido en el mostrador y cómo se cobró, para cerrar la caja del día
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/admin/venta-directa/cierre-caja?date=${shiftDate(date, -1)}`}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <form className="flex">
                    <Input type="date" name="date" defaultValue={date} className="h-9 w-[150px]" />
                    <Button type="submit" variant="outline" size="sm" className="ml-1">Ir</Button>
                  </form>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/admin/venta-directa/cierre-caja?date=${shiftDate(date, 1)}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Totales del día */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total vendido</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {fmtMoney(kpis.totalRevenue)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Ventas</p>
                  <p className="text-2xl font-bold">{kpis.totalSales}</p>
                  <p className="text-xs text-muted-foreground">ticket prom. {fmtMoney(kpis.averageTicket)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-xs text-muted-foreground">A cuenta corriente</p>
                  <p className="text-2xl font-bold">{fmtMoney(kpis.accountReceivable)}</p>
                  <p className="text-xs text-muted-foreground">no es plata en caja</p>
                </div>
              </div>

              {/* Desglose por método de pago */}
              <div>
                <p className="text-sm font-medium mb-3">Desglose por método de pago</p>
                {paymentBreakdown.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paymentBreakdown.map((p) => (
                      <div key={p.method} className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">{p.method}</p>
                        <p className="text-lg font-bold">{fmtMoney(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.count} {p.count === 1 ? "pago" : "pagos"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin ventas este día</p>
                )}
              </div>

              {/* Por vendedor */}
              {sellerRanking.length > 1 && (
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Por vendedor
                  </p>
                  <div className="space-y-2">
                    {sellerRanking.map((s) => (
                      <div key={s.sellerId} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{s.sellerName}</span>
                        <div className="text-right">
                          <p className="font-semibold">{fmtMoney(s.revenue)}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.sales} {s.sales === 1 ? "venta" : "ventas"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ventas del día</CardTitle>
              <CardDescription>{sales.length} {sales.length === 1 ? "venta" : "ventas"}</CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-muted-foreground">
                            {new Date(s.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell>
                            <Link href={`/admin/orders/${s.id}`} className="text-blue-600 hover:underline">
                              {s.order_number}
                            </Link>
                          </TableCell>
                          <TableCell>{s.customer?.commercial_name || "Consumidor final"}</TableCell>
                          <TableCell>{s.created_by ? nameById.get(s.created_by) || "—" : "—"}</TableCell>
                          <TableCell>{s.payment_method || "—"}</TableCell>
                          <TableCell className="text-right font-medium">{fmtMoney(s.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay ventas registradas este día</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

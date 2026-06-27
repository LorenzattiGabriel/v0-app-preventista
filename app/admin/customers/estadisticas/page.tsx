import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Trophy,
  Clock,
  UserPlus,
  AlertTriangle,
  Receipt,
  ShoppingCart,
} from "lucide-react"
import { AccountsPagination } from "@/components/admin/accounts-pagination"
import { InactiveThresholdFilter } from "@/components/admin/inactive-threshold-filter"
import { CollapsibleSection } from "@/components/admin/collapsible-section"
import {
  createCustomerStatsService,
  CUSTOMER_STATS_PER_PAGE,
  DEFAULT_INACTIVE_DAYS,
  type CustomerStatRow,
} from "@/lib/services/customerStatsService"

const formatARS = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR") : "—"

function RankingTable({
  rows,
  metric,
}: {
  rows: CustomerStatRow[]
  metric: (r: CustomerStatRow) => string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Sin datos.</p>
  }
  return (
    <Table>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.id}>
            <TableCell className="w-8 text-muted-foreground font-medium">{i + 1}</TableCell>
            <TableCell>
              <Link href={`/admin/customers/${r.id}`} className="font-medium hover:underline">
                {r.commercial_name}
              </Link>
              <div className="text-xs text-muted-foreground">{r.code}</div>
            </TableCell>
            <TableCell className="text-right font-semibold whitespace-nowrap">{metric(r)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function CustomerStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ inactiveDays?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const inactiveDays = Math.max(1, parseInt(params.inactiveDays || "") || DEFAULT_INACTIVE_DAYS)
  const page = Math.max(1, parseInt(params.page || "1") || 1)

  const service = createCustomerStatsService(supabase)
  const [kpis, rankings, composition, inactive] = await Promise.all([
    service.getKpis(inactiveDays),
    service.getRankings(10),
    service.getComposition(inactiveDays),
    service.getInactiveCustomers(inactiveDays, page),
  ])

  const activePct =
    kpis.totalActive > 0 ? Math.round((kpis.active30 / kpis.totalActive) * 100) : 0

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Estadísticas de clientes</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <form action="/auth/logout" method="post">
              <Button variant="outline" size="sm">
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
          </div>

          {/* KPIs */}
          <CollapsibleSection
            title="Resumen general"
            description="Activos, nuevos, facturación y ticket promedio"
            storageKey="stats-kpis"
            icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          >
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Clientes activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{kpis.totalActive}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  Pidieron últimos 30d
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {kpis.active30} <span className="text-sm text-muted-foreground">({activePct}%)</span>
                </div>
              </CardContent>
            </Card>
            <Card className={kpis.inactiveCount > 0 ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Inactivos (≥{inactiveDays}d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-600">{kpis.inactiveCount}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <UserPlus className="h-4 w-4 text-green-500" />
                  Nuevos este mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">{kpis.newThisMonth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Facturación total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">${formatARS(kpis.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                  Ticket promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">${formatARS(kpis.avgTicketGlobal)}</div>
              </CardContent>
            </Card>
          </div>
          </CollapsibleSection>

          {/* Rankings */}
          <CollapsibleSection
            title="Rankings de clientes"
            description="Top facturación, pedidos, ticket y los que dejaron de pedir"
            storageKey="stats-rankings"
            icon={<Trophy className="h-5 w-5 text-amber-500" />}
          >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Top facturación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RankingTable rows={rankings.topRevenue} metric={(r) => `$${formatARS(r.total_spent)}`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  Top por cantidad de pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RankingTable rows={rankings.topOrders} metric={(r) => `${r.orders_count} pedidos`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Mayor ticket promedio
                </CardTitle>
                <CardDescription className="text-xs">Mínimo 2 entregas</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingTable rows={rankings.topTicket} metric={(r) => `$${formatARS(r.avg_ticket)}`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Hace más que no piden
                </CardTitle>
                <CardDescription className="text-xs">Para reactivar</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingTable
                  rows={rankings.leastActive}
                  metric={(r) => `${r.days_since_last_order}d`}
                />
              </CardContent>
            </Card>
          </div>
          </CollapsibleSection>

          {/* Composición */}
          <CollapsibleSection
            title="Composición de la cartera"
            description="Mayoristas/minoristas, activos y por localidad"
            storageKey="stats-composicion"
            defaultOpen={false}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          >
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-sm text-muted-foreground">Mayoristas</div>
                  <div className="text-2xl font-bold">{composition.mayorista}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Minoristas</div>
                  <div className="text-2xl font-bold">{composition.minorista}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Activos (30d)</div>
                  <div className="text-2xl font-bold text-green-600">{composition.active30}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Inactivos (≥{inactiveDays}d)</div>
                  <div className="text-2xl font-bold text-amber-600">{composition.inactive}</div>
                </div>
              </div>
              {composition.byZone.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {composition.byZone.map((z) => (
                    <Badge key={z.zone} variant="secondary">
                      {z.zone}: {z.count}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </CollapsibleSection>

          {/* Clientes inactivos (lista) */}
          <CollapsibleSection
            title="Clientes que dejaron de pedir"
            description={`No compran hace ${inactiveDays} días o más · seguimiento y reactivación`}
            storageKey="stats-inactivos"
            icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          >
          <Card>
            <CardContent className="space-y-4 pt-6">
              <InactiveThresholdFilter defaultValue={inactiveDays} />

              {inactive.rows.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Localidad</TableHead>
                          <TableHead className="text-right">Días sin pedir</TableHead>
                          <TableHead>Último pedido</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead>Teléfono</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactive.rows.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Link
                                href={`/admin/customers/${c.id}`}
                                className="font-medium hover:underline"
                              >
                                {c.commercial_name}
                              </Link>
                              <div className="text-xs text-muted-foreground">{c.code}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={c.customer_type === "mayorista" ? "secondary" : "default"}>
                                {c.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {c.locality || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-amber-600">
                                {c.days_since_last_order}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(c.last_order_date)}</TableCell>
                            <TableCell className="text-right text-sm">{c.orders_count}</TableCell>
                            <TableCell className="text-right">
                              {c.current_balance > 0 ? (
                                <span className="font-semibold text-red-600">
                                  ${formatARS(c.current_balance)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {c.phone ? (
                                <a
                                  href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {c.phone}
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <AccountsPagination
                    currentPage={page}
                    totalPages={inactive.totalPages}
                    totalCount={inactive.count}
                    perPage={CUSTOMER_STATS_PER_PAGE}
                    itemLabel="clientes"
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    No hay clientes inactivos con este umbral
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Probá bajar los días</p>
                </div>
              )}
            </CardContent>
          </Card>
          </CollapsibleSection>
        </div>
      </main>
    </div>
  )
}

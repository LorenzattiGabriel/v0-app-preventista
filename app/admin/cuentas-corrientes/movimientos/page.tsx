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
  Wallet,
  TrendingUp,
  TrendingDown,
  Truck,
  Building2,
  FileText,
  ArrowDownRight,
} from "lucide-react"
import { AccountsPagination } from "@/components/admin/accounts-pagination"
import { FinancialMovementsFilters } from "@/components/admin/financial-movements-filters"
import { ExportMovementsButton } from "@/components/admin/export-movements-button"
import {
  createFinancialMovementsService,
  FINANCIAL_MOVEMENTS_PER_PAGE,
  type FinancialMovementsFilters as Filters,
} from "@/lib/services/financialMovementsService"

const formatARS = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

const CONCEPT_LABELS: Record<string, string> = {
  DEUDA_PEDIDO: "Deuda de pedido",
  PAGO_EFECTIVO: "Pago efectivo",
  PAGO_TRANSFERENCIA: "Pago transferencia",
  PAGO_TARJETA: "Pago tarjeta",
  PAGO_CHEQUE: "Pago cheque",
  PAGO_CUENTA_CORRIENTE: "Pago cta. corriente",
  PAGO_OTRO: "Pago (otro)",
  AJUSTE_CREDITO: "Ajuste a favor",
  AJUSTE_DEBITO: "Ajuste en contra",
  NOTA_CREDITO: "Nota de crédito",
  PAGO_ADELANTADO: "Pago adelantado",
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
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

  const page = Math.max(1, parseInt(params.page || "1") || 1)

  const filters: Filters = {
    search: params.search,
    source: params.source as Filters["source"],
    direction: params.direction as Filters["direction"],
    channel: params.channel as Filters["channel"],
    paymentMethod: params.paymentMethod,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  }

  const service = createFinancialMovementsService(supabase)
  const { rows, count, totalPages, totals } = await service.listMovements(filters, page)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Movimientos financieros</h1>
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
          {/* Tabs Saldos / Movimientos */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-md border bg-background p-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/cuentas-corrientes">Saldos</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/admin/cuentas-corrientes/movimientos">Movimientos</Link>
              </Button>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Ingresos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">${formatARS(totals.ingresos)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  Cobrado en ruta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">${formatARS(totals.cobradoEnRuta)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Cobrado fuera de ruta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">${formatARS(totals.cobradoFueraRuta)}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Egresos a proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">${formatARS(totals.egresosProveedores)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Cargos a clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">${formatARS(totals.cargosClientes)}</div>
              </CardContent>
            </Card>
            <Card className={totals.neto >= 0 ? "border-green-200" : "border-red-200"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  Neto de caja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${totals.neto >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${formatARS(totals.neto)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Movimientos</CardTitle>
                <CardDescription>
                  Cobros en ruta, ingresos y egresos fuera de ruta y egresos a proveedores. Ingreso = cobro
                  (entra plata); Egreso = cargo a cliente o pago a proveedor.
                </CardDescription>
              </div>
              <ExportMovementsButton params={params} />
            </CardHeader>
            <CardContent className="space-y-4">
              <FinancialMovementsFilters
                defaults={{
                  search: params.search,
                  source: params.source,
                  direction: params.direction,
                  channel: params.channel,
                  paymentMethod: params.paymentMethod,
                  dateFrom: params.dateFrom,
                  dateTo: params.dateTo,
                }}
              />

              {rows.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Quién</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Ingreso</TableHead>
                          <TableHead className="text-right">Egreso</TableHead>
                          <TableHead>Ref.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((m) => {
                          const isIngreso = m.direction === "ingreso"
                          return (
                            <TableRow key={`${m.source}-${m.id}`}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatDateTime(m.date)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{m.party_name || "—"}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {m.party_type === "cliente" ? "Cliente" : "Proveedor"}
                                    {m.party_code ? ` · ${m.party_code}` : ""}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[220px]">
                                <span className="text-sm">
                                  {CONCEPT_LABELS[m.concept || ""] || m.concept || "—"}
                                </span>
                                {m.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {m.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {m.channel === "ruta" ? (
                                  <Badge variant="default">🚚 Ruta</Badge>
                                ) : m.channel === "fuera_ruta" ? (
                                  <Badge variant="secondary">🏢 Fuera de ruta</Badge>
                                ) : (
                                  <Badge variant="outline">📦 Proveedor</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {m.payment_method || "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {isIngreso ? `$${formatARS(m.amount)}` : ""}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                {!isIngreso ? `$${formatARS(m.amount)}` : ""}
                              </TableCell>
                              <TableCell>
                                {m.order_id ? (
                                  <Link
                                    href={`/admin/orders/${m.order_id}`}
                                    className="text-sm text-primary hover:underline"
                                  >
                                    {m.order_number || "Pedido"}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <AccountsPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalCount={count}
                    perPage={FINANCIAL_MOVEMENTS_PER_PAGE}
                    itemLabel="movimientos"
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <ArrowDownRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    No se encontraron movimientos
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Probá cambiar los filtros</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

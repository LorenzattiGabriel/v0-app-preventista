import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { ArrowLeft, Wallet, Search, AlertTriangle, TrendingDown, TrendingUp, FileText } from "lucide-react"
import { AdjustBalanceDialog } from "@/components/admin/adjust-balance-dialog"
import { AccountsPagination } from "@/components/admin/accounts-pagination"

const PER_PAGE = 25

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export default async function AdminCuentasCorrientesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; balance?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const page = Math.max(1, parseInt(params.page || "1") || 1)
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  let query = supabase
    .from("customers")
    .select("id, code, commercial_name, contact_name, customer_type, current_balance, credit_limit", { count: "exact" })
    .eq("is_active", true)

  if (params.type && params.type !== "all") {
    query = query.eq("customer_type", params.type)
  }

  if (params.search) {
    query = query.or(
      `commercial_name.ilike.%${params.search}%,contact_name.ilike.%${params.search}%,code.ilike.%${params.search}%`,
    )
  }

  if (params.balance === "debt") {
    query = query.gt("current_balance", 0)
  } else if (params.balance === "credit") {
    query = query.lt("current_balance", 0)
  } else if (params.balance === "zero") {
    query = query.or("current_balance.eq.0,current_balance.is.null")
  }

  const orderColumn = params.balance === "credit" ? "current_balance" : "current_balance"
  const orderAsc = params.balance === "credit"
  const { data: customers, count } = await query
    .order(orderColumn, { ascending: orderAsc, nullsFirst: false })
    .order("commercial_name", { ascending: true })
    .range(from, to)

  // KPIs globales (sobre TODOS los clientes activos, no solo la página)
  const { data: allBalances } = await supabase
    .from("customers")
    .select("current_balance")
    .eq("is_active", true)

  const totalDebt = allBalances?.reduce((s, c) => s + Math.max(0, toNum(c.current_balance)), 0) || 0
  const totalCredit = allBalances?.reduce((s, c) => s + Math.max(0, -toNum(c.current_balance)), 0) || 0
  const customersWithDebt = allBalances?.filter(c => toNum(c.current_balance) > 0).length || 0
  const customersWithCredit = allBalances?.filter(c => toNum(c.current_balance) < 0).length || 0

  const totalCount = count || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE))

  const formatARS = (n: number) =>
    n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Cuentas Corrientes</h1>
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={customersWithDebt > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${customersWithDebt > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  Clientes con deuda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${customersWithDebt > 0 ? "text-red-600" : ""}`}>{customersWithDebt}</div>
              </CardContent>
            </Card>
            <Card className={totalDebt > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${totalDebt > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  Total a cobrar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalDebt > 0 ? "text-red-600" : ""}`}>${formatARS(totalDebt)}</div>
              </CardContent>
            </Card>
            <Card className={customersWithCredit > 0 ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className={`h-4 w-4 ${customersWithCredit > 0 ? "text-green-500" : "text-muted-foreground"}`} />
                  Clientes con saldo a favor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${customersWithCredit > 0 ? "text-green-600" : ""}`}>{customersWithCredit}</div>
              </CardContent>
            </Card>
            <Card className={totalCredit > 0 ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className={`h-4 w-4 ${totalCredit > 0 ? "text-green-500" : "text-muted-foreground"}`} />
                  Total a favor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalCredit > 0 ? "text-green-600" : ""}`}>${formatARS(totalCredit)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Saldos por cliente</CardTitle>
              <CardDescription>
                Carga de saldos iniciales y ajustes contables. Los pagos se registran desde el detalle del cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <form className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="search"
                      placeholder="Buscar por nombre, código o contacto..."
                      className="pl-10"
                      defaultValue={params.search}
                    />
                  </div>
                  <Select name="type" defaultValue={params.type || "all"}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="minorista">Minorista</SelectItem>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select name="balance" defaultValue={params.balance || "all"}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Saldo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los saldos</SelectItem>
                      <SelectItem value="debt">🔴 Con deuda</SelectItem>
                      <SelectItem value="credit">🟢 Saldo a favor</SelectItem>
                      <SelectItem value="zero">⚪ Sin saldo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit">
                    <Search className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                </form>

                {customers && customers.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Saldo actual</TableHead>
                            <TableHead className="text-right">Límite crédito</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customers.map((c: any) => {
                            const balance = toNum(c.current_balance)
                            const creditLimit = toNum(c.credit_limit)
                            const overLimit = creditLimit > 0 && balance > creditLimit
                            return (
                              <TableRow key={c.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{c.commercial_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {c.code} {c.contact_name && `· ${c.contact_name}`}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={c.customer_type === "mayorista" ? "secondary" : "default"}>
                                    {c.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {balance > 0 ? (
                                    <span className="font-semibold text-red-600">
                                      ${formatARS(balance)}
                                    </span>
                                  ) : balance < 0 ? (
                                    <span className="font-semibold text-green-600">
                                      -${formatARS(Math.abs(balance))}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">$0.00</span>
                                  )}
                                  {overLimit && (
                                    <div className="text-xs text-red-600 mt-1">⚠️ Supera límite</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {creditLimit > 0 ? `$${formatARS(creditLimit)}` : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button asChild variant="outline" size="sm">
                                      <Link href={`/admin/customers/${c.id}`}>
                                        <FileText className="h-4 w-4 mr-1" />
                                        Historial
                                      </Link>
                                    </Button>
                                    <AdjustBalanceDialog
                                      customerId={c.id}
                                      customerName={c.commercial_name}
                                      currentBalance={balance}
                                    />
                                  </div>
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
                      totalCount={totalCount}
                      perPage={PER_PAGE}
                      itemLabel="clientes"
                    />
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No se encontraron clientes</p>
                    <p className="text-sm text-muted-foreground mt-2">Probá cambiar los filtros</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

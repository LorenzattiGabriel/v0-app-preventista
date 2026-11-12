import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NavButton } from "@/components/shared/action-button"
import Link from "next/link"
import { Package, Clock, CheckCircle, Truck, AlertTriangle, Wallet, TrendingUp, TrendingDown, ShoppingBasket } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getClientOrderStatusLabel, getClientOrderStatusColor } from "@/lib/utils/client-order-status"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export default async function ClienteDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/cliente/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "cliente") {
    redirect("/cliente/login")
  }

  // Get customer record
  // Portal con código de acceso: el vínculo es profiles.customer_id, no el
  // email (el profile de un cliente de portal usa un email sintético interno).
  const { data: customer } = profile.customer_id
    ? await supabase.from("customers").select("*").eq("id", profile.customer_id).single()
    : { data: null }

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Cliente no encontrado</CardTitle>
            <CardDescription>No se encontró un registro de cliente asociado a su cuenta.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Get order statistics
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)

  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .in("status", ["PENDIENTE_ARMADO", "EN_ARMADO", "PENDIENTE_ENTREGA"])

  const { count: inTransitOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .eq("status", "EN_REPARTICION")

  const { count: deliveredOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .eq("status", "ENTREGADO")

  // Get recent orders (incluye route info para derivar el label correcto al cliente)
  const { data: orders } = await supabase
    .from("orders")
    .select("*, route_orders(routes(actual_start_time, status))")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(5)

  // Count orders with shortages
  const { count: ordersWithShortages } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .eq("has_shortages", true)
    .in("status", ["PENDIENTE_ENTREGA", "EN_REPARTICION"])

  // "Mis compras" — reporte simple: gasto del mes vs mes anterior y
  // productos más comprados (histórico, solo pedidos entregados).
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const { data: thisMonthOrders } = await supabase
    .from("orders")
    .select("total")
    .eq("customer_id", customer.id)
    .eq("status", "ENTREGADO")
    .gte("delivered_at", thisMonthStart.toISOString())

  const { data: lastMonthOrders } = await supabase
    .from("orders")
    .select("total")
    .eq("customer_id", customer.id)
    .eq("status", "ENTREGADO")
    .gte("delivered_at", lastMonthStart.toISOString())
    .lte("delivered_at", lastMonthEnd.toISOString())

  const thisMonthSpent = (thisMonthOrders || []).reduce((s, o) => s + toNum(o.total), 0)
  const thisMonthCount = thisMonthOrders?.length || 0
  const lastMonthSpent = (lastMonthOrders || []).reduce((s, o) => s + toNum(o.total), 0)
  const spentChangePct = lastMonthSpent > 0 ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100 : null
  const avgTicket = thisMonthCount > 0 ? thisMonthSpent / thisMonthCount : 0

  const { data: productRows } = await supabase
    .from("order_items")
    .select(
      "quantity_delivered, quantity_assembled, quantity_requested, subtotal, product:products!order_items_product_id_fkey(id, name), orders!inner(customer_id, status)",
    )
    .eq("orders.customer_id", customer.id)
    .eq("orders.status", "ENTREGADO")

  const productMap = new Map<string, { name: string; quantity: number; spent: number }>()
  for (const row of (productRows || []) as any[]) {
    if (!row.product) continue
    const qty = toNum(row.quantity_delivered ?? row.quantity_assembled ?? row.quantity_requested)
    const cur = productMap.get(row.product.id) || { name: row.product.name, quantity: 0, spent: 0 }
    cur.quantity += qty
    cur.spent += toNum(row.subtotal)
    productMap.set(row.product.id, cur)
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Mis Pedidos</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{customer.commercial_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bienvenido, {customer.contact_name}</h2>
            <p className="text-muted-foreground">Gestiona y rastrea tus pedidos</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Link href="/cliente/cuenta">
              <Card className={`h-full transition-colors hover:bg-muted/50 ${Number(customer.current_balance) > 0 ? "border-red-300 bg-red-50/60 dark:bg-red-950/20" : ""}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mi Cuenta Corriente</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${Number(customer.current_balance) > 0 ? "text-red-600" : Number(customer.current_balance) < 0 ? "text-green-600" : ""}`}>
                    ${Math.abs(Number(customer.current_balance) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Number(customer.current_balance) > 0 ? "Saldo a pagar" : Number(customer.current_balance) < 0 ? "Saldo a favor" : "Sin saldo pendiente"}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Todos tus pedidos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Preparándose</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Camino</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inTransitOrders || 0}</div>
                <p className="text-xs text-muted-foreground">En repartición</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Completados</p>
              </CardContent>
            </Card>
          </div>

          {/* Shortages Alert */}
          {ordersWithShortages && ordersWithShortages > 0 && (
            <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100">
                ⚠️ Pedidos con Productos Faltantes
              </AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Tienes {ordersWithShortages} {ordersWithShortages === 1 ? 'pedido' : 'pedidos'} con productos faltantes. 
                Los productos que no estaban disponibles no serán incluidos en tu entrega. 
                El monto final se ajustará automáticamente.{' '}
                <Link href="/cliente/orders?has_shortages=true" className="underline font-medium">
                  Ver pedidos con faltantes
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBasket className="h-5 w-5" />
                Mis Compras
              </CardTitle>
              <CardDescription>Resumen simple de lo que comprás</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Este mes</p>
                  <p className="text-xl font-bold">
                    ${thisMonthSpent.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {thisMonthCount} {thisMonthCount === 1 ? "pedido entregado" : "pedidos entregados"}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Vs. mes anterior</p>
                  {spentChangePct === null ? (
                    <p className="text-xl font-bold text-muted-foreground">—</p>
                  ) : (
                    <p className={`text-xl font-bold flex items-center gap-1 ${spentChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {spentChangePct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {Math.abs(spentChangePct).toFixed(0)}%
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ${lastMonthSpent.toLocaleString("es-AR", { minimumFractionDigits: 0 })} el mes pasado
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Ticket promedio</p>
                  <p className="text-xl font-bold">
                    ${avgTicket.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">este mes</p>
                </div>
              </div>

              {topProducts.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Tus productos más comprados</p>
                  <div className="space-y-1.5">
                    {topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between text-sm p-2 border rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">{i + 1}.</span>
                          {p.name}
                        </span>
                        <span className="text-muted-foreground">
                          {p.quantity.toLocaleString("es-AR", { maximumFractionDigits: 2 })} u.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pedidos Recientes</CardTitle>
                  <CardDescription>Tus últimos 5 pedidos</CardDescription>
                </div>
                <NavButton href="/cliente/orders" variant="outline">Ver Todos</NavButton>
              </div>
            </CardHeader>
            <CardContent>
              {orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{order.order_number}</span>
                          <Badge variant={getClientOrderStatusColor(order)}>
                            {getClientOrderStatusLabel(order)}
                          </Badge>
                          {order.has_shortages && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700">
                              ⚠️ Con Faltantes
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Fecha: {new Date(order.order_date).toLocaleDateString("es-AR")} | Entrega:{" "}
                          {new Date(order.delivery_date).toLocaleDateString("es-AR")}
                        </p>
                        <p className="text-sm font-medium">Total: ${order.total.toFixed(2)}</p>
                        {order.has_shortages && (
                          <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                            Algunos productos no están disponibles
                          </p>
                        )}
                      </div>
                      <Button asChild variant="outline">
                        <Link href={`/cliente/orders/${order.id}`}>Ver Detalle</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No tienes pedidos registrados</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

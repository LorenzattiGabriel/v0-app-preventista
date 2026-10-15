import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Package, MapPin, Receipt } from "lucide-react"

const ORDERS_LIMIT = 50

const STATUS_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  PENDIENTE_ARMADO: "Pendiente de armado",
  EN_ARMADO: "En armado",
  PENDIENTE_ENTREGA: "Pendiente de entrega",
  EN_REPARTICION: "En reparto",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
  ESPERANDO_STOCK: "Esperando stock",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ENTREGADO: "default",
  CANCELADO: "destructive",
  EN_REPARTICION: "secondary",
  PENDIENTE_ENTREGA: "secondary",
}

export default async function PreventistaCustomerHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "preventista") redirect("/auth/login")

  const { data: customer } = await supabase
    .from("customers")
    .select("id, code, commercial_name, legal_name, locality, province, customer_type, phone")
    .eq("id", id)
    .maybeSingle()

  if (!customer) redirect("/preventista/customers")

  // Historial COMPLETO del cliente, sin filtrar por quién cargó el pedido: si
  // se filtrara por created_by, un pedido cargado por administración u otro
  // preventista desaparecería y el historial mentiría sobre lo que compró.
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, order_date, delivery_date, status, total, order_type, observations")
    .eq("customer_id", id)
    .order("order_date", { ascending: false })
    .limit(ORDERS_LIMIT)

  if (ordersError) {
    console.error("[preventista/historial] Error cargando pedidos:", ordersError)
  }

  const visibleOrders = orders || []
  const deliveredOrders = visibleOrders.filter((o: any) => o.status === "ENTREGADO")
  const totalDelivered = deliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
  const money = (n: number) =>
    `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/preventista/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Clientes
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-4 md:p-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{customer.commercial_name}</h1>
            <p className="text-sm text-muted-foreground">
              {customer.code}
              {customer.locality ? ` · ${customer.locality}` : ""}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visibleOrders.length}</div>
                <p className="text-xs text-muted-foreground">últimos {ORDERS_LIMIT}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredOrders.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total entregado</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{money(totalDelivered)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Pedidos</CardTitle>
              <CardDescription>
                Todos los pedidos del cliente, sin importar quién los cargó. Solo lectura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visibleOrders.length > 0 ? (
                <div className="max-h-[32rem] overflow-y-auto pr-1 space-y-2">
                  {visibleOrders.map((order: any) => (
                    <div key={order.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{order.order_number}</span>
                          <Badge variant={STATUS_VARIANTS[order.status] ?? "outline"}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                        </div>
                        <span className="font-bold">{money(Number(order.total) || 0)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pedido: {new Date(order.order_date + "T00:00:00").toLocaleDateString("es-AR")}
                        {order.delivery_date &&
                          ` · Entrega: ${new Date(order.delivery_date + "T00:00:00").toLocaleDateString("es-AR")}`}
                        {order.order_type ? ` · ${order.order_type}` : ""}
                      </p>
                      {order.observations && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{order.observations}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : ordersError ? (
                <div className="text-center py-8 space-y-1">
                  <p className="text-destructive font-medium">No se pudieron cargar los pedidos</p>
                  <p className="text-sm text-muted-foreground">
                    Hubo un error al consultar la base. Recargá la página.
                  </p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Este cliente todavía no tiene pedidos
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

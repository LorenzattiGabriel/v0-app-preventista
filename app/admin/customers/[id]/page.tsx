import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ArrowLeft,
  Users,
  MapPin,
  Phone,
  Mail,
  Building2,
  Calendar,
  Package,
  TrendingUp,
  Star,
  CreditCard,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react"
import { RegisterPaymentDialog } from "@/components/admin/register-payment-dialog"

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/auth/login")
  }

  // Get customer with all details
  const { data: customer } = await supabase
    .from("customers")
    .select(
      `
      *,
      zones (
        name,
        description
      ),
      profiles:created_by (
        full_name,
        email
      )
    `,
    )
    .eq("id", id)
    .single()

  if (!customer) {
    redirect("/admin/customers")
  }

  // Get customer orders
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Get customer ratings
  const { data: ratings } = await supabase
    .from("order_ratings")
    .select(
      `
      *,
      orders (
        order_number
      )
    `,
    )
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })

  // Get customer account movements (cuenta corriente)
  const { data: accountMovements } = await supabase
    .from("customer_account_movements")
    .select("*, orders(order_number)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Get orders with pending debt (for payment registration)
  const { data: ordersWithDebt } = await supabase
    .from("order_payments")
    .select(`
      id,
      order_id,
      order_total,
      total_paid,
      balance_due,
      orders!inner (
        id,
        order_number,
        customer_id
      )
    `)
    .eq("orders.customer_id", customer.id)
    .gt("balance_due", 0)
    .order("created_at", { ascending: false })

  // Format pending orders for the dialog
  const pendingOrders = ordersWithDebt?.map((op: any) => ({
    id: op.orders.id,
    order_number: op.orders.order_number,
    total: op.order_total,
    balance_due: op.balance_due,
  })) || []

  // Calculate stats
  const totalOrders = orders?.length || 0
  const deliveredOrders = orders?.filter((o) => o.status === "ENTREGADO").length || 0
  const totalSpent = orders?.reduce((sum, o) => sum + parseFloat(o.total), 0) || 0
  const avgRating = ratings?.length
    ? (ratings.reduce((sum, r) => sum + r.overall_rating, 0) / ratings.length).toFixed(1)
    : null

  const customerTypeLabels = {
    minorista: "Minorista",
    mayorista: "Mayorista",
  } as const

  const ivaConditionLabels = {
    responsable_inscripto: "Responsable Inscripto",
    monotributista: "Monotributista",
    exento: "Exento",
    consumidor_final: "Consumidor Final",
  } as const

  const orderStatusLabels = {
    BORRADOR: "Borrador",
    PENDIENTE_ARMADO: "Pendiente Armado",
    EN_ARMADO: "En Armado",
    PENDIENTE_ENTREGA: "Pendiente Entrega",
    EN_RUTA: "En Ruta",
    EN_REPARTICION: "En Reparto",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
    ESPERANDO_STOCK: "Esperando Stock",
  } as const

  const movementTypeLabels = {
    DEUDA_PEDIDO: "Deuda por pedido",
    PAGO_EFECTIVO: "Pago efectivo",
    PAGO_TRANSFERENCIA: "Pago transferencia",
    PAGO_TARJETA: "Pago tarjeta",
    AJUSTE_CREDITO: "Ajuste a favor",
    AJUSTE_DEBITO: "Ajuste en contra",
    NOTA_CREDITO: "Nota de crédito",
    PAGO_ADELANTADO: "Pago adelantado",
  } as const

  // Saldo actual del cliente (positivo = debe, negativo = a favor)
  const currentBalance = customer.current_balance || 0

  const statusColors = {
    BORRADOR: "secondary",
    PENDIENTE_ARMADO: "secondary",
    EN_ARMADO: "default",
    PENDIENTE_ENTREGA: "default",
    EN_RUTA: "default",
    EN_REPARTICION: "default",
    ENTREGADO: "default",
    CANCELADO: "destructive",
    ESPERANDO_STOCK: "destructive",
  } as const

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Detalle del Cliente</h1>
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
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/customers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Clientes
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{customer.commercial_name}</CardTitle>
                      <CardDescription>{customer.code}</CardDescription>
                    </div>
                    <Badge variant={customer.is_active ? "default" : "destructive"} className="text-base px-3 py-1">
                      {customer.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipo de Cliente</p>
                      <p className="text-base">
                        {customerTypeLabels[customer.customer_type as keyof typeof customerTypeLabels]}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Condición IVA</p>
                      <p className="text-base">
                        {ivaConditionLabels[customer.iva_condition as keyof typeof ivaConditionLabels]}
                      </p>
                    </div>
                    {customer.tax_id && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">CUIT/CUIL</p>
                        <p className="text-base">{customer.tax_id}</p>
                      </div>
                    )}
                    {customer.legal_name && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Razón Social</p>
                        <p className="text-base">{customer.legal_name}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Contacto</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.contact_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Dirección</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p>
                          {customer.street} {customer.street_number}
                          {customer.floor_apt && `, ${customer.floor_apt}`}
                        </p>
                        <p className="text-muted-foreground">
                          {customer.locality}, {customer.province}
                        </p>
                        {customer.postal_code && <p className="text-muted-foreground">CP: {customer.postal_code}</p>}
                      </div>
                    </div>
                  </div>

                  {customer.observations && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Observaciones</p>
                      <p className="text-sm">{customer.observations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Pedidos Recientes
                      </CardTitle>
                      <CardDescription>Últimos 10 pedidos del cliente</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/orders?customer=${customer.id}`}>Ver Todos</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {orders && orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{order.order_number}</span>
                              <Badge variant={statusColors[order.status as keyof typeof statusColors]}>
                                {orderStatusLabels[order.status as keyof typeof orderStatusLabels]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{new Date(order.order_date).toLocaleDateString("es-AR")}</span>
                              <span className="font-medium">Total: ${parseFloat(order.total).toFixed(2)}</span>
                            </div>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/orders/${order.id}`}>Ver</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No hay pedidos registrados</p>
                  )}
                </CardContent>
              </Card>

              {/* Movimientos de Cuenta Corriente */}
              {accountMovements && accountMovements.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Wallet className="h-5 w-5" />
                          Movimientos de Cuenta Corriente
                        </CardTitle>
                        <CardDescription>Últimos 20 movimientos</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {accountMovements.map((movement: any) => {
                        const isDebit = movement.debit_amount > 0
                        return (
                          <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${isDebit ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"}`}>
                                {isDebit 
                                  ? <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  : <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                                }
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {movementTypeLabels[movement.movement_type as keyof typeof movementTypeLabels]}
                                </p>
                                <p className="text-xs text-muted-foreground">{movement.description}</p>
                                {movement.orders?.order_number && (
                                  <p className="text-xs text-muted-foreground">Pedido: {movement.orders.order_number}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${isDebit ? "text-red-600" : "text-green-600"}`}>
                                {isDebit ? "+" : "-"}${(movement.debit_amount || movement.credit_amount).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Saldo: ${movement.balance_after.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(movement.created_at).toLocaleDateString("es-AR")}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ratings */}
              {ratings && ratings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Calificaciones
                    </CardTitle>
                    <CardDescription>Valoraciones del cliente sobre nuestro servicio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {ratings.map((rating: any) => (
                        <div key={rating.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{rating.orders?.order_number}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-lg font-bold">{rating.overall_rating.toFixed(1)}</span>
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            </div>
                          </div>
                          {rating.comments && <p className="text-sm text-muted-foreground">{rating.comments}</p>}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(rating.created_at).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estadísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Package className="h-4 w-4" />
                      <span className="text-sm">Total Pedidos</span>
                    </div>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Entregados</span>
                    </div>
                    <p className="text-2xl font-bold">{deliveredOrders}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm">Gasto Total</span>
                    </div>
                    <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
                  </div>
                  {avgRating && (
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Star className="h-4 w-4" />
                        <span className="text-sm">Calificación Promedio</span>
                      </div>
                      <p className="text-2xl font-bold">{avgRating} ⭐</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Zone */}
              {customer.zones && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" />
                      Zona
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{customer.zones.name}</p>
                    {customer.zones.description && (
                      <p className="text-sm text-muted-foreground mt-1">{customer.zones.description}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Cuenta Corriente */}
              <Card className={currentBalance > 0 ? "border-red-300 dark:border-red-700" : currentBalance < 0 ? "border-green-300 dark:border-green-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" />
                    Cuenta Corriente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`p-3 rounded-lg ${
                    currentBalance > 0 
                      ? "bg-red-50 dark:bg-red-950" 
                      : currentBalance < 0 
                        ? "bg-green-50 dark:bg-green-950"
                        : "bg-muted"
                  }`}>
                    <p className="text-xs text-muted-foreground mb-1">Saldo Actual</p>
                    <p className={`text-2xl font-bold ${
                      currentBalance > 0 
                        ? "text-red-600 dark:text-red-400" 
                        : currentBalance < 0 
                          ? "text-green-600 dark:text-green-400"
                          : ""
                    }`}>
                      {currentBalance > 0 ? "DEBE " : currentBalance < 0 ? "A FAVOR " : ""}
                      ${Math.abs(currentBalance).toFixed(2)}
                    </p>
                  </div>
                  
                  {/* Crédito disponible */}
                  <div className="text-sm">
                    <p className="text-muted-foreground">Crédito disponible</p>
                    <p className="font-bold">
                      ${Math.max(0, parseFloat(customer.credit_limit || "0") - currentBalance).toFixed(2)}
                    </p>
                  </div>

                  {/* Botón de registrar pago - solo si tiene deuda */}
                  {currentBalance > 0 && (
                    <div className="pt-2 border-t">
                      <RegisterPaymentDialog
                        customerId={customer.id}
                        customerName={customer.commercial_name}
                        currentBalance={currentBalance}
                        pendingOrders={pendingOrders}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credit Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información de Crédito</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Límite de Crédito</p>
                    <p className="text-lg font-bold">
                      ${parseFloat(customer.credit_limit || "0").toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Días de Crédito</p>
                    <p className="text-lg font-bold">{customer.credit_days} días</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Descuento General</p>
                    <p className="text-lg font-bold">{customer.general_discount}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4" />
                    Información del Registro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Creado el</p>
                    <p>{new Date(customer.created_at).toLocaleDateString("es-AR")}</p>
                  </div>
                  {customer.profiles && (
                    <div>
                      <p className="text-muted-foreground">Creado por</p>
                      <p className="font-medium">{customer.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground">{customer.profiles.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Última actualización</p>
                    <p>{new Date(customer.updated_at).toLocaleDateString("es-AR")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

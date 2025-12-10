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
import Link from "next/link"
import { ArrowLeft, Users, Search, MapPin, Phone, Mail, Building2, Plus, Wallet, AlertTriangle } from "lucide-react"

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; zone?: string; debt?: string }>
}) {
  const params = await searchParams
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

  // Get zones for filter
  const { data: zones } = await supabase.from("zones").select("*").eq("is_active", true).order("name")

  // Build query
  let query = supabase
    .from("customers")
    .select(
      `
      *,
      zones (
        name
      ),
      profiles:created_by (
        full_name
      )
    `,
    )

  if (params.type && params.type !== "all") {
    query = query.eq("customer_type", params.type)
  }

  if (params.zone && params.zone !== "all") {
    query = query.eq("zone_id", params.zone)
  }

  if (params.search) {
    query = query.or(
      `commercial_name.ilike.%${params.search}%,contact_name.ilike.%${params.search}%,code.ilike.%${params.search}%,email.ilike.%${params.search}%`,
    )
  }

  // Filtro de deuda
  if (params.debt && params.debt !== "all") {
    if (params.debt === "with_debt") {
      query = query.gt("current_balance", 0)
    } else if (params.debt === "no_debt") {
      query = query.or("current_balance.lte.0,current_balance.is.null")
    }
  }

  const { data: customers } = await query.eq("is_active", true).order("commercial_name", { ascending: true }).limit(100)

  // Calcular totales de deuda
  const totalDebt = customers?.reduce((sum, c) => sum + (c.current_balance > 0 ? c.current_balance : 0), 0) || 0
  const customersWithDebt = customers?.filter(c => c.current_balance > 0).length || 0

  // Count by type for stats
  const typeCounts = customers?.reduce(
    (acc, customer) => {
      acc[customer.customer_type] = (acc[customer.customer_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const customerTypeLabels = {
    minorista: "Minorista",
    mayorista: "Mayorista",
  } as const

  const customerTypeColors = {
    minorista: "default",
    mayorista: "secondary",
  } as const

  const ivaConditionLabels = {
    responsable_inscripto: "Responsable Inscripto",
    monotributista: "Monotributista",
    exento: "Exento",
    consumidor_final: "Consumidor Final",
  } as const

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Gestión de Clientes</h1>
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
            <Button asChild>
              <Link href="/admin/customers/new">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Activos en el sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Mayoristas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typeCounts?.mayorista || 0}</div>
                <p className="text-xs text-muted-foreground">Clientes mayoristas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Minoristas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typeCounts?.minorista || 0}</div>
                <p className="text-xs text-muted-foreground">Clientes minoristas</p>
              </CardContent>
            </Card>
            <Card className={customersWithDebt > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${customersWithDebt > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  Con Deuda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${customersWithDebt > 0 ? "text-red-600" : ""}`}>
                  {customersWithDebt}
                </div>
                <p className="text-xs text-muted-foreground">Clientes con saldo</p>
              </CardContent>
            </Card>
            <Card className={totalDebt > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className={`h-4 w-4 ${totalDebt > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  Total Deuda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalDebt > 0 ? "text-red-600" : ""}`}>
                  ${totalDebt.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Cuentas corrientes</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and List */}
          <Card>
            <CardHeader>
              <CardTitle>Todos los Clientes</CardTitle>
              <CardDescription>
                Gestiona y visualiza todos los clientes del sistema
                {params.type && params.type !== "all" && ` - Tipo: ${customerTypeLabels[params.type as keyof typeof customerTypeLabels] || params.type}`}
                {params.debt === "with_debt" && " - 🔴 Solo con deuda"}
                {params.debt === "no_debt" && " - 🟢 Solo sin deuda"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <form className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="search"
                      placeholder="Buscar por nombre, código, email..."
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
                  <Select name="zone" defaultValue={params.zone || "all"}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Zona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las zonas</SelectItem>
                      {zones?.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select name="debt" defaultValue={params.debt || "all"}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Deuda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="with_debt">🔴 Con deuda</SelectItem>
                      <SelectItem value="no_debt">🟢 Sin deuda</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit">
                    <Search className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                </form>

                {/* Customers List */}
                {customers && customers.length > 0 ? (
                  <div className="space-y-3">
                    {customers.map((customer: any) => (
                      <div
                        key={customer.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-lg">{customer.commercial_name}</span>
                            <Badge variant={customerTypeColors[customer.customer_type as keyof typeof customerTypeColors]}>
                              {customerTypeLabels[customer.customer_type as keyof typeof customerTypeLabels]}
                            </Badge>
                            <Badge variant="outline">{customer.code}</Badge>
                            {customer.current_balance > 0 && (
                              <Badge variant="destructive" className="gap-1">
                                <Wallet className="h-3 w-3" />
                                Deuda: ${customer.current_balance.toFixed(2)}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span>Contacto: {customer.contact_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4 flex-shrink-0" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span>
                                {customer.street} {customer.street_number}, {customer.locality}
                              </span>
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4 flex-shrink-0" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {customer.zones && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span>Zona: {customer.zones.name}</span>
                              </div>
                            )}
                            <span>IVA: {ivaConditionLabels[customer.iva_condition as keyof typeof ivaConditionLabels]}</span>
                            {customer.credit_limit > 0 && (
                              <span>Crédito: ${parseFloat(customer.credit_limit).toFixed(2)}</span>
                            )}
                            {customer.general_discount > 0 && (
                              <span>Descuento: {customer.general_discount}%</span>
                            )}
                          </div>

                          {customer.profiles && (
                            <p className="text-xs text-muted-foreground">
                              Creado por: {customer.profiles.full_name}
                            </p>
                          )}
                        </div>

                        <Button asChild variant="outline">
                          <Link href={`/admin/customers/${customer.id}`}>Ver Detalles</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No se encontraron clientes</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {params.search || params.type || params.zone
                        ? "Intenta cambiar los filtros de búsqueda"
                        : "No hay clientes en el sistema"}
                    </p>
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


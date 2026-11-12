import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Wallet, ArrowDownRight, ArrowUpRight, Paperclip, FileDown } from "lucide-react"
import { AccountsPagination } from "@/components/admin/accounts-pagination"

const MOVEMENTS_PER_PAGE = 20

const movementTypeLabels: Record<string, string> = {
  DEUDA_PEDIDO: "Pedido",
  PAGO_EFECTIVO: "Pago (efectivo)",
  PAGO_TRANSFERENCIA: "Pago (transferencia)",
  PAGO_TARJETA: "Pago (tarjeta)",
  PAGO_CHEQUE: "Pago (cheque)",
  PAGO_CUENTA_CORRIENTE: "Pago (cta. cte.)",
  PAGO_OTRO: "Pago (otro)",
  AJUSTE_CREDITO: "Ajuste a favor",
  AJUSTE_DEBITO: "Ajuste en contra",
  NOTA_CREDITO: "Nota de crédito",
  PAGO_ADELANTADO: "Pago adelantado",
}

export default async function ClienteCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ movPage?: string }>
}) {
  const sp = await searchParams
  const movPage = Math.max(1, parseInt(sp.movPage || "1") || 1)
  const from = (movPage - 1) * MOVEMENTS_PER_PAGE
  const to = from + MOVEMENTS_PER_PAGE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/cliente/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "cliente") redirect("/cliente/login")

  const { data: customer } = profile.customer_id
    ? await supabase.from("customers").select("*").eq("id", profile.customer_id).single()
    : { data: null }

  if (!customer) redirect("/cliente/dashboard")

  const { data: movements, count } = await supabase
    .from("customer_account_movements")
    .select("*, orders(order_number)", { count: "exact" })
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .range(from, to)

  const totalMovements = count || 0
  const totalPages = Math.max(1, Math.ceil(totalMovements / MOVEMENTS_PER_PAGE))
  const balance = Number(customer.current_balance) || 0

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Mi Cuenta Corriente</h1>
          </div>
          <form action="/auth/logout" method="post">
            <Button variant="outline" size="sm">Cerrar Sesión</Button>
          </form>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-4 md:p-6">
        <div className="container mx-auto max-w-3xl space-y-6">
          <Button variant="outline" asChild>
            <Link href="/cliente/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>

          <Card className={balance > 0 ? "border-red-300 dark:border-red-700" : balance < 0 ? "border-green-300 dark:border-green-700" : ""}>
            <CardHeader>
              <CardTitle className="text-base">Saldo Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`p-4 rounded-lg ${
                  balance > 0 ? "bg-red-50 dark:bg-red-950" : balance < 0 ? "bg-green-50 dark:bg-green-950" : "bg-muted"
                }`}
              >
                <p
                  className={`text-3xl font-bold ${
                    balance > 0 ? "text-red-600 dark:text-red-400" : balance < 0 ? "text-green-600 dark:text-green-400" : ""
                  }`}
                >
                  {balance > 0 ? "DEBE " : balance < 0 ? "A FAVOR " : ""}$
                  {Math.abs(balance).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card id="movimientos">
            <CardHeader>
              <CardTitle>Movimientos</CardTitle>
              <CardDescription>
                {totalMovements} {totalMovements === 1 ? "movimiento registrado" : "movimientos registrados"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movements && movements.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {movements.map((movement: any) => {
                      const isDebit = movement.debit_amount > 0
                      return (
                        <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${isDebit ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"}`}
                            >
                              {isDebit ? (
                                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {movementTypeLabels[movement.movement_type] || movement.movement_type}
                                </p>
                                {movement.proof_url && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                              </div>
                              {movement.orders?.order_number && (
                                <p className="text-xs text-muted-foreground">Pedido: {movement.orders.order_number}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {movement.proof_url && (
                              <a
                                href={movement.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-md"
                              >
                                <FileDown className="h-3 w-3" />
                                <span className="hidden sm:inline">Comprobante</span>
                              </a>
                            )}
                            <div className="text-right">
                              <p className={`font-bold ${isDebit ? "text-red-600" : "text-green-600"}`}>
                                {isDebit ? "+" : "-"}$
                                {(movement.debit_amount || movement.credit_amount).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(movement.created_at).toLocaleDateString("es-AR")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <AccountsPagination
                    currentPage={movPage}
                    totalPages={totalPages}
                    totalCount={totalMovements}
                    perPage={MOVEMENTS_PER_PAGE}
                    paramName="movPage"
                    itemLabel="movimientos"
                    scrollToId="movimientos"
                  />
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay movimientos registrados</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

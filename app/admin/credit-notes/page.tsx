import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Receipt, RefreshCw, Wallet, Banknote } from "lucide-react"
import { CreditNotesTable } from "@/components/admin/credit-notes-table"

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const fmt = (n: number) => `$${(Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`

export default async function AdminCreditNotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const { data: creditNotes } = await supabase
    .from("credit_notes")
    .select(`
      *,
      customer:customers ( commercial_name, street, street_number, locality, province, phone ),
      order:orders ( order_number ),
      items:credit_note_items ( * )
    `)
    .order("created_at", { ascending: false })

  const notes = creditNotes || []

  // --- Estadísticas ---
  const total = notes.length
  const totalAmount = notes.reduce((sum, n) => sum + toNum(n.amount), 0)
  const accountAmount = notes
    .filter((n) => n.affects_account)
    .reduce((sum, n) => sum + toNum(n.amount), 0)

  const byResolution = {
    reemplazo: notes.filter((n) => n.resolution_type === "reemplazo").length,
    saldo_favor: notes.filter((n) => n.resolution_type === "saldo_favor").length,
    devolucion_dinero: notes.filter((n) => n.resolution_type === "devolucion_dinero").length,
  }

  // Mes actual
  const now = new Date()
  const monthNotes = notes.filter((n) => {
    const d = new Date(n.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthAmount = monthNotes.reduce((sum, n) => sum + toNum(n.amount), 0)

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Notas de Crédito
          </h1>
          <p className="text-muted-foreground text-sm">Devoluciones y créditos emitidos sobre pedidos entregados</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Total emitidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">{monthNotes.length} este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <Banknote className="h-4 w-4" /> Monto total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totalAmount)}</p>
            <p className="text-xs text-muted-foreground">{fmt(monthAmount)} este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Impactó cuenta cte.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(accountAmount)}</p>
            <p className="text-xs text-muted-foreground">Crédito a clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Por resolución
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-0.5">
            <p>Reemplazo: <strong>{byResolution.reemplazo}</strong></p>
            <p>Saldo a favor: <strong>{byResolution.saldo_favor}</strong></p>
            <p>Devolución $: <strong>{byResolution.devolucion_dinero}</strong></p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado de notas de crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditNotesTable creditNotes={notes as any} />
        </CardContent>
      </Card>
    </div>
  )
}

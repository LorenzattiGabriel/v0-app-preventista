import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, FilePlus2, Banknote, CalendarClock } from "lucide-react"
import { DebitNotesTable } from "@/components/admin/debit-notes-table"

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const fmt = (n: number) => `$${(Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`

export default async function AdminDebitNotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const { data: debitNotesRaw } = await supabase
    .from("debit_notes")
    .select(`
      *,
      customer:customers ( commercial_name, street, street_number, locality, province, phone ),
      order:orders ( order_number )
    `)
    .order("created_at", { ascending: false })

  const notes = debitNotesRaw || []

  const total = notes.length
  const totalAmount = notes.reduce((sum, n) => sum + toNum(n.amount), 0)

  const now = new Date()
  const monthNotes = notes.filter((n) => {
    const d = new Date(n.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthAmount = monthNotes.reduce((sum, n) => sum + toNum(n.amount), 0)

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FilePlus2 className="h-6 w-6" />
            Notas de Débito
          </h1>
          <p className="text-muted-foreground text-sm">Ajustes que aumentan la deuda, con motivo documentado (ej: cheques rechazados)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <FilePlus2 className="h-4 w-4" /> Total emitidas
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
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{fmt(totalAmount)}</p>
            <p className="text-xs text-muted-foreground">{fmt(monthAmount)} este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthNotes.length}</p>
            <p className="text-xs text-muted-foreground">notas emitidas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado de notas de débito</CardTitle>
        </CardHeader>
        <CardContent>
          <DebitNotesTable debitNotes={notes as any} />
        </CardContent>
      </Card>
    </div>
  )
}

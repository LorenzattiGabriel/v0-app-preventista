import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createSalesTargetsService, monthToPeriod } from "@/lib/services/salesTargetsService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Target } from "lucide-react"
import { SalesTargetsBoard } from "@/components/admin/sales-targets-board"

function shiftMonth(period: string, delta: number): string {
  const d = new Date(`${period}T00:00:00`)
  d.setMonth(d.getMonth() + delta)
  return monthToPeriod(d)
}

function monthLabel(period: string): string {
  const d = new Date(`${period}T00:00:00`)
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
}

export default async function ObjetivosVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const periodMonth = params.month ? monthToPeriod(params.month) : monthToPeriod(new Date())

  const service = createSalesTargetsService(supabase)
  const targets = await service.listTargetsWithProgress(periodMonth)

  const { data: preventistas } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "preventista")
    .eq("is_active", true)
    .order("full_name")

  const { data: ventaDirectaSellers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "venta_directa")
    .eq("is_active", true)
    .order("full_name")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Objetivos de Venta</h1>
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
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="capitalize">{monthLabel(periodMonth)}</CardTitle>
                  <CardDescription>
                    Objetivos generales e individuales por canal, con el progreso real del mes
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/admin/objetivos-venta?month=${shiftMonth(periodMonth, -1)}`}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/admin/objetivos-venta?month=${shiftMonth(periodMonth, 1)}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SalesTargetsBoard
                periodMonth={periodMonth}
                targets={targets}
                preventistas={preventistas || []}
                ventaDirectaSellers={ventaDirectaSellers || []}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

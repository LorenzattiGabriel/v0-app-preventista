import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Landmark } from "lucide-react"
import { BcraChequesCheck } from "@/components/admin/bcra-cheques-check"

export default async function BcraChequesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Cheques Rechazados (BCRA)</h1>
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
        <div className="container mx-auto max-w-2xl space-y-6">
          <Button variant="outline" asChild>
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Consultar CUIT/CUIL</CardTitle>
              <CardDescription>
                Consulta en vivo al Banco Central: cheques rechazados registrados a nombre de un CUIT, CUIL o CDI.
                Útil antes de aceptar un pago con cheque.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BcraChequesCheck />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

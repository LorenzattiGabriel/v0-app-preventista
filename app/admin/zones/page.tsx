import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, CheckCircle2, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ZonesManager } from "@/components/admin/zones-manager"

export default async function AdminZonesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "administrativo") redirect("/auth/login")

  const { data: zones } = await supabase.from("zones").select("*").order("name")

  // Cuántos clientes tiene cada zona: sin esto el admin no sabe cuáles puede
  // borrar ni cuáles están realmente en uso.
  const { data: customers } = await supabase.from("customers").select("zone_id")

  const customerCounts = (customers || []).reduce((acc: Record<string, number>, c: any) => {
    if (c.zone_id) acc[c.zone_id] = (acc[c.zone_id] || 0) + 1
    return acc
  }, {})

  const withoutZone = (customers || []).filter((c: any) => !c.zone_id).length
  const activeCount = (zones || []).filter((z: any) => z.is_active).length

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al panel
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="h-7 w-7" />
              Zonas
            </h1>
            <p className="text-muted-foreground mt-1">
              Etiquetas para agrupar clientes. Aparecen al cargar o editar un cliente y sirven para
              filtrar el listado y el reporte de ingresos por zona.
            </p>
          </div>

          {/* Aclaración necesaria: el nombre "zona" hace pensar que define el
              reparto, y no es así. Las rutas se arman por localidad. */}
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="py-4 text-sm text-blue-900 dark:text-blue-200">
              Las zonas <strong>no definen las rutas de reparto</strong>. Las rutas se arman eligiendo
              la <strong>localidad</strong> de los pedidos, que sale de la dirección de cada cliente.
              Crear una zona no habilita ni cambia ningún reparto.
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Zonas</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{zones?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Activas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                <p className="text-xs text-muted-foreground">Son las que se pueden elegir</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Clientes sin zona</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{withoutZone}</div>
              </CardContent>
            </Card>
          </div>

          <ZonesManager zones={zones || []} customerCounts={customerCounts} />
        </div>
      </main>
    </div>
  )
}

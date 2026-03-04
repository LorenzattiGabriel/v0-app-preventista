import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Building2 } from "lucide-react"
import Link from "next/link"
import { DepotConfigForm } from "@/components/admin/depot-config-form"

export default async function DepotConfigPage() {
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

  // Get current depot configuration
  const { data: depot } = await supabase
    .from("depot_configuration")
    .select("*")
    .eq("is_active", true)
    .single()

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" asChild>
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuración de Distribuidora</h1>
            <p className="text-muted-foreground">
              Punto de inicio y fin para todas las rutas de entrega
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  ¿Por qué configurar la ubicación de la distribuidora?
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Todas las rutas iniciarán y finalizarán en este punto</li>
                  <li>• Los repartidores deben estar cerca de esta ubicación al iniciar/finalizar rutas</li>
                  <li>• Permite calcular distancias y tiempos de entrega con precisión</li>
                  <li>• Solo escribe la dirección y el sistema encontrará las coordenadas automáticamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Configuration */}
        {depot && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Configuración Actual
              </CardTitle>
              <CardDescription>Ubicación activa de la distribuidora</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nombre:</span>
                  <p className="text-muted-foreground">{depot.name}</p>
                </div>
                <div>
                  <span className="font-medium">Dirección:</span>
                  <p className="text-muted-foreground">
                    {depot.street} {depot.street_number}
                    {depot.floor_apt && `, ${depot.floor_apt}`}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Localidad:</span>
                  <p className="text-muted-foreground">
                    {depot.locality}, {depot.province}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Coordenadas:</span>
                  <p className="text-muted-foreground font-mono text-xs">
                    {depot.latitude}, {depot.longitude}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Radio de tolerancia:</span>
                  <p className="text-muted-foreground">{depot.radius_meters} metros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>{depot ? 'Actualizar' : 'Configurar'} Distribuidora</CardTitle>
            <CardDescription>
              Ingresa la dirección de tu distribuidora. Las coordenadas se calcularán automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DepotConfigForm depot={depot} userId={user.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


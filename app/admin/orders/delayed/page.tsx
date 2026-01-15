import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createDelayedOrdersService } from "@/lib/services/delayedOrdersService"
import { DelayedOrdersList } from "@/components/admin/delayed-orders-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Pedidos Retrasados | Admin",
  description: "Gestión de pedidos con fecha de entrega vencida",
}

export default async function DelayedOrdersPage() {
  const supabase = await createClient()

  // Verificar autenticación y rol
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/auth/login")
  }

  // Obtener pedidos retrasados
  const service = createDelayedOrdersService(supabase)
  const delayedOrders = await service.getDelayedOrders()

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Pedidos
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pedidos Retrasados</h1>
              <p className="text-muted-foreground">
                Pedidos con fecha de entrega vencida sin ruta asignada
              </p>
            </div>
          </div>
        </div>

        <DelayedOrdersList orders={delayedOrders} />
      </main>
    </div>
  )
}




import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  LinkTableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle } from "lucide-react"
import { format } from "date-fns"
import { GoBackButton } from "@/components/ui/go-back-button"
import { DraftActions } from "@/components/preventista/draft-actions"

type Order = {
  id: string
  order_number: string
  delivery_date: string
  priority: "baja" | "normal" | "media" | "alta" | "urgente"
  status: string
  total: number
  created_at: string
  customers: {
    code: string
    commercial_name: string
    locality: string
    customer_type: string
  }
}

const getPriorityVariant = (priority: Order['priority']): "default" | "secondary" | "destructive" | "outline" => {
  switch (priority) {
    case 'urgente':
      return 'destructive';
    case 'alta':
      return 'default';
    case 'media':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }


  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      delivery_date,
      priority,
      status,
      total,
      created_at,
      customers (
        code,
        commercial_name,
        locality,
        customer_type
      )
    `)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .eq("status", "BORRADOR")

  const { data: orders, error } = await query

  if (error) {
    console.error("Error fetching orders:", error)
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 md:gap-8 md:px-8">
      
      <div className="flex items-center justify-between">
        <GoBackButton/>
        
        <Button size="sm" asChild>
          <Link href="/preventista/orders/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Crear Pedido
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos en Borrador</CardTitle>
          <CardDescription>Pedidos guardados que aún no has confirmado.</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Mobile Card View */}
          <div className="grid gap-4 md:hidden">
            {orders && orders.length > 0 ? (
              orders.map((order: any) => (
                <Card key={order.id} className="p-0">
                  <Link href={`/preventista/orders/drafts/${order.id}`} className="block p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="font-semibold">{order.customers?.commercial_name || 'N/A'}</div>
                        <div className="font-bold text-lg">${order.total.toFixed(2)}</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Pedido #{order.order_number}
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                        <div>Creado: {format(new Date(order.created_at), "dd/MM/yyyy")}</div>
                        <div>Entrega: {format(new Date(order.delivery_date), "dd/MM/yyyy")}</div>
                      </div>
                  </Link>
                  <div className="px-4 pb-4 flex justify-between items-center">
                    <Badge variant={getPriorityVariant(order.priority)} className="capitalize">
                      {order.priority}
                    </Badge>
                    <div className="mt-0">
                      <DraftActions orderId={order.id} />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No se encontraron pedidos.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Comercial</TableHead>
                  <TableHead className="hidden sm:table-cell">F. Creación</TableHead>
                  <TableHead className="hidden sm:table-cell">F. Entrega</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Total</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead className="hidden lg:table-cell">Código Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell">Localidad</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders && orders.length > 0 ? (
                  orders.map((order: any) => {
                      const draftLink = `/preventista/orders/drafts/${order.id}`;
                      return (
                        <TableRow key={order.id} className="hover:bg-muted">
                          <LinkTableCell className="font-medium" href={draftLink}>
                            {order.customers?.commercial_name || 'N/A'}
                          </LinkTableCell>
                          <LinkTableCell className="hidden sm:table-cell" href={draftLink}>
                            {format(new Date(order.created_at), "dd/MM/yyyy")}
                          </LinkTableCell>
                          <LinkTableCell className="hidden sm:table-cell" href={draftLink}>
                            {format(new Date(order.delivery_date), "dd/MM/yyyy")}
                          </LinkTableCell>
                          <LinkTableCell className="hidden md:table-cell text-right" href={draftLink}>
                            ${order.total.toFixed(2)}
                          </LinkTableCell>
                          <LinkTableCell href={draftLink}>
                            <Badge variant={getPriorityVariant(order.priority)} className="capitalize">
                              {order.priority}
                            </Badge>
                          </LinkTableCell>
                          <LinkTableCell className="hidden lg:table-cell" href={draftLink}>
                            <span className="text-muted-foreground">{order.customers?.code || 'N/A'}</span>
                          </LinkTableCell>
                          <LinkTableCell className="hidden lg:table-cell" href={draftLink}>
                            {order.customers?.locality || 'N/A'}
                          </LinkTableCell>
                          <TableCell>
                            <DraftActions orderId={order.id} />
                          </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No se encontraron pedidos.
                  </TableCell>
                </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

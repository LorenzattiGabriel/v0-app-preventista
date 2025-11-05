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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, PlusCircle, FileText, Edit, Trash2 } from "lucide-react"
import { format } from "date-fns"

type Order = {
  id: string
  order_number: string
  delivery_date: string
  priority: "baja" | "normal" | "media" | "alta" | "urgente"
  status: string
  total: number
  created_at: string
  customer_id: string
}



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
    .select(
      `id, 
      order_number, 
      delivery_date, 
      priority, status, 
      total, 
      created_at,
      customer_id
    `
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .eq("status", "BORRADOR")



  const { data: orders, error } = await query
    console.log("orders query:", orders)

  if (error) {
    console.error("Error fetching orders:", error)
    // Handle error appropriately
  }

  if (orders === null || orders === undefined ) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h2 className="font-semibold text-lg md:text-2xl">Pedidos en Borrador</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" asChild>
              <Link href="/preventista/orders/new">
                <PlusCircle className="h-4 w-4 mr-2" />
                Crear Pedido
              </Link>
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Pedidos en Borrador</CardTitle>
            <CardDescription>Pedidos guardados que aún no has confirmado.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron pedidos en borrador.
            </div>
          </CardContent>
        </Card>
      </main>
      
    )
  }

  // customer info
  let queryCustomers = supabase
    .from("customers")
    .select(
      `id, code, commercial_name, locality, customer_type`
    )
    .in("id", orders.map((order) => order.customer_id))

  const { data: customers, error: errorCustomers } = await queryCustomers
  

  if (errorCustomers) {
    console.error("Error fetching customers:", errorCustomers)
    // Handle error appropriately
  }

  const pageTitle = "Pedidos en Borrador"
  const pageDescription = "Pedidos guardados que aún no has confirmado."

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
        <h2 className="font-semibold text-lg md:text-2xl">{pageTitle}</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" asChild>
            <Link href="/preventista/orders/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              Crear Pedido
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">Código Cliente</TableHead>
                <TableHead>Nombre Comercial</TableHead>
                <TableHead className="hidden md:table-cell">Localidad</TableHead>
                <TableHead className="hidden lg:table-cell">Tipo Cliente</TableHead>
                <TableHead>N° Pedido</TableHead>
                <TableHead className="hidden md:table-cell">F. Creación</TableHead>
                <TableHead className="hidden md:table-cell">F. Entrega</TableHead>
                <TableHead className="hidden md:table-cell">Total</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders && orders.length > 0 && orders ? (
                orders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <span className="hidden sm:inline">{customers?.find((customer) => customer.id === order.customer_id)?.code || "N/A"}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {customers?.find((customer) => customer.id === order.customer_id)?.commercial_name|| "N/A"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {customers?.find((customer) => customer.id === order.customer_id)?.locality || "N/A"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell capitalize">
                      {customers?.find((customer) => customer.id === order.customer_id)?.customer_type || "N/A"}
                    </TableCell>
                    <TableCell>{order.order_number}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(order.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(order.delivery_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      ${order.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.priority === "urgente" || order.priority === "alta" ? "default" : "outline"}
                      >
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/preventista/orders/drafts/${order.id}`} className="flex items-center">
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                              <div className="flex items-center text-destructive">
                                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                Eliminar
                              </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
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
        </CardContent>
      </Card>
    </main>
  )
}

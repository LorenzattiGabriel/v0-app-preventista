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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, PlusCircle, FileText, Edit, Trash2, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { GoBackButton } from "@/components/ui/go-back-button"

type Order = {
  id: string
  order_number: string
  delivery_date: string
  priority: "baja" | "normal" | "media" | "alta" | "urgente"
  status: string
  total: number
  created_at: string
  customer_id: string,
  customer: {
    code: string
    commercial_name: string
    locality: string
    customer_type: string
  }
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



  // customer info
  let queryCustomers = supabase
    .from("customers")
    .select(
      `id, code, commercial_name, locality, customer_type`
    )
    .in("id", (orders !== null && orders !== undefined) ? orders.map((order) => order.customer_id) : [])

  const { data: customers, error: errorCustomers } = await queryCustomers
  

  if (errorCustomers) {
    console.error("Error fetching customers:", errorCustomers)
    // Handle error appropriately
  }

  // Map customers to orders
  const ordersWithCustomerInfo = orders?.map((order) => {
    const customer = customers?.find((c) => c.id === order.customer_id)
    
    return {
      ...order, 
      customer: {
        code: customer?.code || "N/A",
        commercial_name: customer?.commercial_name || "N/A",
        locality: customer?.locality || "N/A",
        customer_type: customer?.customer_type || "N/A",
      },
    }
  })



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
              {ordersWithCustomerInfo && ordersWithCustomerInfo.length > 0 ? (
                ordersWithCustomerInfo.map((order: Order) => {
                    const draftLink = `/preventista/orders/drafts/${order.id}`;
                    return (
                      <TableRow key={order.id} className="hover:bg-muted">
                        <LinkTableCell className="font-medium" href={draftLink}>
                          <span className="hidden sm:inline">{order.customer.code}</span>
                        </LinkTableCell>
                        <LinkTableCell className="font-medium" href={draftLink}>
                          {order.customer.commercial_name}
                        </LinkTableCell>
                        <LinkTableCell className="hidden md:table-cell" href={draftLink}>
                          {order.customer.locality}
                        </LinkTableCell>
                        <LinkTableCell className="hidden lg:table-cell capitalize" href={draftLink}>
                          {order.customer.customer_type}
                        </LinkTableCell>
                        <LinkTableCell href={draftLink}>
                          {order.order_number}
                        </LinkTableCell>
                        <LinkTableCell className="hidden md:table-cell" href={draftLink}>
                          {format(new Date(order.created_at), "dd/MM/yyyy")}
                        </LinkTableCell>
                        <LinkTableCell className="hidden md:table-cell" href={draftLink}>
                          {format(new Date(order.delivery_date), "dd/MM/yyyy")}
                        </LinkTableCell>
                        <LinkTableCell className="hidden md:table-cell" href={draftLink}>
                          ${order.total.toFixed(2)}
                        </LinkTableCell>
                        <LinkTableCell href={draftLink}>
                          <Badge
                            variant={order.priority === "urgente" || order.priority === "alta" ? "default" : "outline"}
                          >
                            {order.priority}
                          </Badge>
                        </LinkTableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Abrir menú</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
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
                  )//return
                  }//map callback
                )//map
              ) 
              : 
              (
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

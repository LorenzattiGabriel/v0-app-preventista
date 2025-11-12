import { Customer } from "@/types/customer"
import { Button } from "../ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

type CustomersTableProps = {
  customers: Customer[]
  onSelectCustomer: (customer: Customer) => void
}

export default function CustomersTable({ customers, onSelectCustomer }: CustomersTableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">
              Código
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre Comercial</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
              Contacto
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
              Tipo
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Localidad</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
              Zona
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden xl:table-cell">
              Activo
            </th>
            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {customers?.map((customer) => (
            <tr key={customer.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <td className="p-4 align-middle text-muted-foreground hidden sm:table-cell">{customer.code}</td>
              <td className="p-4 align-middle font-medium">{customer.commercial_name}</td>
              <td className="p-4 align-middle text-muted-foreground hidden md:table-cell">{customer.contact_name}</td>
              <td className="p-4 align-middle text-muted-foreground hidden lg:table-cell capitalize">
                {customer.customer_type}
              </td>
              <td className="p-4 align-middle text-muted-foreground">{customer.locality}</td>
              <td className="p-4 align-middle text-muted-foreground hidden md:table-cell">
                {customer.zone_name ? (
                  <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10 bg-gray-800 text-gray-300">
                    {customer.zone_name}
                  </span>
                ) : (
                  "N/A"
                )}
              </td>
              <td className="p-4 align-middle hidden xl:table-cell">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${customer.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400"}`}
                >
                  {customer.is_active ? "Sí" : "No"}
                </span>
              </td>
              <td className="p-4 align-middle text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelectCustomer(customer)}>Ver Detalles</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
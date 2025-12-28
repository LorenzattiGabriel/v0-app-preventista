"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { format } from "date-fns"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  LinkTableCell,
} from "@/components/ui/table"
import { DraftActions } from "@/components/preventista/draft-actions"
import { DraftsFilters } from "./drafts-filters"
import { X } from "lucide-react"

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
  } | null
}

type SortableField = 'customers.commercial_name' | 'created_at' | 'delivery_date' | 'total' | 'priority';

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

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
    {label}
    <button onClick={onRemove} className="rounded-full hover:bg-background/50 p-0.5">
      <X className="h-3 w-3 cursor-pointer hover:text-destructive hover:rotate-95 transition-transform transition-duration-550" />
      <span className="sr-only">Remove filter</span>
    </button>
  </Badge>
);

export function DraftsList({ orders, searchParams, localities }: { orders: any, searchParams: { [key: string]: string | string[] | undefined }, localities: string[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const createQueryString = (paramsToRemove: string | string[]) => {
    const params = new URLSearchParams(searchParams as any);
    if (Array.isArray(paramsToRemove)) {
      paramsToRemove.forEach(p => params.delete(p));
    } else {
      params.delete(paramsToRemove);
    }
    return params.toString();
  }

  const activeFilters = Object.entries(searchParams).filter(([key, value]) => value && !['sortBy', 'sortOrder'].includes(key));

  const getFilterLabel = (key: string, value: string | string[] | undefined): string | null => {
    if (!value) return null;
    switch (key) {
      case 'q': return `Búsqueda: "${value}"`;
      case 'priorities': return `Prioridades: ${value}`;
      case 'localities': return `Localidades: ${value}`;
      case 'deliveryDateFrom': return `Entrega desde: ${value}`;
      case 'deliveryDateTo': return `Entrega hasta: ${value}`;
      case 'createdAtFrom': return `Creado desde: ${value}`;
      case 'createdAtTo': return `Creado hasta: ${value}`;
      case 'totalMin': return `Total min: $${value}`;
      case 'totalMax': return `Total max: $${value}`;
      default: return null;
    }
  };


  const SortableHeader = ({ field, label, className }: { field: SortableField, label: string, className?: string }) => {
    const currentSortBy = searchParams.sortBy as string;
    const currentSortOrder = searchParams.sortOrder as string;

    const isSortedBy = currentSortBy === field;
    const newSortOrder = isSortedBy && currentSortOrder === 'asc' ? 'desc' : 'asc';

    const handleClick = () => {
      const params = new URLSearchParams(searchParams as any);
      params.set('sortBy', field);
      params.set('sortOrder', newSortOrder);
      router.replace(`${pathname}?${params.toString()}`);
    };

    return (
      <TableHead className={className}>
        <Button variant="ghost" onClick={handleClick} className="px-2 py-1 h-auto">
          {label}
          {isSortedBy && (currentSortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
        </Button>
      </TableHead>
    );
  };

  const MobileSortControl = () => {
    const currentSortBy = (searchParams.sortBy as string) || 'created_at';
    const currentSortOrder = (searchParams.sortOrder as string) || 'desc';
    const value = `${currentSortBy}-${currentSortOrder}`;

    const handleSortChange = (newValue: string) => {
      const [field, order] = newValue.split('-');
      const params = new URLSearchParams(searchParams as any);
      params.set('sortBy', field);
      params.set('sortOrder', order);
      router.replace(`${pathname}?${params.toString()}`);
    };
    return (
      <Select onValueChange={handleSortChange} defaultValue={value}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Ordenar por..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at-desc">Creación (Más recientes)</SelectItem>
          <SelectItem value="created_at-asc">Creación (Más antiguos)</SelectItem>
          <SelectItem value="delivery_date-asc">Entrega (Próximos)</SelectItem>
          <SelectItem value="delivery_date-desc">Entrega (Lejanos)</SelectItem>
          <SelectItem value="total-desc">Total (Mayor a menor)</SelectItem>
          <SelectItem value="total-asc">Total (Menor a mayor)</SelectItem>
          <SelectItem value="priority-desc">Prioridad (Más alta)</SelectItem>
          <SelectItem value="priority-asc">Prioridad (Más baja)</SelectItem>
          <SelectItem value="customers.commercial_name-asc">Nombre (A-Z)</SelectItem>
          <SelectItem value="customers.commercial_name-desc">Nombre (Z-A)</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const FilterSection = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 px-4 pt-4 md:px-0 md:pt-0">
        <DraftsFilters localities={localities} />
      </div>
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg bg-muted p-4">
          <span className="text-sm font-medium px-2 py-2">Filtros Activos:</span>
          {activeFilters.map(([key, value]) => {
            const label = getFilterLabel(key, value);
            if (!label) return null;
            return (
              <FilterChip key={key} label={label} onRemove={() => router.replace(`${pathname}?${createQueryString(key)}`)} />
            )
          })}
          <Button variant="ghost" size="sm" className="h-auto p-1 text-destructive hover:text-destructive" onClick={() => router.replace(pathname)}>
            Limpiar Todo
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Filter Section */}
      <FilterSection />
      <Card>
        <CardHeader className="flex-row items-center">
          <div>
            <CardTitle>Pedidos en Borrador</CardTitle>
            <CardDescription>Pedidos guardados que aún no has confirmado.</CardDescription>
          </div>
          <div className="md:hidden"><MobileSortControl /></div>
        </CardHeader>

      <CardContent>
        {/* Mobile Card View */}
        <div className="grid gap-4 md:hidden ">
          {orders && orders.length > 0 ? (
            orders.map((order: Order) => (
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

                  <div className="pt-6 flex justify-between items-center">
                    <Badge variant={getPriorityVariant(order.priority)} className="capitalize">
                      {order.priority}
                    </Badge>
                    <div className="mt-0">
                      <DraftActions orderId={order.id} />
                    </div>
                  </div>
                </Link>
              </Card>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-12">
              No se encontraron pedidos con los filtros aplicados.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="customers.commercial_name" label="Nombre Comercial" />
                <SortableHeader field="created_at" label="F. Creación" className="hidden sm:table-cell" />
                <SortableHeader field="delivery_date" label="F. Entrega" className="hidden sm:table-cell" />
                <SortableHeader field="total" label="Total" className="hidden md:table-cell text-right" />
                <SortableHeader field="priority" label="Prioridad" />
                <TableHead className="hidden lg:table-cell">Código Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">Localidad</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders && orders.length > 0 ? (
                orders.map((order: Order) => {
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
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No se encontraron pedidos con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      </Card>
    </>
  )
}

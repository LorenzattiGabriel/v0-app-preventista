import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { GoBackButton } from "@/components/ui/go-back-button"
import { DraftsList } from "@/components/preventista/drafts-list" // This will be modified later

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

type SortableField = 'customers.commercial_name' | 'created_at' | 'delivery_date' | 'total' | 'priority';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }
  const params = await searchParams;
  const sortBy = (await params.sortBy as SortableField) || 'created_at';
  const sortOrder = (await params.sortOrder as string) || 'desc';
  const q = await params.q as string;
  const priorities = await params.priorities as string;
  const localities = await params.localities as string;
  const deliveryDateFrom = await params.deliveryDateFrom as string;
  const deliveryDateTo = await params.deliveryDateTo as string;
  const createdAtFrom = await params.createdAtFrom as string;
  const createdAtTo = await params.createdAtTo as string;
  const totalMin = await params.totalMin as string;
  const totalMax = await params.totalMax as string;
  
  // Validate sortOrder to prevent injection
  const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
  
  // Fetch distinct localities for the filter dropdown
  const { data: distinctLocalitiesData, error: localitiesError } = await supabase.rpc('get_distinct_localities_for_user', { user_id_param: null });
  const distinctLocalities = distinctLocalitiesData || [];
  
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
      customers(
        code,
        commercial_name,
        locality,
        customer_type
      )
    `)
    .eq("created_by", user.id);

  // Apply filtering
  if (q) {
    query = query.or(`commercial_name.ilike.%${q}%,code.ilike.%${q}%)`, {referencedTable: "customers"});
    query = query.not('customers', 'is', null);
  }

  if (priorities) {
    query = query.in('priority', priorities.split(','));
  }

  if (localities) {
    query = query.in('customers.locality', localities.split(','));
    query = query.not('customers', 'is', null);
  }

  if (deliveryDateFrom) {
    query = query.gte('delivery_date', deliveryDateFrom);
  }

  if (deliveryDateTo) {
    query = query.lte('delivery_date', deliveryDateTo);
  }

  if (createdAtFrom) {
    query = query.gte('created_at', `${createdAtFrom}T00:00:00`);
  }

  if (createdAtTo) {
    query = query.lte('created_at', `${createdAtTo}T23:59:59`);
  }

  if (totalMin) {
    query = query.gte('total', Number(totalMin));
  }

  if (totalMax) {
    query = query.lte('total', Number(totalMax));
  }
  // Apply sorting
  if (sortBy.includes('.')) {
      // Apply sorting
  if (sortBy.includes('.')) {
    const [foreignTable, foreignColumn] = sortBy.split('.');
    query = query.order(`${foreignTable}(${foreignColumn})`, { ascending: validSortOrder === 'asc' });
  } else {
    query = query.order(sortBy, { ascending: validSortOrder === 'asc' });
  }

  } else {
    query = query.order(sortBy, { ascending: validSortOrder === 'asc' });
  }

  query = query.eq("status", "BORRADOR");
  const { data: orders, error } = await query
  console.log(orders)
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
      <DraftsList orders={orders || []} searchParams={params} localities={distinctLocalities} />
    </main>
  )
}

import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { GoBackButton } from "@/components/ui/go-back-button"
import { DraftsList } from "@/components/preventista/drafts-list"

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
  
  // Validate sortOrder to prevent injection
  const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
  
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
      <DraftsList orders={orders || []} searchParams={params} />
    </main>
  )
}

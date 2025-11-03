import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, PlusCircle, Search } from "lucide-react"
import { CustomersClient } from "@/components/preventista/customers-client"
import { Customer } from "@/types/customer"

export default async function PreventistaCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; zone?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "preventista") {
    redirect("/auth/login")
  }

  // Fetch zones for the filter dropdown, ensuring unique names
  const { data: zones } = await supabase.from("zones").select("id, name").order("name");


  // Build the query with filters
  let query = supabase
    .from("customers")
    .select("*")
    // .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  // Filter by: commercial_name, code, contact_name
  if (params.search) {
    query = query.or(
      `commercial_name.ilike.%${params.search}%,code.ilike.%${params.search}%,contact_name.ilike.%${params.search}%`,
    )
  }

  if (params.zone && params.zone !== "all") {
    query = query.eq("zone_id", params.zone)
  }

  const { data: customers, error } = await query.order("commercial_name", { ascending: true })

  if (error) {
    console.error("Error fetching customers:", error)
    // Handle error appropriately, maybe show a message to the user
  }

  return (
    <div className="flex min-h-screen w-full flex-col gap-5">

      <div className="flex items-center justify-between px-4 sm:px-6 ">
        <Button variant="outline" asChild>
          <Link href="/preventista/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
          </Link>
        </Button>

        <Button asChild size="sm" className="h-8 gap-1">
            <Link href="/preventista/customers/new">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Nuevo Cliente</span>
            </Link>
        </Button>
      </div>


      <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Clientes</span>
            </CardTitle>
            <CardDescription>Gestiona tus clientes y visualiza su información.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <form className="flex flex-col gap-4 sm:flex-row mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Buscar por nombre, código..."
                  className="pl-10"
                  defaultValue={params.search}
                />
              </div>
              <Select name="zone" defaultValue={params.zone || "all"}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las zonas</SelectItem>
                  {zones?.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
            </form>

            {/* Customer List */}
            <CardContent>
              {customers && customers.length > 0 ? (
                <CustomersClient customers={customers as Customer[]} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aún no tienes clientes registrados.</p>
                  <Button asChild className="mt-4">
                    <Link href="/preventista/customers/new">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Registrar Nuevo Cliente
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

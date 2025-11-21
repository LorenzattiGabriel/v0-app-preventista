import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { UsersFilters } from '@/components/admin/users-filters'
import { UsersList } from '@/components/admin/users-list'
import { UsersPagination } from '@/components/admin/users-pagination'
import { createUsersService } from '@/lib/services/usersService'

interface SearchParams {
  role?: string
  search?: string
  status?: string
  page?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

/**
 * Admin Users Page
 * Displays and manages all system users with filtering and pagination
 */
export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Authorization check
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'administrativo') {
    redirect('/auth/login')
  }

  // Fetch users using service
  const usersService = createUsersService(supabase)
  
  const isActive = 
    params.status === 'active' ? true : 
    params.status === 'inactive' ? false : 
    undefined

  const { users, totalCount, totalPages, currentPage } = await usersService.getUsers({
    role: params.role,
    search: params.search,
    isActive,
    page: params.page ? parseInt(params.page) : 1,
  })

  // Fetch statistics
  const stats = await usersService.getUserStats()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Gestión de Usuarios</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <form action="/auth/logout" method="post">
              <Button variant="outline" size="sm">
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-muted/40 p-6">
        <div className="container mx-auto space-y-6">
          {/* Back Button & New User Button */}
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/users/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard title="Total Usuarios" value={stats.total} />
            <StatsCard title="Usuarios Activos" value={stats.active} />
            <StatsCard 
              title="Administrativos" 
              value={stats.byRole.administrativo || 0} 
            />
          </div>

          {/* Users List with Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                Gestiona y visualiza todos los usuarios del sistema
                {totalCount > 0 && ` - ${totalCount} usuarios encontrados`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <UsersFilters />

                {/* Users List */}
                <UsersList users={users} />

                {/* Pagination */}
                <UsersPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

/**
 * Stats Card Component
 */
function StatsCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

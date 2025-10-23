import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Search, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

export default function UsersPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administrar usuarios y permisos del sistema</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>17 usuarios activos</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar usuarios..." className="pl-8 w-[300px]" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<UsersSkeleton />}>
            <UsersTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function UsersTable() {
  // Mock data - replace with real data from Supabase
  const users = [
    {
      id: 1,
      name: "Carlos Administrador",
      email: "admin@distribuidora.com",
      role: "administrativo",
      phone: "351-6660001",
      active: true,
    },
    {
      id: 2,
      name: "Juan Preventista",
      email: "preventista1@distribuidora.com",
      role: "preventista",
      phone: "351-6660003",
      active: true,
    },
    {
      id: 3,
      name: "Pedro Armador",
      email: "armado1@distribuidora.com",
      role: "encargado_armado",
      phone: "351-6660006",
      active: true,
    },
    {
      id: 4,
      name: "Carlos Méndez",
      email: "repartidor1@distribuidora.com",
      role: "repartidor",
      phone: "351-6661111",
      active: true,
    },
    {
      id: 5,
      name: "José Pérez",
      email: "cliente1@email.com",
      role: "cliente",
      phone: "351-5551234",
      active: true,
    },
  ]

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      administrativo: { label: "Administrativo", variant: "default" },
      preventista: { label: "Preventista", variant: "secondary" },
      encargado_armado: { label: "Armado", variant: "outline" },
      repartidor: { label: "Repartidor", variant: "secondary" },
      cliente: { label: "Cliente", variant: "outline" },
    }
    return variants[role] || { label: role, variant: "outline" }
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const roleBadge = getRoleBadge(user.role)
        return (
          <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">{user.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
              <p className="text-sm text-muted-foreground w-32">{user.phone}</p>
              <Badge variant={user.active ? "default" : "secondary"}>{user.active ? "Activo" : "Inactivo"}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                  <DropdownMenuItem>Editar</DropdownMenuItem>
                  <DropdownMenuItem>Cambiar contraseña</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">Desactivar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

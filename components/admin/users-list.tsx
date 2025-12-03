import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import {
  ROLE_LABELS,
  ROLE_COLORS,
  type UserRole,
} from '@/lib/constants/user-roles'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  phone: string | null
  is_active: boolean
  created_at: string
}

interface UsersListProps {
  users: User[]
}

/**
 * Users List Component
 * Displays a list of users with their details
 */
export function UsersList({ users }: UsersListProps) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          No se encontraron usuarios
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Intenta cambiar los filtros de búsqueda
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}

/**
 * User Card Component
 * Individual user card display
 */
function UserCard({ user }: { user: User }) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium">{user.full_name.charAt(0).toUpperCase()}</span>
        </div>
        
        {/* User Info */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-lg truncate">{user.full_name}</span>
            
            <Badge variant={ROLE_COLORS[user.role as UserRole]}>
              {ROLE_LABELS[user.role as UserRole]}
            </Badge>
            
            <Badge variant={user.is_active ? 'default' : 'secondary'}>
              {user.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground truncate">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            
            {user.phone && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Teléfono:</span> {user.phone}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground">
              Creado: {formatDate(user.created_at)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 shrink-0 ml-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/users/${user.id}/edit`}>Editar</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Format date to local string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}


import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UserEditForm } from "@/components/admin/user-edit-form"
import { createUsersService } from "@/lib/services/usersService"

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Admin Edit User Page
 * Allows administrators to edit existing users
 */
export default async function AdminEditUserPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Authorization check
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "administrativo") {
    redirect("/auth/login")
  }

  // Fetch user to edit
  const usersService = createUsersService(supabase)
  let userToEdit

  try {
    userToEdit = await usersService.getUserById(id)
  } catch (error) {
    notFound()
  }

  if (!userToEdit) {
    notFound()
  }

  const isSelf = user.id === id

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Editar Usuario</h1>
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
        <div className="container mx-auto max-w-2xl space-y-6">
          <Button variant="outline" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Usuarios
            </Link>
          </Button>

          <UserEditForm user={userToEdit} isSelf={isSelf} />
        </div>
      </main>
    </div>
  )
}


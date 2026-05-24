import { Package } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import Link from "next/link"
import { HeaderSubtitle } from "./HeaderSubtitle"

interface HeaderProps {
  profile: {
    full_name: string
    role: string
  };
}

const ROLE_LABELS: Record<string, string> = {
  preventista: "Preventista",
  encargado_armado: "Armador",
  supervisor_armado: "Supervisor de Armado",
  repartidor: "Repartidor",
  cliente: "Cliente",
  administrativo: "Administrativo",
  venta_directa: "Venta Directa",
}

const ROLE_PATHS: Record<string, string> = {
  venta_directa: "/venta-directa/dashboard",
  supervisor_armado: "/supervisor-armado/dashboard",
}

export function Header({ profile }: HeaderProps) {
  const roleLabel = ROLE_LABELS[profile.role] || profile.role
  const homePath = ROLE_PATHS[profile.role] || `/${profile.role}/dashboard`

  return (

      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href={homePath} className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Sistema de Gestión - {roleLabel}</h1>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <LogoutButton />
          </div>
        </div>
        <HeaderSubtitle />
      </header>
      )
}
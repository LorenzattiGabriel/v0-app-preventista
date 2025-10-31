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

export function Header({ profile }: HeaderProps) {

  return (

      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href={`/${profile.role}/dashboard`} className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Sistema de Gestión - {profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()}</h1>
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
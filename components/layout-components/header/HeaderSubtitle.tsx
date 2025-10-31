"use client"

import { usePathname } from "next/navigation"

function getSubtitle(pathname: string | null): string | undefined {
  if (!pathname) return undefined

  if (pathname.startsWith("/preventista/customers/edit")) {
    return "Editar Cliente"
  }

  const subtitles: Record<string, string|undefined> = {
    "/preventista/dashboard": undefined,
    "/preventista/customers": "Mis Clientes",
    "/preventista/customers/new": "Crear Nuevo Cliente",
    "/preventista/orders": "Mis Pedidos",
    "/preventista/orders/new": "Crear Nuevo Pedido",
  }

  if (subtitles[pathname]) {
    return subtitles[pathname]
  }

  if (pathname.startsWith("/preventista/customers/")) {
    return "Detalle de Cliente"
  }

  return undefined
}

export function HeaderSubtitle() {
  const subtitle = getSubtitle(usePathname())

  return subtitle ? <div className="container flex h-16 items-center px-4">
      <h2 className="text-xl font-semibold">{subtitle}</h2>
    </div> : null
}

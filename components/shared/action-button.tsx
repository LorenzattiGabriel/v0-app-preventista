"use client"

import * as React from "react"
import Link from "next/link"
import { useLinkStatus } from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Botón de acción que muestra "Procesando…" mientras la operación está en curso.
 *
 * 🚨 Por qué: con conexión lenta el usuario no tenía forma de saber si el
 * sistema estaba trabajando, así que volvía a tocar el botón. De ahí salieron
 * los pagos y las deudas duplicados en cuenta corriente. Además de deshabilitar
 * el botón (que evita el segundo envío), el cambio de texto le confirma a la
 * persona que algo está pasando.
 */
export function ActionButton({
  pending = false,
  pendingText = "Procesando…",
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  pending?: boolean
  pendingText?: string
}) {
  return (
    <Button disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

/**
 * Spinner que se enciende solo mientras el <Link> que lo contiene está
 * navegando. Tiene que ser descendiente de un <Link> (requisito de
 * useLinkStatus, Next 15.3+).
 */
function LinkPendingIndicator() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Loader2 className="animate-spin" aria-hidden="true" />
}

/**
 * Link con pinta de botón que muestra un spinner en EL BOTÓN QUE SE TOCÓ
 * mientras Next resuelve la página destino.
 *
 * El loading.tsx de cada rol cubre la pantalla destino; esto cubre el instante
 * previo y deja claro cuál de los botones se apretó.
 */
export function NavButton({
  href,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { href: string }) {
  return (
    <Button asChild {...props}>
      <Link href={href}>
        <LinkPendingIndicator />
        {children}
      </Link>
    </Button>
  )
}

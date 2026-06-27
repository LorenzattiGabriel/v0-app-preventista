"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

interface CollapsibleSectionProps {
  /** Título visible en la barra de la sección. */
  title: string
  /** Texto chico opcional debajo del título. */
  description?: string
  /** Ícono opcional a la izquierda del título. */
  icon?: ReactNode
  /** Estado inicial si no hay preferencia guardada. */
  defaultOpen?: boolean
  /** Clave para persistir abierto/cerrado en localStorage. */
  storageKey?: string
  children: ReactNode
}

export function CollapsibleSection({
  title,
  description,
  icon,
  defaultOpen = true,
  storageKey,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  // Recuperar preferencia guardada (después del primer render para evitar hydration mismatch)
  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(`dashboard-section:${storageKey}`)
    if (saved === "open") setOpen(true)
    else if (saved === "closed") setOpen(false)
  }, [storageKey])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (storageKey) {
      localStorage.setItem(`dashboard-section:${storageKey}`, next ? "open" : "closed")
    }
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold tracking-tight truncate">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div>{children}</div>}
    </section>
  )
}

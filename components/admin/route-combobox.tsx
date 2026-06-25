"use client"

import { useRef, useState } from "react"
import { Check, ChevronsUpDown, Truck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface RouteOption {
  id: string
  code: string
  date?: string | null
}

interface RouteComboboxProps {
  routes: RouteOption[]
  defaultRouteId?: string
}

const MAX_RESULTS = 50

const formatDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("es-AR") : ""

export function RouteCombobox({ routes, defaultRouteId }: RouteComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState(defaultRouteId || "")
  const hiddenRef = useRef<HTMLInputElement>(null)

  const selected = routes.find((r) => r.id === selectedId)

  const term = search.trim().toLowerCase()
  const filtered = (
    term
      ? routes.filter(
          (r) =>
            r.code.toLowerCase().includes(term) ||
            formatDate(r.date).includes(term) ||
            (r.date || "").includes(term),
        )
      : routes
  ).slice(0, MAX_RESULTS)

  const submitForm = () => {
    requestAnimationFrame(() => hiddenRef.current?.form?.requestSubmit())
  }

  const handleSelect = (route: RouteOption) => {
    setSelectedId(route.id)
    setOpen(false)
    if (hiddenRef.current) hiddenRef.current.value = route.id
    submitForm()
  }

  const handleClear = () => {
    setSelectedId("")
    if (hiddenRef.current) hiddenRef.current.value = ""
    submitForm()
  }

  return (
    <>
      <input ref={hiddenRef} type="hidden" name="routeId" defaultValue={selectedId} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected ? (
                <span className="truncate">
                  {selected.code}
                  {selected.date ? ` · ${formatDate(selected.date)}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">Todas las rutas</span>
              )}
            </span>
            {selected ? (
              <X
                className="h-4 w-4 shrink-0 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[360px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar reparto por código o fecha..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Sin rutas.</CommandEmpty>
              <CommandGroup>
                {filtered.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`${r.code} ${formatDate(r.date)}`}
                    onSelect={() => handleSelect(r)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedId === r.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Truck className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.code}</span>
                    {r.date && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatDate(r.date)}
                      </span>
                    )}
                  </CommandItem>
                ))}
                {filtered.length === MAX_RESULTS && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Mostrando los primeros {MAX_RESULTS}. Refiná la búsqueda…
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}

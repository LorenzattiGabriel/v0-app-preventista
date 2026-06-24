"use client"

import { useRef, useState } from "react"
import { Check, ChevronsUpDown, Users, Package, X } from "lucide-react"
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

export interface PartyOption {
  id: string
  name: string
  type: "cliente" | "proveedor"
  code?: string | null
}

interface PartyComboboxProps {
  parties: PartyOption[]
  defaultPartyId?: string
}

const MAX_RESULTS = 50

export function PartyCombobox({ parties, defaultPartyId }: PartyComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState(defaultPartyId || "")
  const hiddenRef = useRef<HTMLInputElement>(null)

  const selected = parties.find((p) => p.id === selectedId)

  const term = search.trim().toLowerCase()
  const filtered = (
    term
      ? parties.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            (p.code || "").toLowerCase().includes(term),
        )
      : parties
  ).slice(0, MAX_RESULTS)

  const submitForm = () => {
    // Dispara la consulta del form padre (GET) al seleccionar
    requestAnimationFrame(() => hiddenRef.current?.form?.requestSubmit())
  }

  const handleSelect = (party: PartyOption) => {
    setSelectedId(party.id)
    setOpen(false)
    if (hiddenRef.current) hiddenRef.current.value = party.id
    submitForm()
  }

  const handleClear = () => {
    setSelectedId("")
    if (hiddenRef.current) hiddenRef.current.value = ""
    submitForm()
  }

  return (
    <>
      <input ref={hiddenRef} type="hidden" name="partyId" defaultValue={selectedId} />
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
              {selected ? (
                <>
                  {selected.type === "cliente" ? (
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{selected.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Todos los clientes / proveedores</span>
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
        <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[420px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Escribí un cliente o proveedor..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {filtered.map((p) => (
                  <CommandItem
                    key={`${p.type}-${p.id}`}
                    value={`${p.name} ${p.code ?? ""}`}
                    onSelect={() => handleSelect(p)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedId === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {p.type === "cliente" ? (
                      <Users className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Package className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{p.name}</span>
                    {p.code && (
                      <span className="ml-2 text-xs text-muted-foreground">{p.code}</span>
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

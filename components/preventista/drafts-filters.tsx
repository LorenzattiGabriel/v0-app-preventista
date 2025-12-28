"use client"

import { useCallback, useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Filter, X } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "./sheet"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { DateRangePicker } from "./date-range-picker"
import { DateRange } from "react-day-picker"

const priorityOptions = [
  { value: "baja", label: "Baja" },
  { value: "normal", label: "Normal" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
]

type AdvancedFiltersState = {
  deliveryDate: DateRange | undefined
  creationDate: DateRange | undefined
  localities: Set<string>
  totalMin: string
  totalMax: string
}

export function DraftsFilters({
  localities,
}: {
  localities: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isPriorityPopoverOpen, setIsPriorityPopoverOpen] = useState(false)
  const [stagedPriorities, setStagedPriorities] = useState<Set<string>>(new Set())
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>({} as AdvancedFiltersState)

  const createQueryString = useCallback(
    (paramsToUpdate: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [name, value] of Object.entries(paramsToUpdate)) {
        if (value === null || value === "") {
          params.delete(name)
        } else {
          params.set(name, value)
        }
      }
      return params.toString()
    },
    [searchParams]
  )

  // Initialize advanced filter state when the sheet opens
  useEffect(() => {
    if (isSheetOpen) {
      const deliveryDateFrom = searchParams.get("deliveryDateFrom")
      const deliveryDateTo = searchParams.get("deliveryDateTo")
      const createdAtFrom = searchParams.get("createdAtFrom")
      const createdAtTo = searchParams.get("createdAtTo")

      setAdvancedFilters({
        deliveryDate: deliveryDateFrom ? { from: new Date(deliveryDateFrom), to: deliveryDateTo ? new Date(deliveryDateTo) : undefined } : undefined,
        creationDate: createdAtFrom ? { from: new Date(createdAtFrom), to: createdAtTo ? new Date(createdAtTo) : undefined } : undefined,
        localities: new Set(searchParams.get("localities")?.split(",").filter(Boolean)),
        totalMin: searchParams.get("totalMin") ?? "",
        totalMax: searchParams.get("totalMax") ?? "",
      })
    }
  }, [isSheetOpen, searchParams])

  // Initialize staged priorities when the popover opens
  useEffect(() => {
    if (isPriorityPopoverOpen) {
      setStagedPriorities(new Set(searchParams.get("priorities")?.split(",").filter(Boolean)))
    }
  }, [isPriorityPopoverOpen, searchParams])

  const q = searchParams.get("q") ?? ""
  const priorities = new Set(searchParams.get("priorities")?.split(",").filter(Boolean))

  const handleAdvancedFilterChange = <K extends keyof AdvancedFiltersState>(key: K, value: AdvancedFiltersState[K]) => {
    setAdvancedFilters(prev => ({
      ...prev, [key]: value
    }))
  }

  const handleMultiSelectToggle = (
    paramName: string,
    currentSet: Set<string>,
    value: string
  ) => {
    const newSet = new Set(currentSet)
    if (newSet.has(value)) {
      newSet.delete(value)
    } else {
      newSet.add(value)
    }
    const newValue = Array.from(newSet).join(",")
    router.replace(`${pathname}?${createQueryString({ [paramName]: newValue })}`)
  }

  const applyPriorityFilters = () => {
    const newValue = Array.from(stagedPriorities).join(",")
    router.replace(`${pathname}?${createQueryString({ priorities: newValue })}`)
    setIsPriorityPopoverOpen(false)
  }

  const applyAdvancedFilters = () => {
    const params: Record<string, string | null> = {
      deliveryDateFrom: advancedFilters.deliveryDate?.from ? format(advancedFilters.deliveryDate.from, "yyyy-MM-dd") : null,
      deliveryDateTo: advancedFilters.deliveryDate?.to ? format(advancedFilters.deliveryDate.to, "yyyy-MM-dd") : null,
      createdAtFrom: advancedFilters.creationDate?.from ? format(advancedFilters.creationDate.from, "yyyy-MM-dd") : null,
      createdAtTo: advancedFilters.creationDate?.to ? format(advancedFilters.creationDate.to, "yyyy-MM-dd") : null,
      localities: Array.from(advancedFilters.localities).join(","),
      totalMin: advancedFilters.totalMin,
      totalMax: advancedFilters.totalMax,
    }

    router.replace(`${pathname}?${createQueryString(params)}`)
    setIsSheetOpen(false)
  }

  const advancedFiltersCount = [
    searchParams.get("localities"),
    searchParams.get("deliveryDateFrom"),
    searchParams.get("deliveryDateTo"),
    searchParams.get("createdAtFrom"),
    searchParams.get("createdAtTo"),
    searchParams.get("totalMin"),
    searchParams.get("totalMax"),
  ].filter(Boolean).length

  return (
    <div className="flex items-center gap-4">
      {/* Smart Search */}
      <Input
        placeholder="Buscar por nombre o código..."
        defaultValue={q}
        onChange={(e) => {
          router.replace(
            `${pathname}?${createQueryString({ q: e.target.value })}`
          )
        }}
        className="h-9 w-full md:w-[250px] lg:w-[300px]"
      />

      {/* Priority Multi-Select */}
      <Popover open={isPriorityPopoverOpen} onOpenChange={setIsPriorityPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 gap-1">
            Prioridad
            {priorities.size > 0 && <Badge>{priorities.size}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[200px] max-w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Filtrar prioridad..." />
            <CommandList>
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>
              <CommandGroup>
                {priorityOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      setStagedPriorities(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(option.value)) {
                          newSet.delete(option.value)
                        } else {
                          newSet.add(option.value)
                        }
                        return newSet
                      })
                    }}
                  >
                    <div
                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                        stagedPriorities.has(option.value)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      }`}
                    >
                      <X className="h-4 w-4" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t">
              <Button onClick={applyPriorityFilters} className="w-full h-8">Aplicar</Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Advanced Filters Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen} >
        <SheetTrigger asChild>
          <Button variant="outline" className="h-9 gap-1.5">
            <Filter className="h-4 w-4" />
            Filtros
            {advancedFiltersCount > 0 && <Badge>{advancedFiltersCount}</Badge>}
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Filtros Avanzados</SheetTitle>
          </SheetHeader>
          <div className="grid gap-6 py-6">
            {/* Delivery Date */}
            <div className="space-y-2">
              <Label>Fecha de Entrega</Label>
              <DateRangePicker
                range={advancedFilters.deliveryDate}
                onUpdate={({ range }) => handleAdvancedFilterChange("deliveryDate", range)}
              />
            </div>

            {/* Creation Date */}
            <div className="space-y-2">
              <Label>Fecha de Creación</Label>
              <DateRangePicker
                range={advancedFilters.creationDate}
                onUpdate={({ range }) => handleAdvancedFilterChange("creationDate", range)}
              />
            </div>

            {/* Localities */}
            <div className="space-y-2">
              <Label>Localidad</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal h-9">
                    {advancedFilters.localities?.size > 0
                      ? `${advancedFilters.localities.size} seleccionada(s)`
                      : "Seleccionar localidades"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[300px] max-w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar localidad..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        {localities.map((locality) => (
                          <CommandItem
                            key={locality}
                            onSelect={() => {
                              const newSet = new Set(advancedFilters.localities)
                              if (newSet.has(locality)) {
                                newSet.delete(locality)
                              } else {
                                newSet.add(locality)
                              }
                              handleAdvancedFilterChange("localities", newSet)
                            }}
                          >
                             <div
                              className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                                advancedFilters.localities?.has(locality)
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              }`}
                            >
                              <X className="h-4 w-4" />
                            </div>
                            <span>{locality}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Total Range */}
            <div className="space-y-2">
              <Label>Total del Pedido</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={advancedFilters.totalMin}
                  onChange={(e) => handleAdvancedFilterChange("totalMin", e.target.value)}
                />
                <span>-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={advancedFilters.totalMax}
                  onChange={(e) => handleAdvancedFilterChange("totalMax", e.target.value)}
                />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancelar</Button>
            <Button onClick={applyAdvancedFilters}>Aplicar Filtros</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
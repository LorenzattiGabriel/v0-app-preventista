"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Customer } from "@/lib/types/database"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface CustomerSelectorProps {
  customers: Customer[]
  onSelect: (customer: Customer) => void
  selectedCustomer: Customer | null
}

export function CustomerSelector({ customers, onSelect, selectedCustomer }: CustomerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  // Detectar si hay un cliente recién creado y seleccionarlo automáticamente
  useEffect(() => {
    const newlyCreatedCustomerId = sessionStorage.getItem('newly_created_customer_id')
    if (newlyCreatedCustomerId && !selectedCustomer) {
      const newCustomer = customers.find(c => c.id === newlyCreatedCustomerId)
      if (newCustomer) {
        onSelect(newCustomer)
        // Limpiar el sessionStorage
        sessionStorage.removeItem('newly_created_customer_id')
      }
    }
  }, [customers, selectedCustomer, onSelect])

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.commercial_name.toLowerCase().includes(searchValue.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchValue.toLowerCase()),
  )

  return (
    <div className="space-y-2">
      <Label>Cliente</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between bg-transparent"
            >
              {selectedCustomer ? (
                <span>
                  {selectedCustomer.code} - {selectedCustomer.commercial_name}
                </span>
              ) : (
                <span className="text-muted-foreground">Seleccionar cliente...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[400px] max-w-[400px] p-0">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Buscar cliente..." value={searchValue} onValueChange={setSearchValue} />
              <CommandList>
                <CommandEmpty>
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">No se encontró el cliente</p>
                    <Button asChild size="sm">
                      <Link href="/preventista/customers/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Nuevo Cliente
                      </Link>
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={`${customer.code} ${customer.commercial_name} ${customer.locality || ''}`}
                      onSelect={() => {
                        onSelect(customer)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {customer.code} - {customer.commercial_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {customer.locality} - {customer.customer_type}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button asChild variant="outline">
          <Link href="/preventista/customers/new">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

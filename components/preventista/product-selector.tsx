"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Product } from "@/lib/types/database"
import { Check, ChevronsUpDown, Package, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductSelectorProps {
  products: Product[]
  onSelect: (product: Product | null) => void
  selectedProduct: Product | null
  disabled?: boolean
  customerType?: "mayorista" | "minorista" | string | null
}

function getDisplayPrice(product: Product, customerType?: string | null): number {
  if (customerType === "mayorista" && product.wholesale_price) return product.wholesale_price
  if (customerType === "minorista" && product.retail_price) return product.retail_price
  return product.base_price
}

export function ProductSelector({ products, onSelect, selectedProduct, disabled, customerType }: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  // Filtrar productos por nombre, código, marca o código de barras
  const filteredProducts = products.filter((product) => {
    const search = searchValue.toLowerCase()
    return (
      product.name.toLowerCase().includes(search) ||
      product.code.toLowerCase().includes(search) ||
      (product.brand && product.brand.toLowerCase().includes(search)) ||
      (product.barcode && product.barcode.toLowerCase().includes(search))
    )
  })

  const handleSelect = (product: Product) => {
    onSelect(product)
    setOpen(false)
    setSearchValue("")
  }

  return (
    <div className="space-y-2">
      <Label>Producto</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
            disabled={disabled}
          >
            {selectedProduct ? (
              <span className="flex items-center gap-2 truncate">
                <Package className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {selectedProduct.code} - {selectedProduct.name}
                  {selectedProduct.brand && ` (${selectedProduct.brand})`}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Buscar producto...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[450px] max-w-[450px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar por nombre, código, marca..." 
              value={searchValue} 
              onValueChange={setSearchValue} 
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>
                <div className="text-center py-6">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No se encontró el producto</p>
                  <p className="text-xs text-muted-foreground mt-1">Intentá con otro término de búsqueda</p>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredProducts.map((product) => {
                  const hasNoStock = product.current_stock === 0
                  const hasLowStock = product.current_stock > 0 && product.current_stock <= product.min_stock

                  return (
                    <CommandItem
                      key={product.id}
                      value={`${product.code} ${product.name} ${product.brand || ""}`}
                      onSelect={() => handleSelect(product)}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{product.code}</span>
                            <span className="font-medium truncate">{product.name}</span>
                          </div>
                          {product.brand && (
                            <span className="text-xs text-muted-foreground">{product.brand}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {hasNoStock ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Sin Stock
                          </Badge>
                        ) : hasLowStock ? (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {product.current_stock}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {product.current_stock}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          ${getDisplayPrice(product, customerType).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}


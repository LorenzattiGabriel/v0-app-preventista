import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, AlertTriangle } from "lucide-react"
import { DeleteProductButton } from "./delete-product-button"

interface Product {
  id: string
  code: string
  name: string
  brand?: string
  category?: string
  base_price: number
  wholesale_price?: number
  retail_price?: number
  current_stock: number
  min_stock: number
  is_active: boolean
  barcode?: string
  iva_aliquot: number
  category_margin: number
  product_margin: number
  location?: string
  supplier?: string
}

interface ProductsListProps {
  products: Product[]
}

export function ProductsList({ products }: ProductsListProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No se encontraron productos</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <Card key={product.id} className="hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {!product.is_active && (
                    <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                      Inactivo
                    </Badge>
                  )}
                  {product.current_stock <= product.min_stock && (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Stock Bajo
                    </Badge>
                  )}
                  {product.category && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {product.category}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <span className="font-mono font-medium">{product.code}</span>
                  {product.brand && (
                    <>
                      <span>•</span>
                      <span>{product.brand}</span>
                    </>
                  )}
                  {product.supplier && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600">Proveedor: {product.supplier}</span>
                    </>
                  )}
                </div>
                {(product.barcode || product.location) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
                    {product.barcode && (
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        EAN: {product.barcode}
                      </span>
                    )}
                    {product.location && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        📍 {product.location}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/products/${product.id}/edit`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Link>
                </Button>
                <DeleteProductButton productId={product.id} productName={product.name} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Precio Base</p>
                <p className="text-lg font-bold">
                  ${product.base_price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {product.iva_aliquot > 0 && (
                  <p className="text-xs text-muted-foreground">IVA: {product.iva_aliquot}%</p>
                )}
              </div>
              {product.wholesale_price && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Precio Mayorista</p>
                  <p className="text-lg font-semibold">
                    ${product.wholesale_price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {product.retail_price && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Precio Minorista</p>
                  <p className="text-lg font-semibold">
                    ${product.retail_price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {(product.category_margin > 0 || product.product_margin > 0) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Márgenes</p>
                  <div className="space-y-1">
                    {product.category_margin > 0 && (
                      <p className="text-sm">Cat: {product.category_margin}%</p>
                    )}
                    {product.product_margin > 0 && (
                      <p className="text-sm font-semibold">Prod: {product.product_margin}%</p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Actual</p>
                <p
                  className={`text-lg font-bold ${product.current_stock <= product.min_stock ? "text-red-600" : "text-green-600"}`}
                >
                  {product.current_stock} unidades
                </p>
                <p className="text-xs text-muted-foreground">Mínimo: {product.min_stock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


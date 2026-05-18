// Adapta el shape de DirectSale (devuelto por el service) al shape que espera
// `downloadAssemblyReceipt` de receipt-generator (que usa `order.customers` singular
// y `order.order_items` con `products` singular).
// El remito de venta directa es el mismo que usa el armador → comprobante único en toda la app.

import type { DirectSale } from "@/lib/types/venta-directa"

export function adaptSaleForReceipt(sale: DirectSale): any {
  return {
    ...sale,
    // El receipt generator espera 'customers' singular con campos completos de dirección
    customers: sale.customer
      ? {
          commercial_name: sale.customer.commercial_name,
          contact_name: sale.customer.contact_name,
          phone: sale.customer.phone,
          street: sale.customer.street || "",
          street_number: sale.customer.street_number || "",
          locality: sale.customer.locality || "",
          province: sale.customer.province || "",
        }
      : {
          commercial_name: "Consumidor Final",
          contact_name: "",
          phone: "",
          street: "",
          street_number: "",
          locality: "",
          province: "",
        },
    // Receipt generator usa 'order_items' (no 'items') con 'products' singular
    order_items: (sale.items || []).map((it) => ({
      ...it,
      products: it.product
        ? {
            code: it.product.code,
            name: it.product.name,
            brand: it.product.brand,
            unit_of_measure: it.product.unit_of_measure,
            allows_decimal_quantity: it.product.allows_decimal_quantity,
            weight: it.product.weight,
          }
        : null,
    })),
  }
}

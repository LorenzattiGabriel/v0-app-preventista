// Adapta el shape de DirectSale (devuelto por el service) al shape que espera
// `downloadOrderReceipt` de receipt-generator (que usa `order.customers` y `order.order_items`).
// De esta forma reutilizamos el mismo PDF de remito sin duplicar lógica.

import type { DirectSale } from "@/lib/types/venta-directa"

export function adaptSaleForReceipt(sale: DirectSale): any {
  return {
    ...sale,
    // El receipt generator espera 'customers' (singular) con campos completos.
    // El service trae solo un Pick — mapeamos a lo que el generator usa.
    customers: sale.customer
      ? {
          commercial_name: sale.customer.commercial_name,
          contact_name: sale.customer.contact_name,
          phone: sale.customer.phone,
          // Los campos de dirección no vienen en la sale (es venta en local).
          // El receipt generator hace fallback con '' si no están.
          street: "",
          street_number: "",
          locality: "",
          province: "",
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
    // Receipt generator usa 'order_items' (no 'items').
    order_items: (sale.items || []).map((it) => ({
      ...it,
      products: it.product
        ? {
            code: it.product.code,
            name: it.product.name,
            unit_of_measure: it.product.unit_of_measure,
          }
        : null,
    })),
  }
}

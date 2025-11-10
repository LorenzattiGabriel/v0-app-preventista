// components/preventista/use-order-form-actions.ts
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Customer, OrderPriority, OrderType } from "@/lib/types/database"

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
}

interface SaveOrderParams {
  selectedCustomer: Customer | null
  deliveryDate: string
  priority: OrderPriority
  orderType: OrderType
  requiresInvoice: boolean
  observations: string
  generalDiscount: number
  orderItems: OrderItem[]
  userId: string
  isDraft: boolean
  orderId?: string // For updating existing orders
}

export function useOrderFormActions() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateTotals = (items: OrderItem[], discount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const total = subtotal - discount
    return { subtotal, total }
  }

  const saveOrder = async ({
    selectedCustomer,
    deliveryDate,
    priority,
    orderType,
    requiresInvoice,
    observations,
    generalDiscount,
    orderItems,
    userId,
    isDraft,
    orderId,
  }: SaveOrderParams) => {
    if (!selectedCustomer) {
      setError("Debe seleccionar un cliente")
      return null
    }

    if (!deliveryDate) {
      setError("Debe seleccionar una fecha de entrega")
      return null
    }

    if (orderItems.length === 0) {
      setError("Debe agregar al menos un producto")
      return null
    }
 
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { subtotal, total } = calculateTotals(orderItems, generalDiscount)
      const status = isDraft ? "BORRADOR" : "PENDIENTE_ARMADO"

      let currentOrderNumber: string | undefined = undefined;
      if (orderId) {
        // If updating an existing order, fetch its current order_number
        const { data: existingOrder, error: fetchOrderError } = await supabase
          .from("orders")
          .select("order_number")
          .eq("id", orderId)
          .single();

        if (fetchOrderError || !existingOrder) {
          console.error("Error fetching existing order for update:", fetchOrderError);
          throw new Error("Error al obtener el número de pedido existente.");
        }
        currentOrderNumber = existingOrder.order_number;
      }

      // Generate order number only if creating a new order (no orderId)
      // If it's an existing draft, we keep its order_number. If it's a new draft, we generate one.
      // If it's a new confirmed order, we generate one.
      let orderNumber = currentOrderNumber;
      if (!orderId) { // Only generate new order number if it's a new order (not an update)
        const { data: newOrderNumberData, error: orderNumberError } = await supabase.rpc("generate_order_number");
        if (orderNumberError) {
          console.error("Error generating order number:", orderNumberError);
          throw new Error(`Error al generar el número de pedido: ${orderNumberError.message}`);
        }
        orderNumber = newOrderNumberData as string;
        if (!orderNumber) {
          throw new Error("No se pudo generar el número de pedido");
        }
      }


      let orderResult;
      if (orderId) {
        // Update existing order
        const { data, error: updateError } = await supabase
          .from("orders")
          .update({
            order_number: orderNumber, // Keep existing order number
            customer_id: selectedCustomer.id,
            order_date: new Date().toISOString().split("T")[0], // Update order date on save
            created_at: new Date().toISOString(), // Full timestamp with timezone
            delivery_date: deliveryDate,
            priority,
            order_type: orderType,
            status,
            subtotal,
            general_discount: generalDiscount,
            total,
            requires_invoice: requiresInvoice,
            observations,
          })
          .eq("id", orderId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating order:", updateError);
          throw updateError;
        }
        orderResult = data;

        // Delete existing order items and insert new ones
        await supabase.from("order_items").delete().eq("order_id", orderId);
      } else {
        // Create new order
        const { data, error: createError } = await supabase
          .from("orders")
          .insert({
            order_number: orderNumber,
            customer_id: selectedCustomer.id,
            order_date: new Date().toISOString().split("T")[0],
            delivery_date: deliveryDate,
            priority,
            order_type: orderType,
            status,
            subtotal,
            general_discount: generalDiscount,
            total,
            requires_invoice: requiresInvoice,
            created_by: userId,
            observations,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating order:", createError);
          throw createError;
        }
        orderResult = data;
      }

      if (!orderResult) {
        throw new Error("No se pudo guardar el pedido.");
      }

      // Insert order items
      const itemsToInsert = orderItems.map((item) => ({
        order_id: orderResult.id,
        product_id: item.productId,
        quantity_requested: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
      if (itemsError) {
        console.error("Error inserting order items:", itemsError);
        throw itemsError;
      }

      // Create order history entry
      await supabase.from("order_history").insert({
        order_id: orderResult.id,
        new_status: status,
        changed_by: userId,
        change_reason: isDraft ? (orderId ? "Borrador actualizado" : "Borrador creado") : (orderId ? "Pedido actualizado" : "Pedido creado"),
      });

      return orderResult.id; // Return the new order ID on success

    } catch (err) {
      console.error("[v0] Error saving order:", err);
      setError(err instanceof Error ? err.message : "Error al guardar el pedido");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (deleteError) {
        console.error("Error deleting order:", deleteError);
        throw deleteError;
      }

      router.refresh();
    } catch (err) {
      console.error("[v0] Error deleting order:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar el pedido");
    } finally {
      setIsDeleting(false);
    }
  };

  const duplicateDraft = async (orderIdToDuplicate: string) => {
    setIsDuplicating(true);
    setError(null);
    try {
      const supabase = createClient();

      // 1. Fetch the complete original draft data
      const { data: originalOrder, error: fetchError } = await supabase
        .from("orders")
        .select(`
          *,
          customers (*),
          order_items (*)
        `)
        .eq("id", orderIdToDuplicate)
        .single();

      if (fetchError || !originalOrder) {
        throw new Error("No se pudo encontrar el borrador original para duplicar.");
      }

      // 2. Prepare the data for the new draft
      const newOrderParams: SaveOrderParams = {
        selectedCustomer: originalOrder.customers,
        deliveryDate: originalOrder.delivery_date,
        priority: originalOrder.priority,
        orderType: originalOrder.order_type,
        requiresInvoice: originalOrder.requires_invoice,
        observations: `(Copia de ${originalOrder.order_number}) ${originalOrder.observations || ''}`.trim(),
        generalDiscount: originalOrder.general_discount,
        orderItems: originalOrder.order_items.map((item: any) => ({
          productId: item.product_id,
          quantity: item.quantity_requested,
          unitPrice: item.unit_price,
          discount: item.discount,
          subtotal: item.subtotal
        })),
        userId: originalOrder.created_by,
        isDraft: true,
        orderId: undefined, // CRUCIAL: Ensure it creates a new order
      };

      // 3. Call saveOrder to create the new draft
      const newOrderId = await saveOrder(newOrderParams);

      // 4. Refresh page
      if (newOrderId) {
        router.refresh();
      }
    } catch (err) {
      console.error("[v0] Error duplicating draft:", err);
      setError(err instanceof Error ? err.message : "Error al duplicar el borrador");
    } finally {
      setIsDuplicating(false);
    }
  };

  return { saveOrder, deleteOrder, duplicateDraft, isLoading, isDeleting, isDuplicating, error, setError, calculateTotals };
}
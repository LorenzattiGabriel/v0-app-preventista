# 📦 Flujo Completo de Stock y Pedidos

## 🎯 Caso de Uso Completo

### Estado Inicial
```
Product: Coca Cola 2L
├─ current_stock: 100 unidades
└─ min_stock: 20 unidades
```

---

## Fase 1: Creación del Pedido (Preventista)

**Actor**: Preventista  
**Estado Orden**: `PENDIENTE_ARMADO`

```typescript
// Preventista crea pedido
order_items: {
  product_id: "coca-cola-2l",
  quantity_requested: 30,
  quantity_assembled: null,
  is_shortage: false
}
```

**Resultado**:
- ✅ Pedido creado
- ✅ Stock NO cambia: `100 unidades`
- ✅ Razón: Es solo una solicitud, aún no se confirmó que se usará

---

## Fase 2: Armado del Pedido (Encargado de Armado)

**Actor**: Encargado de Armado  
**Archivo**: `components/armado/assembly-form.tsx`

### Escenario A: Stock Suficiente ✅

```typescript
// Armador confirma armado
order_items: {
  quantity_requested: 30,
  quantity_assembled: 30,  // ✅ Se armó todo
  is_shortage: false
}

order: {
  status: "PENDIENTE_ENTREGA",
  has_shortages: false,
  assembled_by: userId,
  assembly_completed_at: now()
}
```

**Resultado**:
- ✅ Stock SE DESCUENTA: `100 - 30 = 70 unidades`
- ✅ Lógica: `assembly-form.tsx` líneas 176-225

### Escenario B: Stock Insuficiente (Faltante) ⚠️

```typescript
// Solo hay 25 unidades disponibles
order_items: {
  quantity_requested: 30,
  quantity_assembled: 25,   // ⚠️ Faltaron 5
  is_shortage: true,
  shortage_reason: "sin_stock",
  shortage_notes: "Solo había 25 en depósito"
}

order: {
  status: "PENDIENTE_ENTREGA",
  has_shortages: true,      // ⚠️ Marca que hay faltantes
  total: recalculado        // Solo paga por 25
}
```

**Resultado**:
- ✅ Stock SE DESCUENTA: `100 - 25 = 75 unidades`
- ✅ Cliente ve alerta de faltante
- ✅ Precio ajustado automáticamente

### Escenario C: Producto Sustituto 🔄

```typescript
// No hay Coca Cola 2L, se sustituye por Coca 1.5L
order_items: {
  product_id: "coca-cola-2l",
  quantity_requested: 30,
  quantity_assembled: 30,
  is_substituted: true,
  substituted_product_id: "coca-cola-1.5l"  // Producto sustituto
}
```

**Resultado**:
- ✅ Stock Coca 2L: sin cambios (0 unidades)
- ✅ Stock Coca 1.5L: `SE DESCUENTA 30 unidades`
- ✅ Cliente ve qué producto recibió en su lugar

---

## Fase 3: Entrega (Repartidor)

**Actor**: Repartidor  
**Estado Orden**: `ENTREGADO`

```typescript
order: {
  status: "ENTREGADO",
  delivered_by: driverId,
  delivered_at: now()
}
```

**Resultado**:
- ✅ Stock NO cambia
- ✅ Razón: Ya fue descontado en armado
- ✅ Cliente puede calificar y reclamar

---

## Fase 4a: Cancelación ANTES de Armar ✅

**Estado Orden**: `CANCELADO` (desde `PENDIENTE_ARMADO` o `BORRADOR`)

**Resultado**:
- ✅ Stock NO cambia
- ✅ Razón: Nunca se descontó porque no se armó

---

## Fase 4b: Cancelación DESPUÉS de Armar ⚠️

**Estado Orden**: `CANCELADO` (desde `PENDIENTE_ENTREGA` o `EN_REPARTICION`)

**PROBLEMA ACTUAL**:
```typescript
// ❌ Simplemente elimina o marca como cancelado
// ❌ NO devuelve el stock
```

**SOLUCIÓN IMPLEMENTADA**:
```typescript
// Servicio: lib/services/stockService.ts
await stockService.restoreStockFromCancelledOrder(orderId)

// Restaura el stock de:
// - Productos originales (si no hubo sustitución)
// - Productos sustitutos (si hubo sustitución)
// - Solo las cantidades que se armaron
```

**Resultado esperado**:
- ✅ Stock SE DEVUELVE: `70 + 30 = 100 unidades`
- ✅ Usa: `restoreStockFromCancelledOrder()`

---

## Fase 5: Devolución (Después de Entrega) ⚠️

**Caso**: Cliente devuelve productos después de recibidos

**PROBLEMA ACTUAL**:
- ❌ NO hay flujo de devoluciones implementado
- ❌ NO hay tabla para registrar devoluciones

**SOLUCIÓN PROPUESTA**:
```sql
-- Tabla nueva (por implementar)
CREATE TABLE product_returns (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  order_item_id UUID REFERENCES order_items(id),
  quantity_returned INTEGER NOT NULL,
  return_reason TEXT,
  return_notes TEXT,
  returned_at TIMESTAMPTZ DEFAULT NOW(),
  returned_by UUID REFERENCES profiles(id)
);
```

---

## 🔍 Alertas de Stock

### Stock Bajo (Admin)
```
Condición: current_stock <= min_stock
Ejemplo: 
  - current_stock: 15
  - min_stock: 20
  → ⚠️ ALERTA: Stock Bajo
  
URL: /admin/products?low_stock=true
```

### Pedidos con Faltantes (Admin/Cliente)
```
Condición: order.has_shortages = true
URL Admin: /admin/orders?has_shortages=true
URL Cliente: /cliente/orders?has_shortages=true
```

---

## 📊 Resumen de Implementación

| Funcionalidad | Archivo | Estado |
|---------------|---------|--------|
| Descuento en Armado | `assembly-form.tsx` | ✅ Implementado |
| Manejo de Faltantes | `assembly-form.tsx` | ✅ Implementado |
| Producto Sustituto | `assembly-form.tsx` | ✅ Implementado |
| Cancelación (antes armado) | `use-order-form-actions.ts` | ✅ Implementado |
| Cancelación (después armado) | - | ⚠️ **Falta usar `stockService`** |
| Devoluciones | - | ❌ No implementado |
| Verificar Stock Disponible | `stockService.ts` | ✅ Implementado |

---

## 🛠️ Servicios Disponibles

### StockService (`lib/services/stockService.ts`)

```typescript
// Restaurar stock de orden cancelada
await stockService.restoreStockFromCancelledOrder(orderId)

// Disminuir stock al armar
await stockService.decreaseStockFromAssembly(orderItems)

// Verificar disponibilidad
const availability = await stockService.checkStockAvailability(orderItems)
```

---

## 🚨 Tareas Pendientes

1. **Alta Prioridad**:
   - [ ] Integrar `restoreStockFromCancelledOrder()` en cancelación de pedidos
   - [ ] Agregar validación de stock antes de comenzar armado
   
2. **Media Prioridad**:
   - [ ] Implementar sistema de devoluciones
   - [ ] Crear tabla `product_returns`
   - [ ] UI para gestionar devoluciones

3. **Baja Prioridad**:
   - [ ] Dashboard de movimientos de stock
   - [ ] Historial de cambios de stock
   - [ ] Alertas automáticas de stock bajo

---

## 📝 Notas Técnicas

- Stock NUNCA puede ser negativo (se usa `Math.max(0, newStock)`)
- Los errores de stock NO detienen el proceso completo (logs + continue)
- Las sustituciones afectan el producto sustituto, no el original
- Los faltantes NO devuelven stock (porque nunca se usó ese stock)


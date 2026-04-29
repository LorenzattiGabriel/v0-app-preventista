# CLAUDE.md — Sistema de Gestión Preventista/Distribuidora

App Next.js para gestión de distribuidora argentina con 4 módulos por rol.

## Stack

- **Next.js 14** App Router + TypeScript
- **Supabase** (PostgreSQL + Auth + Storage)
- **shadcn/ui** + Tailwind
- **pnpm** como package manager
- **@dnd-kit** para drag & drop
- **jsPDF** para comprobantes
- **Google Maps API** para geocoding y validación GPS
- Deploy en Vercel

## Roles

| Rol | Carpeta | Función |
|---|---|---|
| `administrativo` | `app/admin/` | Gestión completa: clientes, productos, pedidos, rutas, reportes, asignación de pedidos a armadores |
| `encargado_armado` | `app/armado/` | Arma pedidos (cantidades, faltantes, sustituciones) |
| `preventista` | `app/preventista/` | Crea pedidos para clientes |
| `repartidor` | `app/repartidor/` | Reparte pedidos en hoja de ruta |
| `cliente` | `app/cliente/` | Ve sus pedidos y los califica |

## Estructura

```
app/
  api/                   # API routes (REST)
    admin/orders/{merge,assign,early-assembly,...}
    repartidor/routes/[id]/{reorder,reorder-batch}
    depot-config
  admin/, armado/, preventista/, repartidor/, cliente/
  armado/actions.ts      # Server actions con revalidatePath
components/
  {role}/                # componentes por rol
  ui/                    # primitivos shadcn
  shared/                # compartidos (edit-customer-form, location-picker, etc.)
lib/
  types/database.ts      # Tipos TypeScript que matchean schema
  services/              # Business logic (delayedOrders, accountMovements, products, etc.)
  receipt-generator.ts   # PDFs (entrega + armado)
  supabase/{client,server}.ts
  utils/mergeable-orders.ts
supabase/migrations/     # SQL
scripts/                 # 001_create_database_schema.sql + helpers
```

## Modelo de datos clave

### `orders` (estados)
`BORRADOR → PENDIENTE_ARMADO → EN_ARMADO → PENDIENTE_ENTREGA → EN_REPARTICION → ENTREGADO`
También: `CANCELADO`, `ESPERANDO_STOCK`.

### Tipos
- `order_type`: `web | presencial | telefono | whatsapp | local`
- `priority`: `baja | normal | media | alta | urgente`
- `customer_type`: `mayorista | minorista`
- `payment_method`: `Efectivo, Transferencia, Tarjeta de Débito/Crédito, Cuenta Corriente, Cheque, Otro`

### Campos importantes en `orders`
- `assembled_by` — armador asignado (si PENDIENTE_ARMADO) o que está armando (si EN_ARMADO). Reusado para ambos.
- `merged_from UUID[]` — pedidos absorbidos en una fusión (preserva histórico)
- `payment_methods_json` — split payment (múltiples métodos)
- `has_time_restriction` + `delivery_window_start/end` — VRPTW
- `early_assembly_allowed` — admin habilitó armar antes de la fecha
- `invoice_type` — A/B/C (sólo si requires_invoice)
- `original_delivery_date` + `reschedule_count` — tracking de reprogramación

### Tablas auxiliares
- `route_orders` — stops de una ruta, con `delivery_order` (sequence) y `actual_arrival_time`
- `route_reorder_log` — auditoría de cambios manuales del repartidor (single "Ir ahora" + batch drag-drop)
- `order_history` — cambios de status
- `order_date_changes` — cambios de fecha de entrega
- `account_movements` + `customers.current_balance` — cuenta corriente
- `stock_movements` — auditoría de stock (incluye cambios de precio)
- `depot_configuration` — distribuidora: address, lat/lng, `radius_meters` (tolerancia repartidor), `presencial_order_radius_meters` (radio para validar pedidos presenciales del preventista)

## Reglas de negocio críticas

### 🚨 DECIMAL como strings (BUG TÍPICO)
Supabase devuelve columnas `DECIMAL` como **strings**. Si hacés `+=` directo se concatenan en lugar de sumar.
```ts
// ❌ MAL - "2" += "3" → "23"
existing.quantity_requested += item.quantity_requested

// ✅ BIEN
const toNum = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
existing.quantity_requested += toNum(item.quantity_requested)
```
Aplica a: `quantity_requested/assembled/delivered`, `unit_price`, `discount`, `subtotal`, `total`, `general_discount`, `weight`. **Siempre coercer a Number antes de operar.**

### Validación GPS para pedidos presenciales
- Configurable por admin en `/admin/settings/depot` (`presencial_order_radius_meters`, default 600m)
- Preventista debe estar dentro del radio del cliente para crear pedido `presencial`
- Tipo `local` = cliente vino al depósito → no requiere validación GPS

### Auto-lock en armado
- Al abrir `/armado/orders/[id]`, si está `PENDIENTE_ARMADO` → cambia a `EN_ARMADO` y `assembled_by = current_user`
- Si `assembled_by` es otro user (PRE-ASIGNACIÓN), **bloquea acceso**
- Liberación con server action `releaseOrderAction` (revalidatePath asegura refresh)

### Restricción armado anticipado
Si `delivery_date > mañana` y `early_assembly_allowed = false` → bloquea armado. Admin habilita por pedido en `/admin/orders/assign` (columna "Anticipado").

### Faltantes en armado
- **Auto-detect**: si `quantityAssembled < quantityRequested` → marca `isShortage = true` automáticamente
- Botones "Faltante total" (set 0) y "Restablecer" (vuelve al solicitado)
- Productos por unidad: input tope `max = quantityRequested`
- Productos por peso (`allows_decimal_quantity`): sin tope (puede armar más)
- Comprobante PDF refleja: cantidad armada, total armado vs original, diferencia, motivo de faltante por línea, peso solicitado vs armado

### Fusión de pedidos
- Solo pedidos del **mismo cliente** en `BORRADOR` o `PENDIENTE_ARMADO`
- El más viejo (`created_at` ascendente) sobrevive; los demás → `CANCELADO`
- **Items del mismo producto se SUMAN** (no se reemplazan). Usa `toNum()` por el bug de DECIMAL.
- Conflictos: prioridad más alta gana, fecha más temprana, observaciones se concatenan
- DELETE de items originales por **ID específico** (no por `order_id`) y luego INSERT batch validado con `.select()` + count check
- `merged_from` **acumula** sobre fusiones anteriores

### Hoja de ruta interactiva
- **Drag & drop** (`@dnd-kit`): "Modificar orden de la ruta" → modo edición compacto → motivo único batch → POST `/api/repartidor/routes/[id]/reorder-batch`
- **Ir ahora** (single): botón en cada stop pendiente excepto el primero → motivo individual → POST `/api/repartidor/routes/[id]/reorder` (mueve al primer puesto entre pendientes)
- Ambos persisten cada movimiento en `route_reorder_log`. Stops ya entregados no se mueven.
- Admin ve historial en `/admin/routes/[id]`

### Split payment
- Una entrega puede tener múltiples métodos de pago (`payment_methods_json: PaymentLine[]`)
- `payment_method` queda como el de mayor monto (backward compat)

### Pedidos sin items
- Validación tanto en form como en `saveOrder`. **No se permite guardar borrador ni confirmar pedido sin items.**

### Tipos de descuento por línea (preventista)
- Por unidad: `$` (fijo) o `%` (porcentaje), toggle inline
- Producto puede tener `max_discount_percentage` y/o `max_discount_fixed` configurado por admin → bloquea si supera

### Precio según tipo de cliente
- Cliente mayorista + producto con `wholesale_price` → usa wholesale
- Cliente minorista + producto con `retail_price` → usa retail
- Sino → `base_price`
- Form preventista tiene **select Mayorista/Minorista/Base/Personalizado** + auto-detección al editar manualmente

## Patrones del código

### Páginas servidor + clientes
```tsx
// page.tsx (server)
export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from("...").select("...")
  return <ClientComponent data={data} />
}
```

### Server actions con revalidatePath
```ts
// app/{role}/actions.ts
"use server"
export async function releaseOrderAction(orderId: string) {
  // ...
  revalidatePath("/armado/dashboard")
  return { success: true }
}
```

### API endpoints con auth + role check
```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
if (!ALLOWED_ROLES.includes(profile.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
```

### RLS abierto
Todas las tablas tienen `USING (true) WITH CHECK (true)` para `authenticated`. Los permisos los maneja la app, no la BD. (Ver `scripts/008_disable_rls_for_simple_auth.sql`)

### Comprobantes PDF
`lib/receipt-generator.ts` exporta:
- `downloadAssemblyReceipt(order)` — comprobante de armado (incluye solicitado vs armado, diferencia, faltantes, peso)
- `downloadOrderReceipt(order, repartidorName)` — comprobante de entrega
- Versiones `getXxxBlob` para WhatsApp Share API

## Errores TS pre-existentes (ignorables)

- `TS2786 'X cannot be used as a JSX component'` — async server components, es bug del compilador, runtime ok
- `TS7006` en callbacks de Google Maps — `any` implícito por SDK sin tipos
- `TS2322` en `calendar.tsx`, `command.tsx`, `chart.tsx` — versiones de libs (react-day-picker, cmdk, recharts)
- `TS7034/TS7005` en `use-order-form-actions.ts:orderResult` — variable any implícita

**No hay que arreglarlos** salvo que aparezca uno nuevo de un cambio reciente.

## Migrations recientes (correr en Supabase)

```
add_order_merge_support.sql
add_split_payment_support.sql
add_decimal_quantities_order_items.sql
add_max_discount_to_products.sql
add_address_notes_to_customers.sql
add_local_order_type.sql
add_presencial_order_radius.sql
add_route_reorder_log.sql
add_invoice_type_to_orders.sql
add_early_assembly_allowed.sql
```

## Convenciones del usuario

- **Español rioplatense** en respuestas y UI ("vos tenés", "querés", "te sirve").
- **Respuestas terse**, con resumen al final de cambios.
- Usuario commite con frase explícita "**commit and push**". No commitear sin pedido.
- Co-author: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- Locale `es-AR` para fechas (`toLocaleDateString("es-AR")`) y montos (`toLocaleString("es-AR")`).
- v0/Vercel a veces commitea cambios automáticamente — chequear `git log` antes de asumir que no hay cambios remotos.
- Migraciones SQL las corre el usuario manualmente en Supabase. Avisarle siempre cuando hay nuevas.

## Comandos útiles

```bash
pnpm dev                                    # dev server
pnpm build                                  # build
npx tsc --noEmit                            # typecheck (esperar errores pre-existentes)
git log --oneline -10                       # commits recientes
git fetch origin main && git status         # ver si hay cambios remotos
```

## Próximos features potenciales (mencionados pero no implementados)

- Reportes con filtros por rango de fechas
- Notificaciones push para repartidor
- Modo offline para repartidor
- Histórico de precios por producto
- Liquidación automática de comisiones por preventista

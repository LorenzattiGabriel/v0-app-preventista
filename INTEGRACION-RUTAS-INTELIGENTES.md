# 🔗 Integración: App Preventista ↔ Microservicio Rutas Inteligentes

## 📊 ARQUITECTURA

```
┌────────────────────────────────┐
│  App Preventista (Cliente)    │
│  localhost:3001                │
│                                │
│  - Preventista crea pedidos    │
│  - Admin genera rutas          │
└────────────┬───────────────────┘
             │
             │ HTTP POST
             │
             ▼
┌────────────────────────────────┐
│  Microservicio SaaS (Servidor) │
│  /Users/.../v0-micro-saa-s     │
│                                │
│  - POST /api/rutas-inteligentes│
│  - GET /api/rutas-inteligentes/history │
│  - Algoritmo TSP + Google Maps │
└────────────────────────────────┘
```

---

## 🎯 ENDPOINTS DISPONIBLES

### 1️⃣ **POST `/api/rutas-inteligentes`**
Genera ruta optimizada con algoritmo TSP + Google Maps

**Request:**
```json
{
  "locations": [
    {
      "id": "cliente-1",
      "lat": -31.4201,
      "lng": -64.1888,
      "type": "partida",
      "address": "Depósito Central"
    },
    {
      "id": "pedido-001",
      "lat": -31.4173,
      "lng": -64.1833,
      "type": "intermedio",
      "address": "Cliente A"
    },
    {
      "id": "pedido-002",
      "lat": -31.4150,
      "lng": -64.1900,
      "type": "intermedio",
      "address": "Cliente B"
    },
    {
      "id": "deposito",
      "lat": -31.4201,
      "lng": -64.1888,
      "type": "llegada",
      "address": "Volver al depósito"
    }
  ],
  "travelMode": "DRIVING"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [{
      "distance": { "text": "15.2 km", "value": 15200 },
      "duration": { "text": "25 minutos", "value": 1500 },
      "overview_polyline": "encoded_polyline",
      "steps": [...]
    }],
    "optimizedOrder": [
      { "id": "cliente-1", "type": "partida", "lat": -31.4201, "lng": -64.1888 },
      { "id": "pedido-002", "type": "intermedio", "lat": -31.4150, "lng": -64.1900 },
      { "id": "pedido-001", "type": "intermedio", "lat": -31.4173, "lng": -64.1833 },
      { "id": "deposito", "type": "llegada", "lat": -31.4201, "lng": -64.1888 }
    ],
    "googleMapsUrl": "https://www.google.com/maps/dir/..."
  }
}
```

### 2️⃣ **GET `/api/rutas-inteligentes/history`**
Obtiene historial de rutas generadas

**Query params:**
- `limit`: cantidad de registros (default: 50)
- `offset`: paginación (default: 0)
- `sort`: orden ('asc' o 'desc', default: 'desc')

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 🛠️ IMPLEMENTACIÓN

### **Paso 1: Copiar el SDK del microservicio**

```bash
# Desde v0-app-preventista
cp /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s/sdk/rutas-inteligentes-client.ts \
   /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-app-preventista/lib/rutas-inteligentes-client.ts

cp /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s/types/rutas-inteligentes.types.ts \
   /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-app-preventista/lib/types/rutas-inteligentes.types.ts
```

### **Paso 2: Agregar URL del microservicio en .env.local**

```env
# .env.local
NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:** El microservicio debe correr en un puerto diferente (ej: 3000)

---

## 📝 CÓDIGO DE INTEGRACIÓN

### **Archivo: `lib/services/rutasInteligentesService.ts`** (NUEVO)

```typescript
import { RutasInteligentesClient } from '@/lib/rutas-inteligentes-client'
import type { Location } from '@/lib/types/rutas-inteligentes.types'

const API_URL = process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL || 'http://localhost:3000'

// Crear cliente singleton
export const rutasInteligentesClient = new RutasInteligentesClient({
  baseUrl: API_URL,
  timeout: 60000, // 60 segundos (las rutas pueden tardar)
})

/**
 * Genera una ruta optimizada a partir de pedidos
 */
export async function generateRouteFromOrders(orders: any[], startPoint?: { lat: number; lng: number }) {
  try {
    // Punto de partida (depósito por defecto)
    const depot = startPoint || {
      lat: -31.4201,
      lng: -64.1888,
    }

    // Construir array de locations
    const locations: Location[] = [
      {
        id: 'start',
        lat: depot.lat,
        lng: depot.lng,
        type: 'partida',
        address: 'Depósito Central',
      },
    ]

    // Agregar cada pedido como punto intermedio
    for (const order of orders) {
      const customer = order.customers

      // Validar que el cliente tenga coordenadas
      if (!customer.latitude || !customer.longitude) {
        console.warn(`⚠️ Cliente ${customer.commercial_name} sin coordenadas, omitiendo...`)
        continue
      }

      locations.push({
        id: order.id,
        lat: customer.latitude,
        lng: customer.longitude,
        type: 'intermedio',
        address: `${customer.commercial_name} - ${customer.street} ${customer.street_number}`,
      })
    }

    // Punto de llegada (volver al depósito)
    locations.push({
      id: 'end',
      lat: depot.lat,
      lng: depot.lng,
      type: 'llegada',
      address: 'Depósito Central',
    })

    console.log(`🚀 Generando ruta optimizada para ${locations.length - 2} pedidos...`)

    // Llamar al microservicio
    const result = await rutasInteligentesClient.generateRoute({
      locations,
      travelMode: 'DRIVING',
    })

    console.log('✅ Ruta optimizada generada:', {
      distance: result.routes[0].distance.text,
      duration: result.routes[0].duration.text,
      optimizedOrderCount: result.optimizedOrder.length,
    })

    return result
  } catch (error: any) {
    console.error('❌ Error al generar ruta:', error.message)
    throw error
  }
}

/**
 * Obtiene el historial de rutas
 */
export async function getRoutesHistory(limit = 50, offset = 0) {
  try {
    const response = await fetch(
      `${API_URL}/api/rutas-inteligentes/history?limit=${limit}&offset=${offset}`
    )

    if (!response.ok) {
      throw new Error('Error al obtener historial')
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('❌ Error al obtener historial:', error.message)
    throw error
  }
}
```

---

## 🔄 MODIFICAR GENERADOR DE RUTAS

### **Archivo: `components/admin/route-generator-form.tsx`**

```typescript
import { generateRouteFromOrders } from '@/lib/services/rutasInteligentesService'

// ... código existente ...

const handleGenerateRoutes = async () => {
  setIsGenerating(true)
  setError(null)

  try {
    // Filtrar pedidos por zona y fecha (CÓDIGO EXISTENTE)
    const filteredOrders = pendingOrders.filter(
      (order) =>
        order.delivery_date === deliveryDate &&
        (selectedZones.length === 0 || selectedZones.includes(order.customers.zone_id)),
    )

    if (filteredOrders.length === 0) {
      setError("No hay pedidos pendientes para la fecha y zonas seleccionadas")
      setIsGenerating(false)
      return
    }

    // 🆕 FILTRAR SOLO PEDIDOS CON COORDENADAS
    const ordersWithCoordinates = filteredOrders.filter(
      order => order.customers.latitude && order.customers.longitude
    )

    console.log(`✅ ${ordersWithCoordinates.length} pedidos con coordenadas`)
    console.log(`⚠️ ${filteredOrders.length - ordersWithCoordinates.length} pedidos sin coordenadas`)

    if (ordersWithCoordinates.length === 0) {
      setError("Ningún pedido tiene coordenadas guardadas. Registra las ubicaciones de los clientes primero.")
      setIsGenerating(false)
      return
    }

    // 🆕 AGRUPAR POR ZONA
    const ordersByZone: { [key: string]: any[] } = {}

    ordersWithCoordinates.forEach((order) => {
      const zoneId = order.customers.zone_id || "sin_zona"
      if (!ordersByZone[zoneId]) {
        ordersByZone[zoneId] = []
      }
      ordersByZone[zoneId].push(order)
    })

    // 🆕 GENERAR RUTAS OPTIMIZADAS POR ZONA
    const routes: GeneratedRoute[] = []

    for (const [zoneId, orders] of Object.entries(ordersByZone)) {
      const zone = zones.find((z) => z.id === zoneId)
      const zoneName = zone?.name || "Sin Zona"

      console.log(`🔄 Optimizando ruta para zona: ${zoneName}`)

      // 🌟 LLAMAR AL MICROSERVICIO
      try {
        const optimizedRoute = await generateRouteFromOrders(orders)

        // Mapear el orden optimizado de vuelta a los pedidos
        const optimizedOrders = optimizedRoute.optimizedOrder
          .filter(loc => loc.type === 'intermedio') // Solo los puntos intermedios (clientes)
          .map(loc => {
            return orders.find(order => order.id === loc.id)
          })
          .filter(Boolean) // Remover nulls

        routes.push({
          zone: zoneName,
          zoneId: zoneId,
          orders: optimizedOrders,
          totalDistance: optimizedRoute.routes[0].distance.value / 1000, // metros a km
          estimatedDuration: optimizedRoute.routes[0].duration.value / 60, // segundos a minutos
          googleMapsUrl: optimizedRoute.googleMapsUrl,
          optimizedRouteData: optimizedRoute, // 🆕 Guardar data completa
        })

        console.log(`✅ Ruta optimizada para ${zoneName}:`, {
          distance: optimizedRoute.routes[0].distance.text,
          duration: optimizedRoute.routes[0].duration.text,
        })
      } catch (error) {
        console.error(`❌ Error al optimizar ruta para ${zoneName}:`, error)
        setError(`Error al optimizar ruta para ${zoneName}. Intenta nuevamente.`)
        setIsGenerating(false)
        return
      }
    }

    setGeneratedRoutes(routes)
  } catch (err) {
    console.error("[v0] Error generating routes:", err)
    setError(err instanceof Error ? err.message : "Error al generar las rutas")
  } finally {
    setIsGenerating(false)
  }
}
```

---

## 💾 GUARDAR EN BASE DE DATOS

### **Modificar `handleCreateRoutes` en route-generator-form.tsx**

```typescript
const handleCreateRoutes = async () => {
  setIsCreating(true)
  setError(null)

  try {
    const supabase = createClient()

    for (let i = 0; i < generatedRoutes.length; i++) {
      const route = generatedRoutes[i]
      const driverId = routeDrivers[i]

      if (!driverId) {
        setError(`Debe asignar un repartidor a la ruta ${i + 1}`)
        setIsCreating(false)
        return
      }

      // Generate route code
      const { data: routeCodeData } = await supabase.rpc("generate_route_code", {
        route_date: deliveryDate,
      })
      const routeCode = routeCodeData as string

      // 🆕 Guardar ruta con datos REALES del microservicio
      const { data: createdRoute, error: routeError } = await supabase
        .from("routes")
        .insert({
          route_code: routeCode,
          driver_id: driverId,
          zone_id: route.zoneId !== "sin_zona" ? route.zoneId : null,
          scheduled_date: deliveryDate,
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          total_distance: route.totalDistance, // 🆕 Distancia REAL
          estimated_duration: route.estimatedDuration, // 🆕 Duración REAL
          optimized_route: route.optimizedRouteData, // 🆕 Guardar toda la data
          status: "PLANIFICADO",
          created_by: userId,
        })
        .select()
        .single()

      if (routeError) throw routeError

      // 🆕 Crear route_orders en el ORDEN OPTIMIZADO
      for (let j = 0; j < route.orders.length; j++) {
        const order = route.orders[j]

        const { error: routeOrderError } = await supabase.from("route_orders").insert({
          route_id: createdRoute.id,
          order_id: order.id,
          delivery_order: j + 1, // El orden ya está optimizado!
        })

        if (routeOrderError) throw routeOrderError
      }
    }

    router.push("/admin/routes")
    router.refresh()
  } catch (err) {
    console.error("[v0] Error creating routes:", err)
    setError(err instanceof Error ? err.message : "Error al crear las rutas")
  } finally {
    setIsCreating(false)
  }
}
```

---

## 🗺️ VISTA DEL REPARTIDOR

### **Modificar `components/repartidor/delivery-route-view.tsx`**

```typescript
const handleStartRoute = async () => {
  // ... código existente para actualizar estado ...

  // 🆕 Usar la URL de Google Maps optimizada
  if (route.optimized_route?.googleMapsUrl) {
    window.open(route.optimized_route.googleMapsUrl, '_blank')
  } else {
    // Fallback: construir URL manualmente
    const coordinates = route.route_orders
      .sort((a, b) => a.delivery_order - b.delivery_order)
      .map(ro => `${ro.orders.customers.latitude},${ro.orders.customers.longitude}`)
      .join('/')
    
    const googleMapsUrl = `https://www.google.com/maps/dir/${startPoint}/${coordinates}/`
    window.open(googleMapsUrl, '_blank')
  }

  router.refresh()
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Pre-requisitos**
- [ ] Microservicio corriendo en puerto 3000
- [ ] App preventista corriendo en puerto 3001
- [ ] Clientes tienen coordenadas guardadas
- [ ] Variable `NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL` en `.env.local`

### **Fase 1: Setup**
- [ ] Copiar SDK del microservicio
- [ ] Copiar types de rutas inteligentes
- [ ] Crear `lib/services/rutasInteligentesService.ts`
- [ ] Agregar variable de entorno

### **Fase 2: Backend/Lógica**
- [ ] Modificar `handleGenerateRoutes` para usar microservicio
- [ ] Filtrar pedidos sin coordenadas
- [ ] Llamar API por cada zona
- [ ] Guardar `optimized_route` en BD

### **Fase 3: UI**
- [ ] Mostrar distancia/duración reales
- [ ] Indicar pedidos sin coordenadas
- [ ] Agregar link de Google Maps optimizado
- [ ] Mostrar orden optimizado en preview

### **Fase 4: Repartidor**
- [ ] Usar `googleMapsUrl` del microservicio
- [ ] Mostrar ruta en orden optimizado
- [ ] Testing con rutas reales

---

## 🚀 CÓMO PROBARLO

### **1. Levantar el microservicio**
```bash
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s
pnpm dev # Debe correr en puerto 3000
```

### **2. Levantar la app preventista**
```bash
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-app-preventista
pnpm dev # Debe correr en puerto 3001
```

### **3. Probar generación de rutas**
1. Ir a `/admin/routes/generate`
2. Seleccionar fecha y zonas
3. Click en "Calcular Rutas"
4. Ver en consola las llamadas al microservicio
5. Verificar que las distancias son reales (no ficticias)

---

## 🐛 DEBUGGING

### **Error: "Cannot connect to microservicio"**
- Verificar que el microservicio esté corriendo: `http://localhost:3000`
- Verificar `.env.local` tiene la URL correcta

### **Error: "Cliente sin coordenadas"**
- Registrar las coordenadas del cliente en `/preventista/customers/new`
- Verificar en Supabase que `latitude` y `longitude` no sean NULL

### **Error: "Request timeout"**
- El algoritmo puede tardar con muchos puntos (>20)
- Aumentar el timeout en el cliente: `timeout: 120000` (2 minutos)

---

## 📊 VENTAJAS DE ESTA ARQUITECTURA

✅ **Separación de responsabilidades**
- App preventista: gestión de pedidos
- Microservicio: algoritmos complejos de optimización

✅ **Reusabilidad**
- El microservicio puede ser usado por otras apps
- SDK reutilizable

✅ **Escalabilidad**
- Microservicio puede escalar independientemente
- Cache de rutas calculadas

✅ **Mantenibilidad**
- Algoritmo TSP en un solo lugar
- Fácil de actualizar sin tocar la app principal

---

## 🎯 PRÓXIMOS PASOS

¿Quieres que implemente:
1. **Opción A**: Todo el código de integración (automático)
2. **Opción B**: Solo el servicio base y que veas cómo funciona
3. **Opción C**: Primero probar el microservicio standalone

**Recomendación**: Opción B para entender bien el flujo.





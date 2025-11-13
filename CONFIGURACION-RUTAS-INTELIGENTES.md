# ⚙️ Configuración: Rutas Inteligentes

## 📋 RESUMEN DE LA IMPLEMENTACIÓN

✅ **Integración completada con el microservicio de Rutas Inteligentes**  
✅ URL del microservicio: https://v0-micro-saa-s-snowy.vercel.app  
✅ Algoritmo TSP con Google Maps optimiza el orden de entregas  
✅ Distancias y duraciones REALES (no estimaciones)  
✅ Link directo a Google Maps con navegación GPS  

---

## 🔧 CONFIGURACIÓN REQUERIDA

### **1. Variables de Entorno**

Agregar al archivo `.env.local` (si no existe, créalo en la raíz del proyecto):

```bash
# Google Maps API Key (ya existente)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDRsczXb0roqcWOV3EXW9DCMVph0FKzpwY

# Supabase (ya existente)
NEXT_PUBLIC_SUPABASE_URL=https://ojghwcbliucsntrbqvaw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZ2h3Y2JsaXVjc250cmJxdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDAzMzMsImV4cCI6MjA3NjgxNjMzM30.R3PaVfS24LQW4j8J8XmlwOBPFCWo5XQQnQxON_rL9KE

# 🆕 Microservicio de Rutas Inteligentes (NUEVO)
# DESARROLLO LOCAL: Microservicio en puerto 3000
NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL=http://localhost:3000

# PRODUCCIÓN: Usar Vercel
# NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL=https://v0-micro-saa-s-snowy.vercel.app
```

**⚠️ IMPORTANTE:** 
- El archivo `.env.local` NO debe subirse a Git (ya está en `.gitignore`)
- En desarrollo local, el microservicio debe correr en puerto **3000**
- Esta app (preventista) correrá en puerto **3001**

---

## 📦 ARCHIVOS NUEVOS CREADOS

### **1. Tipos TypeScript**
- `lib/types/rutas-inteligentes.types.ts` → Tipos para el microservicio

### **2. Cliente HTTP**
- `lib/services/rutasInteligentesClient.ts` → Cliente para comunicarse con el microservicio

### **3. Servicio de integración**
- `lib/services/rutasInteligentesService.ts` → Adapta pedidos → rutas optimizadas

### **4. Archivos modificados**
- ✅ `components/admin/route-generator-form.tsx` → Usa microservicio para optimizar
- ✅ `components/repartidor/delivery-route-view.tsx` → Abre Google Maps optimizado

---

## 🚀 CÓMO FUNCIONA

### **Flujo completo:**

```
1. PREVENTISTA registra cliente con coordenadas
   ↓ (usando Google Places Autocomplete)
   
2. PREVENTISTA crea pedido para ese cliente
   ↓ (el cliente YA tiene lat/lng guardadas)
   
3. ADMIN genera rutas inteligentes
   ↓
   • Filtra pedidos por fecha/zona
   • Extrae pedidos CON coordenadas
   • Llama al microservicio de Rutas Inteligentes
   • Recibe orden optimizado + distancia + duración
   • Guarda ruta con datos REALES
   ↓
   
4. REPARTIDOR inicia ruta
   ↓
   • Sistema abre Google Maps con URL optimizada
   • Repartidor sigue navegación GPS paso a paso
   • Entrega en el orden óptimo
```

---

## 🎯 PROBAR LA FUNCIONALIDAD

### **Paso 1: Registrar clientes con coordenadas**

1. Ir a `/preventista/customers/new`
2. Usar el autocompletado de Google Places para agregar direcciones
3. O usar el botón "Usar mi ubicación" para obtener GPS actual
4. **Importante:** Asegurarse de que cada cliente tenga `latitude` y `longitude` guardadas

### **Paso 2: Crear pedidos**

1. Ir a `/preventista/orders/new`
2. Seleccionar un cliente (que tenga coordenadas)
3. Agregar productos y crear el pedido
4. Cambiar el estado a `PENDIENTE_ENTREGA` (si aplica)

### **Paso 3: Generar rutas inteligentes**

1. Ir a `/admin/routes/generate`
2. Seleccionar fecha y zonas
3. Click en "Calcular Rutas"
4. **🌟 Magia:** El sistema llama al microservicio y optimiza la ruta automáticamente
5. Ver:
   - ✅ Distancia REAL en km
   - ✅ Duración REAL en minutos
   - ✅ Badge "Optimizada"
   - ✅ Botón "Abrir en Google Maps"
6. Asignar repartidor
7. Click en "Crear Rutas"

### **Paso 4: Repartidor usa la ruta**

1. Ir a `/repartidor/routes/[id]`
2. Click en "Iniciar Ruta"
3. **🌟 Automático:** Se abre Google Maps con la ruta optimizada
4. Repartidor sigue la navegación GPS

---

## 📊 DATOS GUARDADOS EN LA BASE DE DATOS

Cuando se crea una ruta optimizada, se guarda en `routes`:

```sql
{
  route_code: "REC-0001-2024-11-07",
  total_distance: 23.4,  -- ✅ km REALES del microservicio
  estimated_duration: 45, -- ✅ minutos REALES
  optimized_route: {     -- ✅ JSON completo de la ruta
    routes: [...],
    optimizedOrder: [...],
    googleMapsUrl: "https://www.google.com/maps/dir/...",
    stats: {
      ordersWithCoordinates: 5,
      ordersWithoutCoordinates: 0
    }
  }
}
```

Y en `route_orders`, los pedidos están en el **orden optimizado**:

```sql
{
  route_id: "uuid-ruta",
  order_id: "uuid-pedido",
  delivery_order: 1 -- ✅ Orden optimizado por el algoritmo TSP
}
```

---

## 🐛 TROUBLESHOOTING

### **Error: "Ningún pedido tiene coordenadas guardadas"**

**Causa:** Los clientes no tienen `latitude` y `longitude` en la base de datos.

**Solución:**
1. Ir a la tabla `customers` en Supabase
2. Verificar que los clientes tengan valores en `latitude` y `longitude`
3. Si no tienen, registrarlos nuevamente con el formulario de nuevo cliente

### **Error: "No se pudo conectar con el microservicio"**

**Causa:** El microservicio puede estar inactivo o hay problemas de red.

**Solución:**
1. Verificar que la URL esté correcta: https://v0-micro-saa-s-snowy.vercel.app
2. Abrir la URL en el navegador para verificar que responda
3. Revisar la consola del navegador para ver el error específico

### **Error: "La ubicación está fuera de Argentina"**

**Causa:** El microservicio solo acepta coordenadas dentro de Argentina.

**Solución:**
1. Verificar que las coordenadas sean correctas
2. Asegurarse de usar el autocompletado de Google Places
3. Validar en Supabase que `latitude` esté entre -55 y -21, y `longitude` entre -74 y -53

### **Warning: "X pedidos omitidos por no tener coordenadas"**

**Causa:** Algunos pedidos no tienen coordenadas.

**Solución:**
- Los pedidos sin coordenadas se omitirán automáticamente
- No afecta la generación de rutas
- Registrar las coordenadas de esos clientes para incluirlos en futuras rutas

---

## 📈 VENTAJAS DEL SISTEMA

### **Antes (sin microservicio):**
❌ Distancia estimada (ficticia): `pedidos * 2.5 km`  
❌ Duración estimada (ficticia): `pedidos * 15 min`  
❌ Sin optimización de orden  
❌ Repartidor decide el orden manualmente  

### **Ahora (con microservicio):**
✅ Distancia REAL calculada por Google Maps  
✅ Duración REAL considerando tráfico y rutas  
✅ Orden optimizado con algoritmo TSP  
✅ Ahorro de combustible y tiempo  
✅ Link directo a Google Maps con navegación GPS  
✅ Historial de rutas en el microservicio  

---

## 🔗 ENLACES ÚTILES

- **Microservicio (producción):** https://v0-micro-saa-s-snowy.vercel.app
- **Dashboard de Rutas (microservicio):** https://v0-micro-saa-s-snowy.vercel.app/rutas-inteligentes
- **Documentación del API:** Ver `API_CONTRACT_RUTAS_INTELIGENTES.md` en el microservicio
- **Código fuente del microservicio:** `/Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s`

---

## ✅ CHECKLIST FINAL

- [x] Tipos TypeScript creados
- [x] Cliente HTTP implementado
- [x] Servicio de integración creado
- [x] Generador de rutas modificado
- [x] Vista del repartidor actualizada
- [x] Variables de entorno documentadas
- [ ] **TODO:** Agregar variable en `.env.local` localmente
- [ ] **TODO:** Agregar variable en Vercel (producción)
- [ ] **TODO:** Probar con datos reales

---

## 🎉 ¡LISTO!

El sistema está completamente integrado y listo para usar. Cuando generes rutas, el admin verá:

- 📏 Distancia real en km
- ⏱️ Duración real en minutos
- 🗺️ Botón "Abrir en Google Maps"
- ✅ Badge "Optimizada"

Y el repartidor recibirá navegación GPS optimizada automáticamente.

**¿Dudas?** Revisa los logs en la consola del navegador para ver el flujo completo.


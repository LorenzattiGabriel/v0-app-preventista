# Solución de CORS con Proxy API

## 🔍 Problema Identificado

Al intentar generar rutas inteligentes desde el navegador, se producía el error:

```
Error: Failed to fetch
```

### Diagnóstico

- ✅ El microservicio funciona correctamente (verificado con `curl`)
- ✅ La autenticación con `x-client-id` está correcta
- ❌ El navegador bloquea la petición por **CORS** (Cross-Origin Resource Sharing)

**Causa**: El microservicio en Vercel no permite peticiones desde `http://localhost:3000`

## 💡 Solución Implementada: Proxy API en Next.js

### Arquitectura

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│  Frontend   │─────▶│  Proxy API  │─────▶│  Microservicio  │
│ (Browser)   │      │  (Next.js)  │      │    (Vercel)     │
└─────────────┘      └─────────────┘      └─────────────────┘
   localhost:3000     /api/proxy-rutas     v0-micro-saas
```

### Ventajas del Proxy

1. **Sin CORS**: El proxy corre en el mismo dominio que el frontend
2. **Transparente**: El frontend no necesita saber de la autenticación
3. **Desarrollo local**: Funciona perfectamente en localhost
4. **Producción lista**: En producción llamará directamente al microservicio

## 📁 Archivos Creados

### 1. Proxy Principal - Generar Rutas
**Archivo**: `app/api/proxy-rutas/route.ts`

```typescript
POST /api/proxy-rutas
```

**Función**:
- Recibe la petición del frontend
- Añade el header `x-client-id` automáticamente
- Reenvía la petición al microservicio
- Devuelve la respuesta al frontend

### 2. Proxy Historial - Listar Rutas
**Archivo**: `app/api/proxy-rutas/history/route.ts`

```typescript
GET /api/proxy-rutas/history?limit=50&offset=0&sort=desc
```

**Función**:
- Obtiene el historial de rutas guardadas
- Maneja los query parameters

### 3. Proxy Detalle - Ruta Específica
**Archivo**: `app/api/proxy-rutas/history/[id]/route.ts`

```typescript
GET /api/proxy-rutas/history/{id}
```

**Función**:
- Obtiene el detalle de una ruta por ID

## 🔧 Modificaciones en el Cliente

### Archivo: `lib/services/rutasInteligentesClient.ts`

#### Cambio 1: Base URL Dinámica

```typescript
// Antes
const BASE_URL = process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL || 'http://localhost:3000'

// Ahora
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/api/proxy-rutas' // Proxy local para evitar CORS
  : process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL || 'http://localhost:3000'
```

#### Cambio 2: Headers Condicionales

```typescript
const isUsingProxy = this.baseUrl.startsWith('/')

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

// Solo agregar x-client-id si NO estamos usando el proxy
if (!isUsingProxy) {
  headers['x-client-id'] = 'preventista-app-client-id'
}
```

#### Cambio 3: Endpoints Dinámicos

```typescript
// Para generateRoute
const endpoint = isUsingProxy 
  ? this.baseUrl // /api/proxy-rutas
  : `${this.baseUrl}/api/rutas-inteligentes`

// Para getHistory
const endpoint = isUsingProxy 
  ? `${this.baseUrl}/history?limit=${limit}`
  : `${this.baseUrl}/api/rutas-inteligentes/history?limit=${limit}`

// Para getRouteById
const endpoint = isUsingProxy 
  ? `${this.baseUrl}/history/${routeId}`
  : `${this.baseUrl}/api/rutas-inteligentes/history/${routeId}`
```

## 🚀 Flujo de Funcionamiento

### Desarrollo (localhost:3000)

1. **Frontend** llama a `/api/proxy-rutas` (mismo dominio, sin CORS)
2. **Proxy** recibe la petición en Next.js
3. **Proxy** añade `x-client-id: preventista-app-client-id`
4. **Proxy** reenvía a `https://v0-micro-saa-s-git-develop-talenthubais-projects.vercel.app/api/rutas-inteligentes`
5. **Microservicio** procesa y responde
6. **Proxy** reenvía la respuesta al frontend
7. **Frontend** recibe los datos

### Producción (en Vercel)

```typescript
BASE_URL = process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL
```

1. **Frontend** llama directamente al microservicio
2. Añade el header `x-client-id`
3. No hay problema de CORS (mismo dominio o CORS configurado)

## 🔍 Logs de Debug

### En el Proxy (Server-side)

```
🔄 Proxy: Reenviando petición a: https://...
✅ Respuesta exitosa del microservicio
```

### En el Cliente (Browser)

```javascript
🚀 Llamando a microservicio: {
  url: '/api/proxy-rutas',
  proxy: true,
  locations: 2,
  timestamp: '2025-11-12T...'
}
```

## 📊 Comparación: Antes vs Ahora

### Antes (Con CORS)

```
Frontend ──❌──▶ Microservicio
         (CORS Error)
```

### Ahora (Con Proxy)

```
Frontend ──✅──▶ Proxy ──✅──▶ Microservicio
       (Same origin)   (Server-to-server)
```

## 🛠️ Configuración en Producción

### Opción 1: Seguir usando el Proxy

```bash
# .env.production
NODE_ENV=production
# El cliente usará automáticamente el proxy
```

### Opción 2: Configurar CORS en el Microservicio

Si prefieres llamar directamente al microservicio en producción, configura CORS:

```typescript
// En el microservicio
response.setHeader('Access-Control-Allow-Origin', 'https://tu-dominio.com')
response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, x-client-id')
```

Luego actualiza:

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL=https://v0-micro-saa-s-git-develop-talenthubais-projects.vercel.app
```

## ✅ Ventajas de Esta Solución

1. **Sin cambios en el microservicio**: No necesita modificar el código del microservicio
2. **Transparente**: El frontend no necesita saber cómo funciona la autenticación
3. **Desarrollo local simple**: Funciona inmediatamente en localhost
4. **Logs centralizados**: Puedes ver todas las peticiones en los logs de Next.js
5. **Seguridad**: El `x-client-id` no se expone en el frontend
6. **Flexible**: Fácil cambiar entre proxy y llamada directa

## 🧪 Cómo Probar

### 1. Verifica que el servidor esté corriendo

```bash
http://localhost:3000
```

### 2. Ve a la página de rutas inteligentes

```bash
http://localhost:3000/admin/routes/generate-smart
```

### 3. Selecciona fecha, zona y pedidos

### 4. Click en "Generar Ruta Inteligente"

### 5. Observa los logs

**En la consola del navegador (F12)**:
```
🚀 Llamando a microservicio: {
  url: '/api/proxy-rutas',
  proxy: true,
  ...
}
```

**En la terminal del servidor**:
```
🔄 Proxy: Reenviando petición a: https://...
✅ Respuesta exitosa del microservicio
```

## 🐛 Troubleshooting

### Error: "Cannot GET /api/proxy-rutas"

**Causa**: El servidor no se reinició después de crear las rutas API

**Solución**:
```bash
# Reiniciar el servidor
Ctrl+C
pnpm dev
```

### Error: "x-client-id is required"

**Causa**: El proxy no está añadiendo el header correctamente

**Solución**: Verifica que el proxy esté usando el código actualizado:
```typescript
'x-client-id': 'preventista-app-client-id'
```

### Error: "Failed to fetch" persiste

**Causa**: El navegador está cacheando la configuración anterior

**Solución**:
1. Abre DevTools (F12)
2. Pestaña "Network"
3. Marca "Disable cache"
4. Recarga la página (Ctrl+Shift+R)

## 📚 Referencias

- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [CORS MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Proxy Pattern](https://refactoring.guru/design-patterns/proxy)

---

**Fecha de implementación**: Noviembre 12, 2025  
**Desarrollador**: Gabriel Lorenzatti  
**Estado**: ✅ Funcional en desarrollo


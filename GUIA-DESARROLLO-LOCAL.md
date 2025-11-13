# 🚀 Guía: Desarrollo Local - Rutas Inteligentes

## 📋 ARQUITECTURA LOCAL

```
┌─────────────────────────────────────┐
│  App Preventista (Cliente)         │
│  Puerto: 3001                       │
│  http://localhost:3001              │
│                                     │
│  - Admin genera rutas               │
│  - Repartidor ve rutas              │
└──────────────┬──────────────────────┘
               │
               │ HTTP POST
               │
               ▼
┌─────────────────────────────────────┐
│  Microservicio SaaS (Servidor)     │
│  Puerto: 3000                       │
│  http://localhost:3000              │
│                                     │
│  - POST /api/rutas-inteligentes    │
│  - Algoritmo TSP                    │
│  - Google Maps APIs                 │
└─────────────────────────────────────┘
```

---

## 🛠️ SETUP INICIAL

### **Paso 1: Preparar el Microservicio**

```bash
# Terminal 1: Microservicio en puerto 3000
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s

# Instalar dependencias (si no están)
pnpm install

# Levantar en puerto 3000 (default)
pnpm dev
```

**Verificar que esté corriendo:**
```bash
# Debería ver:
# ▲ Next.js 16.0.0
# - Local:        http://localhost:3000
```

**Probar el endpoint:**
```bash
curl http://localhost:3000/api/rutas-inteligentes
# Debería responder (aunque sea con error por falta de body)
```

---

### **Paso 2: Configurar App Preventista**

```bash
# Terminal 2: App Preventista en puerto 3001
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-app-preventista

# Crear .env.local (si no existe)
cp .env.local.example .env.local
```

**Editar `.env.local`:**
```bash
# Asegurarse de que tenga:
NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL=http://localhost:3000

# Y las otras variables:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDRsczXb0roqcWOV3EXW9DCMVph0FKzpwY
NEXT_PUBLIC_SUPABASE_URL=https://ojghwcbliucsntrbqvaw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### **Paso 3: Levantar App Preventista**

```bash
# En la misma terminal (Terminal 2)
pnpm dev
```

**Verificar que esté en puerto 3001:**
```bash
# Si el puerto 3000 está ocupado, Next.js automáticamente usa 3001:
# ⚠ Port 3000 is in use, using available port 3001 instead.
# ▲ Next.js 16.0.0
# - Local:        http://localhost:3001
```

---

## ✅ VERIFICAR QUE TODO FUNCIONE

### **1. Verificar microservicio**
```bash
# Abrir en navegador:
http://localhost:3000

# Deberías ver el dashboard del microSaaS
```

### **2. Verificar app preventista**
```bash
# Abrir en navegador:
http://localhost:3001

# Deberías ver la app de preventistas
```

### **3. Verificar comunicación**

Ir a: http://localhost:3001/admin/routes/generate

1. Seleccionar fecha y zona
2. Click "Calcular Rutas"
3. **Abrir la consola del navegador (F12)**
4. Buscar logs:
   ```
   🚀 Iniciando generación de rutas inteligentes...
   🚀 Llamando a microservicio: http://localhost:3000/api/rutas-inteligentes
   ✅ Ruta optimizada generada
   ```

**Si hay error de conexión:**
```bash
❌ Error: Failed to fetch
# Verificar que el microservicio esté corriendo en puerto 3000
```

---

## 🐛 TROUBLESHOOTING

### **Error: "Port 3000 is already in use"**

**Causa:** Otro proceso está usando el puerto 3000.

**Solución:**
```bash
# Matar el proceso en el puerto 3000
lsof -ti:3000 | xargs kill -9

# Volver a levantar el microservicio
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s
pnpm dev
```

### **Error: "Failed to fetch"**

**Causa:** El microservicio no está corriendo.

**Solución:**
```bash
# Terminal 1: Verificar que esté corriendo
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s
pnpm dev

# Verificar en el navegador: http://localhost:3000
```

### **Error: "CORS policy: No 'Access-Control-Allow-Origin'"**

**Causa:** Problema de CORS entre localhost:3001 y localhost:3000.

**Solución:** El microservicio Next.js debería permitir CORS automáticamente en desarrollo. Si persiste:

```typescript
// En v0-micro-saa-s/next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        ],
      },
    ]
  },
}
```

### **Error: "Cannot find module '@/lib/services/rutasInteligentesClient'"**

**Causa:** Los archivos nuevos no están creados.

**Solución:**
```bash
# Verificar que existan los archivos:
ls lib/services/rutasInteligentesClient.ts
ls lib/services/rutasInteligentesService.ts
ls lib/types/rutas-inteligentes.types.ts

# Si no existen, revisar que se hayan creado correctamente
```

---

## 📊 FLUJO DE DESARROLLO

### **Workflow típico:**

1. **Levantar microservicio** (Terminal 1)
   ```bash
   cd v0-micro-saa-s
   pnpm dev
   # Puerto 3000
   ```

2. **Levantar app preventista** (Terminal 2)
   ```bash
   cd v0-app-preventista
   pnpm dev
   # Puerto 3001
   ```

3. **Hacer cambios** en cualquiera de los dos

4. **Hot reload** automático en ambos

5. **Ver logs** en ambas consolas

---

## 🔄 REINICIAR TODO

Si algo no funciona, reiniciar ambos servicios:

```bash
# Terminal 1: Microservicio
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-micro-saa-s
# Ctrl+C para detener
pnpm dev

# Terminal 2: App Preventista
cd /Users/gabriellorenzatti/Documents/GitHub_Gabi/v0-app-preventista
# Ctrl+C para detener
pnpm dev
```

---

## 📝 LOGS ÚTILES

### **Microservicio (Terminal 1):**
```
📥 REQUEST RECIBIDO EN /api/rutas-inteligentes: { ... }
🧪 Validando ubicaciones...
🔄 Generando ruta optimizada...
✅ RUTA GENERADA EN EL SERVIDOR: { ... }
```

### **App Preventista (Terminal 2):**
```
🚀 Iniciando generación de rutas inteligentes...
📦 5 pedidos filtrados
✅ 5 con coordenadas
🔄 Optimizando ruta para zona: Centro
🚀 Llamando a microservicio: http://localhost:3000/api/rutas-inteligentes
📥 Respuesta del microservicio: { success: true, ... }
✅ Ruta optimizada para Centro: 23.4 km, 42 min
```

---

## 🎯 CHECKLIST DE DESARROLLO

Antes de empezar a trabajar:

- [ ] Microservicio corriendo en puerto 3000
- [ ] App preventista corriendo en puerto 3001
- [ ] `.env.local` configurado con `http://localhost:3000`
- [ ] Ambos servicios responden en el navegador
- [ ] No hay errores en ninguna de las consolas
- [ ] Clientes tienen coordenadas en Supabase
- [ ] Pedidos están en estado `PENDIENTE_ENTREGA`

---

## 🚀 DEPLOYMENT A PRODUCCIÓN

Cuando esté listo para producción:

1. **Cambiar `.env.local` a producción:**
   ```bash
   NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL=https://v0-micro-saa-s-snowy.vercel.app
   ```

2. **O mejor: Configurar en Vercel:**
   - Settings → Environment Variables
   - Key: `NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL`
   - Value: `https://v0-micro-saa-s-snowy.vercel.app`

3. **Push a GitHub y deployar**

---

## 📞 CONTACTO

Si tienes problemas:
1. Revisar los logs en ambas consolas
2. Verificar que ambos servicios estén corriendo
3. Probar los endpoints manualmente con curl
4. Verificar variables de entorno

¡Listo para desarrollar! 🎉





# Guía de Rutas Inteligentes

## Descripción General

El módulo de **Rutas Inteligentes** permite generar rutas optimizadas de entrega utilizando un microservicio que implementa algoritmos de optimización (TSP - Traveling Salesman Problem). Esta funcionalidad está diseñada específicamente para optimizar las entregas en Córdoba.

## Características

✅ **Selección Manual de Pedidos**: Elige manualmente qué pedidos incluir en la ruta por zona
✅ **Optimización Automática**: El microservicio optimiza el orden de entrega automáticamente
✅ **Cálculo de Costos**: Estima costos de combustible y conductor
✅ **Google Maps Integration**: Link directo para navegación GPS
✅ **Punto Fijo**: Partida y llegada desde el mismo punto (Córdoba)

## Acceso

**URL**: http://localhost:3001/admin/routes/generate-smart (desarrollo)

**Rol requerido**: Administrativo

## Flujo de Uso

### 1. Selección de Pedidos

1. Selecciona la **Fecha de Entrega**
2. Selecciona la **Zona**
3. Aparecerán todos los pedidos con coordenadas guardadas para esa zona y fecha
4. Selecciona manualmente los pedidos que quieres incluir en la ruta
   - Puedes usar "Seleccionar todos" o elegir individualmente

### 2. Configuración de Costos

1. **Tipo de Vehículo**: Selecciona el tipo de vehículo que se usará
   - Auto Pequeño (14 km/l)
   - Auto Mediano (12 km/l)
   - Auto Grande (10 km/l)
   - SUV Compacta (11 km/l)
   - SUV Grande (9 km/l)
   - Pickup (10 km/l)
   - Vehículo Comercial (8 km/l)
   - Motocicleta (30 km/l)

2. **Tipo de Combustible**: Selecciona el tipo de combustible
   - Nafta Súper
   - Nafta Premium
   - Gasoil / Diesel
   - GNC

3. **Sueldo del Conductor** (OPCIONAL): Ingresa el sueldo mensual del conductor
   - Si lo ingresas, se calculará el costo por hora del conductor
   - Si lo dejas vacío, solo se calculará el costo de combustible

### 3. Generación de Ruta

1. Click en **"Generar Ruta Inteligente"**
2. El sistema:
   - Usa como punto de partida: Córdoba (-31.4190387, -64.1884742)
   - Agrega las coordenadas de cada cliente como puntos intermedios
   - Usa como punto de llegada: Córdoba (mismo punto de partida)
   - Llama al microservicio para optimizar la ruta
   - Calcula costos (si configuraste vehículo y combustible)

### 4. Resultado de la Ruta

Una vez generada, verás:

#### Información General
- **Link de Google Maps**: Abre la ruta optimizada en Google Maps para navegación
- **Distancia Total**: En kilómetros
- **Duración Estimada**: En minutos

#### Costos (si configuraste los parámetros)
- **Costo Total Estimado**: Suma de combustible + conductor
- **Costo de Combustible**: Con desglose de litros y precio por litro
- **Costo de Conductor**: Con desglose de horas y tarifa por hora

#### Orden Optimizado
Lista de entregas en el orden calculado por el algoritmo de optimización:
1. 📍 Partida: Córdoba
2. Clientes (en orden optimizado)
3. 🏁 Llegada: Córdoba

### 5. Asignación y Creación

1. Selecciona un **Repartidor** de la lista
2. Click en **"Crear y Asignar Ruta"**
3. La ruta se guarda en la base de datos con:
   - Distancia real
   - Duración real
   - Orden optimizado
   - Datos completos de la optimización
   - Pedidos cambian a estado `ASIGNADO`

## Configuración Técnica

### Coordenadas de Córdoba

Por defecto, el punto de partida y llegada está hardcodeado en:
- **Latitud**: -31.4190387
- **Longitud**: -64.1884742

Si necesitas cambiar esto, modifica el archivo:
`components/admin/smart-route-generator.tsx` (línea 19)

### Microservicio

El microservicio de rutas inteligentes está configurado en:
- **Desarrollo**: http://localhost:3000 (si corre local)
- **Producción**: https://v0-micro-saa-qfkf7cjso-talenthubais-projects.vercel.app

Variable de entorno: `NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL`

## Requisitos

⚠️ **IMPORTANTE**: Para que un pedido aparezca en la lista, el cliente debe tener:
1. `latitude` guardada en la base de datos
2. `longitude` guardada en la base de datos

Los preventistas deben usar Google Places Autocomplete o el botón "Usar mi ubicación" al crear clientes para guardar las coordenadas.

## Algoritmo de Optimización

El microservicio utiliza una combinación de algoritmos:
1. **Nearest Neighbor**: Para ruta inicial
2. **2-opt**: Para optimización local
3. **Google Maps Directions API**: Para distancias y tiempos reales

El resultado es una ruta que minimiza la distancia total de recorrido.

## Cálculo de Costos

### Combustible
```
litros_necesarios = distancia_km / consumo_vehiculo
costo_combustible = litros_necesarios * precio_combustible
```

### Conductor
```
horas_trabajo = duracion_minutos / 60
tarifa_por_hora = sueldo_mensual / 160 (horas mensuales)
costo_conductor = horas_trabajo * tarifa_por_hora
```

Los precios de combustible se obtienen de una API externa y varían por localidad.

## Preguntas Frecuentes

**P: ¿Por qué algunos pedidos no aparecen?**
R: Solo se muestran pedidos cuyos clientes tienen coordenadas guardadas. Los preventistas deben registrar la ubicación al crear el cliente.

**P: ¿Puedo cambiar el punto de partida?**
R: Sí, puedes modificarlo en el código fuente del componente `smart-route-generator.tsx`.

**P: ¿Es obligatorio calcular los costos?**
R: No, los cálculos de costos son opcionales. Solo necesitas seleccionar vehículo y combustible si quieres ver los costos.

**P: ¿El orden de entrega es fijo?**
R: Una vez generada la ruta, el orden es el optimizado por el algoritmo. Los repartidores pueden verlo en la app.

## Comparación con Generación Automática

| Característica | Generación Automática (Vieja) | Rutas Inteligentes (Nueva) |
|---------------|-------------------------------|----------------------------|
| Selección de pedidos | Automática por zona | Manual, selección individual |
| Optimización | Básica (por zona) | Avanzada (algoritmo TSP) |
| Costos | No | Sí (combustible + conductor) |
| Google Maps | Link estático | Link optimizado con waypoints |
| Punto de partida | Configurable | Fijo (Córdoba) |
| Múltiples rutas | Sí | Una ruta a la vez |

## Soporte

Si tienes problemas:
1. Verifica que el microservicio esté corriendo
2. Verifica que la variable `NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL` esté configurada
3. Revisa los logs de la consola del navegador
4. Verifica que los clientes tengan coordenadas guardadas



# 📊 Manual de Usuario - Rol Administrativo (Admin)

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Panel Administrativo (Dashboard)](#3-panel-administrativo-dashboard)
4. [Gestión de Rutas](#4-gestión-de-rutas)
   - [Generar Rutas Inteligentes](#41-generar-rutas-inteligentes)
   - [Ver Historial de Rutas](#42-ver-historial-de-rutas)
5. [Gestión de Pedidos](#5-gestión-de-pedidos)
6. [Gestión de Productos](#6-gestión-de-productos)
7. [Gestión de Usuarios](#7-gestión-de-usuarios)
8. [Gestión de Clientes](#8-gestión-de-clientes)
9. [Reportes y Estadísticas](#9-reportes-y-estadísticas)
10. [Configuración](#10-configuración)
    - [Configuración de Distribuidora](#101-configuración-de-distribuidora)
11. [Flujo de Trabajo Recomendado](#11-flujo-de-trabajo-recomendado)
12. [Preguntas Frecuentes](#12-preguntas-frecuentes)

---

## 1. Introducción

El **Administrativo** (Admin) es el rol con mayor nivel de acceso y control sobre el sistema. Sus principales responsabilidades son:

- ✅ Supervisar todas las operaciones del sistema
- ✅ Generar y gestionar rutas de entrega optimizadas
- ✅ Administrar usuarios, clientes y productos
- ✅ Monitorear pedidos en todos los estados
- ✅ Generar y analizar reportes
- ✅ Configurar parámetros del sistema

### Visión General del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    PANEL ADMINISTRATIVO                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  RUTAS   │  │ PEDIDOS  │  │PRODUCTOS │  │ USUARIOS │       │
│  │  📍      │  │  📦      │  │   📋     │  │   👥     │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │              │
│       ▼             ▼             ▼             ▼              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ CLIENTES │  │REPORTES  │  │CONFIGURAR│  │MÉTRICAS  │       │
│  │   🏪     │  │   📊     │  │    ⚙️    │  │   📈     │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Abra su navegador web y acceda a la URL del sistema
2. Ingrese su **email** y **contraseña**
3. Haga clic en **"Iniciar Sesión"**
4. Será redirigido automáticamente al **Panel Administrativo**

### 2.2 Cerrar Sesión

1. En la esquina superior derecha, haga clic en **"Cerrar Sesión"**

---

## 3. Panel Administrativo (Dashboard)

El Dashboard es su centro de control principal con acceso a todas las funciones.

### 3.1 Tarjetas de Resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Total Pedidos** | Cantidad total de pedidos en el sistema |
| **Pendientes Entrega** | Pedidos armados listos para repartir |
| **Entregas Mañana** | Pedidos programados para el día siguiente |
| **Rutas Hoy** | Cantidad de rutas activas hoy |
| **Clientes** | Total de clientes registrados |
| **Repartidores** | Repartidores activos en el sistema |

### 3.2 Accesos Rápidos

El Dashboard incluye tarjetas con accesos directos a:

| Sección | Acciones Disponibles |
|---------|---------------------|
| **Gestión de Rutas** | Generar Rutas Inteligentes, Ver Todas las Rutas |
| **Gestión de Pedidos** | Ver Todos los Pedidos, Pedidos Pendientes |
| **Reportes** | Ver Reportes y Estadísticas |
| **Productos** | Ver Catálogo de Productos |
| **Usuarios** | Ver Usuarios, Ver Clientes |
| **Configuración** | Punto Base / Distribuidora |

### 3.3 Métricas de Satisfacción

El Dashboard incluye métricas de calificaciones de clientes:
- Filtrar por rango de fechas
- Ver promedio de calificaciones
- Analizar tendencias de satisfacción

---

## 4. Gestión de Rutas

### 4.1 Generar Rutas Inteligentes

La funcionalidad más potente del sistema permite crear rutas optimizadas automáticamente.

#### Acceder al Generador

1. En el Dashboard, haga clic en **"Generar Rutas Inteligentes"**
2. O navegue a: `Admin > Rutas > Generar Nueva Ruta`

#### Paso 1: Configurar Parámetros

**Selección de Pedidos:**

| Campo | Descripción |
|-------|-------------|
| **Fecha de Entrega** | Fecha para la cual generar la ruta |
| **Hora Inicio** | Hora programada para comenzar la ruta |
| **Tiempo por Entrega** | Minutos promedio por cada entrega (default: 10) |
| **Zona** | Filtrar por zona específica o "Todas las zonas" |

**Selección de Pedidos:**

1. Se muestran los pedidos disponibles (estado `PENDIENTE_ENTREGA`)
2. Cada tarjeta muestra:
   - Número de pedido
   - Cliente y dirección
   - Monto del pedido
   - Zona del cliente
3. Puede seleccionar pedidos individualmente o usar **"Seleccionar todos"**

> ⚠️ **Importante**: Solo se muestran pedidos con coordenadas geográficas válidas.

#### Paso 2: Configurar Costos (Opcional)

| Campo | Descripción |
|-------|-------------|
| **Tipo de Vehículo** | Selecciona el vehículo (afecta consumo) |
| **Tipo de Combustible** | Nafta, Gasoil, GNC, etc. |
| **Sueldo del Conductor** | Opcional - para calcular costo de mano de obra |

**Tipos de Vehículo Disponibles:**
- Auto chico (12 km/l)
- Auto mediano (10 km/l)
- Utilitario comercial (8 km/l)
- Camioneta (7 km/l)
- Camión liviano (5 km/l)

#### Paso 3: Generar Ruta

1. Haga clic en **"Generar Ruta Inteligente"**
2. El sistema:
   - Envía los pedidos al microservicio de optimización
   - Calcula la ruta más eficiente (TSP - Problema del Viajante)
   - Retorna distancia, tiempo y orden optimizado
3. Se muestra el resultado en la pestaña **"Resultado"**

#### Resultado de la Generación

| Información | Descripción |
|-------------|-------------|
| **Mapa** | Vista previa del recorrido embebido |
| **Distancia Total** | Kilómetros totales de la ruta |
| **Duración Total** | Tiempo estimado (Google Maps + tiempo entregas) |
| **Costo Estimado** | Combustible + conductor (si se configuró) |
| **Orden Optimizado** | Lista de paradas en orden óptimo |
| **Link Google Maps** | Botón para abrir la ruta en Google Maps |

#### Paso 4: Asignar Repartidor y Crear

1. En la sección **"Asignar Repartidor"**
2. Seleccione un repartidor activo del listado
3. Haga clic en **"Crear y Asignar Ruta"**
4. La ruta se crea con estado `PLANIFICADO`
5. Los pedidos cambian a estado `EN_REPARTICION`

### 4.2 Ver Historial de Rutas

#### Acceder al Historial

1. En el Dashboard, haga clic en **"Ver Todas las Rutas"**
2. O navegue a: `Admin > Rutas`

#### Información por Ruta

| Campo | Descripción |
|-------|-------------|
| **Código** | Identificador único (ej: `RUT-00001`) |
| **Estado** | PLANIFICADO, EN_CURSO, COMPLETADO, CANCELADO |
| **Repartidor** | Nombre del conductor asignado |
| **Zona** | Área geográfica |
| **Fecha** | Fecha programada |
| **Pedidos** | Cantidad de entregas |
| **Distancia** | Kilómetros totales |
| **Duración** | Tiempo estimado |

#### Acciones Disponibles

- **Ver Detalles**: Información completa de la ruta
- **Generar Nueva Ruta**: Acceso rápido al generador

---

## 5. Gestión de Pedidos

### Acceder a Pedidos

1. En el Dashboard, haga clic en **"Ver Todos los Pedidos"**
2. O navegue a: `Admin > Pedidos`

### Tarjetas de Resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Total Pedidos** | Cantidad total |
| **Pendientes Armado** | Esperando ser armados |
| **Listos Entrega** | Armados y listos |
| **Entregados** | Completados exitosamente |

### Filtros Disponibles

| Filtro | Opciones |
|--------|----------|
| **Estado** | Borrador, Pendiente Armado, En Armado, Pendiente Entrega, En Repartición, Entregado, Cancelado |
| **Prioridad** | Urgente, Alta, Media, Normal, Baja |
| **Búsqueda** | Por número de pedido, cliente |

### Información por Pedido

Cada tarjeta de pedido muestra:
- Número de pedido
- Cliente
- Estado actual (con badge de color)
- Prioridad
- Fecha de entrega
- Monto total

### Acciones por Pedido

- **Ver Detalles**: Información completa
- **Cancelar Pedido**: Solo si no está en ruta (aparece en detalle)

---

## 6. Gestión de Productos

### Acceder a Productos

1. En el Dashboard, haga clic en **"Ver Productos"**
2. O navegue a: `Admin > Productos`

### Dashboard de Productos

| Tarjeta | Descripción |
|---------|-------------|
| **Total Productos** | Cantidad en el catálogo |
| **Activos** | Productos disponibles para venta |
| **Sin Stock** | Productos con stock = 0 |
| **Stock Bajo** | Productos bajo mínimo |
| **Categorías** | Cantidad de categorías |

### Filtros Disponibles

| Filtro | Descripción |
|--------|-------------|
| **Búsqueda** | Por nombre, código, marca |
| **Categoría** | Filtrar por categoría |
| **Estado** | Activo / Inactivo |
| **Stock Bajo** | Solo productos con stock bajo |

### Acciones de Productos

| Acción | Descripción |
|--------|-------------|
| **Nuevo Producto** | Crear un nuevo producto |
| **Editar** | Modificar datos del producto |
| **Eliminar** | Dar de baja el producto |

### Campos del Producto

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Código** | ✅ | Código único del producto |
| **Nombre** | ✅ | Nombre del producto |
| **Marca** | ❌ | Marca o fabricante |
| **Categoría** | ✅ | Categoría del producto |
| **Precio** | ✅ | Precio de venta |
| **Stock Actual** | ✅ | Cantidad disponible |
| **Stock Mínimo** | ❌ | Cantidad mínima para alertas |
| **Descripción** | ❌ | Descripción detallada |
| **Es Activo** | ✅ | Si está disponible para venta |

---

## 7. Gestión de Usuarios

### Acceder a Usuarios

1. En el Dashboard, haga clic en **"Ver Usuarios"**
2. O navegue a: `Admin > Usuarios`

### Dashboard de Usuarios

| Tarjeta | Descripción |
|---------|-------------|
| **Total Usuarios** | Cantidad total |
| **Usuarios Activos** | Usuarios habilitados |
| **Administrativos** | Cantidad de admins |

### Filtros Disponibles

| Filtro | Descripción |
|--------|-------------|
| **Rol** | Filtrar por rol específico |
| **Búsqueda** | Por nombre o email |
| **Estado** | Activo / Inactivo |

### Roles Disponibles

| Rol | Descripción |
|-----|-------------|
| **administrativo** | Acceso completo al sistema |
| **preventista** | Gestiona clientes y crea pedidos |
| **encargado_armado** | Arma los pedidos |
| **repartidor** | Entrega los pedidos |
| **cliente** | Acceso limitado a sus pedidos |

### Crear Nuevo Usuario

1. Haga clic en **"Nuevo Usuario"**
2. Complete los campos:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Email** | ✅ | Email único del usuario |
| **Nombre Completo** | ✅ | Nombre para mostrar |
| **Rol** | ✅ | Rol del usuario |
| **Contraseña** | ✅ | Contraseña inicial |
| **Teléfono** | ❌ | Número de contacto |
| **Es Activo** | ✅ | Si puede acceder |

---

## 8. Gestión de Clientes

### Acceder a Clientes

1. En el Dashboard, haga clic en **"Ver Clientes"**
2. O navegue a: `Admin > Clientes`

### Dashboard de Clientes

| Tarjeta | Descripción |
|---------|-------------|
| **Total Clientes** | Cantidad activos |
| **Mayoristas** | Clientes tipo mayorista |
| **Minoristas** | Clientes tipo minorista |
| **Zonas** | Zonas activas |

### Filtros Disponibles

| Filtro | Descripción |
|--------|-------------|
| **Búsqueda** | Por nombre, código, email |
| **Tipo** | Minorista / Mayorista |
| **Zona** | Filtrar por zona |

### Información del Cliente

Cada tarjeta muestra:
- Nombre comercial
- Código de cliente
- Tipo (minorista/mayorista)
- Contacto y teléfono
- Dirección completa
- Zona asignada
- Condición IVA
- Límite de crédito
- Descuento general
- Creado por (preventista)

### Crear Nuevo Cliente

1. Haga clic en **"Nuevo Cliente"**
2. Complete los datos requeridos (similar al preventista)

---

## 9. Reportes y Estadísticas

### Acceder a Reportes

1. En el Dashboard, haga clic en **"Ver Reportes"**
2. O navegue a: `Admin > Reportes`

### Tipos de Reportes

El sistema ofrece 4 tipos de reportes en pestañas:

#### 1. Reporte de Pedidos

| Métrica | Descripción |
|---------|-------------|
| **Total de Pedidos** | Cantidad en el período |
| **Por Estado** | Distribución por estado |
| **Por Prioridad** | Distribución por prioridad |
| **Tendencia** | Gráfico temporal |

#### 2. Reporte de Entregas

| Métrica | Descripción |
|---------|-------------|
| **Entregas Realizadas** | Total completadas |
| **Tasa de Éxito** | Porcentaje de entregas exitosas |
| **No Entregados** | Cantidad con problemas |
| **Motivos de No-Entrega** | Desglose por motivo |

#### 3. Reporte de Rendimiento

| Métrica | Descripción |
|---------|-------------|
| **Por Preventista** | Pedidos creados por cada uno |
| **Por Armador** | Eficiencia de armado |
| **Por Repartidor** | Entregas realizadas |
| **Tiempos Promedio** | Duración de cada etapa |

#### 4. Reporte Financiero

| Métrica | Descripción |
|---------|-------------|
| **Facturación Total** | Monto total del período |
| **Por Cliente** | Facturación por cliente |
| **Por Zona** | Facturación por zona |
| **Cobros Realizados** | Monto efectivamente cobrado |

### Filtros de Fecha

Todos los reportes permiten filtrar por rango de fechas:
- Por defecto: Mes actual
- Personalizable: Desde - Hasta

### Exportar Reportes

Algunos reportes incluyen botón de **Exportar** para descargar en CSV.

---

## 10. Configuración

### 10.1 Configuración de Distribuidora

Esta configuración es **crítica** para el funcionamiento de rutas.

#### Acceder

1. En el Dashboard, haga clic en **"Punto Base / Distribuidora"**
2. O navegue a: `Admin > Configuración > Distribuidora`

#### ¿Para qué sirve?

- **Punto de inicio y fin** de todas las rutas
- **Validación GPS** para que repartidores inicien/finalicen rutas
- **Cálculo preciso** de distancias y tiempos

#### Campos de Configuración

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Nombre** | ✅ | Nombre de la distribuidora |
| **Calle** | ✅ | Nombre de la calle |
| **Número** | ✅ | Número de la dirección |
| **Piso/Depto** | ❌ | Información adicional |
| **Localidad** | ✅ | Ciudad |
| **Provincia** | ✅ | Provincia |
| **Radio de Tolerancia** | ✅ | Metros para validación GPS (default: 100m) |

#### Proceso de Configuración

1. Complete la dirección
2. El sistema **geocodifica automáticamente** la dirección
3. Se calculan las coordenadas (latitud/longitud)
4. Haga clic en **"Guardar Configuración"**
5. La configuración queda activa

#### Configuración Actual

Si ya existe una configuración, se muestra:
- Nombre de la distribuidora
- Dirección completa
- Coordenadas (latitud, longitud)
- Radio de tolerancia

---

## 11. Flujo de Trabajo Recomendado

### Rutina diaria típica:

```
🌅 INICIO DEL DÍA
        │
        ▼
1. 🔐 Iniciar sesión en Panel Administrativo
        │
        ▼
2. 📊 Revisar Dashboard
   ├── Verificar pedidos pendientes de entrega
   ├── Revisar rutas del día
   └── Identificar problemas o alertas
        │
        ▼
3. 📍 Generar Rutas (si hay pedidos pendientes)
   ├── Seleccionar fecha de entrega
   ├── Filtrar por zona si es necesario
   ├── Seleccionar pedidos
   ├── Configurar parámetros de costo
   ├── Generar ruta optimizada
   └── Asignar repartidor
        │
        ▼
4. 📦 Monitorear Operaciones
   ├── Verificar armado en proceso
   ├── Seguir rutas en curso
   └── Atender incidencias
        │
        ▼
5. 📊 Al final del día:
   ├── Revisar rutas completadas
   ├── Verificar pedidos no entregados
   └── Generar reportes si es necesario
        │
        ▼
🌙 FIN DEL DÍA
```

### Tareas semanales:

1. **Revisar Reportes**
   - Analizar rendimiento por área
   - Identificar cuellos de botella
   - Verificar satisfacción del cliente

2. **Gestión de Productos**
   - Revisar productos con stock bajo
   - Actualizar precios si es necesario
   - Activar/desactivar productos

3. **Revisar Usuarios**
   - Verificar usuarios activos
   - Crear nuevos usuarios si es necesario
   - Actualizar permisos

### Mejores prácticas:

1. **Genere rutas con anticipación**
   - Ideal: tarde del día anterior
   - Permite planificación del armado

2. **Agrupe pedidos por zona**
   - Rutas más eficientes
   - Menor costo de combustible

3. **Configure la distribuidora correctamente**
   - Dirección exacta
   - Radio de tolerancia apropiado

4. **Revise pedidos sin coordenadas**
   - Aparece una alerta en el generador
   - Actualice direcciones de clientes

5. **Monitoree métricas de satisfacción**
   - Identifique problemas recurrentes
   - Mejore procesos

---

## 12. Preguntas Frecuentes

### ❓ ¿Por qué no aparecen pedidos al generar rutas?

Posibles motivos:
- No hay pedidos en estado `PENDIENTE_ENTREGA` para esa fecha
- Los pedidos no tienen coordenadas (dirección no geocodificada)
- Los pedidos ya están asignados a otra ruta activa

### ❓ ¿Cómo cancelo un pedido?

1. Vaya a `Admin > Pedidos`
2. Busque el pedido
3. Haga clic en "Ver Detalles"
4. Si está disponible, use el botón "Cancelar Pedido"
5. Solo se pueden cancelar pedidos que no están en ruta activa

### ❓ ¿Cómo modifico una ruta ya creada?

Las rutas no se pueden modificar directamente. Para cambiar:
1. Si la ruta está `PLANIFICADO`, puede eliminarla
2. Genere una nueva ruta con los pedidos correctos

### ❓ ¿Qué pasa con los pedidos no entregados?

Al finalizar una ruta:
- Vuelven a estado `PENDIENTE_ENTREGA`
- Quedan disponibles para nuevas rutas
- Se conserva el motivo de no-entrega

### ❓ ¿Cómo agrego coordenadas a clientes?

Las coordenadas se calculan automáticamente al:
- Crear un cliente con dirección completa
- Editar un cliente y guardar

Si persisten problemas, contacte al soporte técnico.

### ❓ ¿Puedo ver rutas de días anteriores?

Sí. En `Admin > Rutas` se muestra el historial completo de rutas ordenado por fecha.

### ❓ ¿Cómo cambio el rol de un usuario?

1. Vaya a `Admin > Usuarios`
2. Busque el usuario
3. Haga clic en el usuario para editar
4. Cambie el rol y guarde

### ❓ ¿Cómo desactivo un usuario sin eliminarlo?

1. Edite el usuario
2. Desmarque "Es Activo"
3. Guarde los cambios

El usuario no podrá iniciar sesión pero se mantiene el historial.

### ❓ ¿Cómo funciona el cálculo de costos de ruta?

El sistema calcula:
1. **Combustible**: Distancia ÷ Consumo × Precio combustible
2. **Conductor** (si se configura): Horas × (Sueldo mensual ÷ 160)
3. **Total**: Combustible + Conductor

### ❓ ¿Qué es el "radio de tolerancia" de la distribuidora?

Es la distancia máxima (en metros) que puede estar un repartidor de la distribuidora para:
- Iniciar una ruta
- Finalizar una ruta

Valor recomendado: 100-200 metros

### ❓ ¿Puedo tener múltiples distribuidoras?

Actualmente el sistema soporta una distribuidora activa. Puede cambiar la configuración cuando sea necesario.

---

## Soporte

Si tiene problemas o consultas adicionales:

- 📧 Contacte al equipo de desarrollo
- 📞 Llame al soporte técnico

---

*Manual de Usuario v1.0 - Sistema de Gestión de Distribución*
*Última actualización: Enero 2026*


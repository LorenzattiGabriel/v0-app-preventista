# 📦 Manual de Usuario - Rol Cliente

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Panel del Cliente (Dashboard)](#3-panel-del-cliente-dashboard)
4. [Historial de Pedidos](#4-historial-de-pedidos)
5. [Detalle del Pedido](#5-detalle-del-pedido)
6. [Calificación de Pedidos](#6-calificación-de-pedidos)
7. [Estados de Pedido](#7-estados-de-pedido)
8. [Faltantes de Productos](#8-faltantes-de-productos)
9. [Soporte por WhatsApp](#9-soporte-por-whatsapp)
10. [Preguntas Frecuentes](#10-preguntas-frecuentes)

---

## 1. Introducción

El portal de **Cliente** le permite hacer seguimiento de sus pedidos realizados a través del preventista. Sus funcionalidades principales son:

- ✅ Ver el estado de sus pedidos en tiempo real
- ✅ Revisar el historial completo de pedidos
- ✅ Ver detalles de productos y precios
- ✅ Recibir notificaciones de faltantes
- ✅ Calificar pedidos entregados
- ✅ Contactar soporte por WhatsApp

### Flujo del Pedido (Vista Cliente)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEGUIMIENTO DE MI PEDIDO                     │
│                                                                 │
│  📝 Pendiente    ➡️  📦 En Armado    ➡️  ✅ Listo              │
│                                                                 │
│         ➡️  🚚 En Camino    ➡️  ✨ Entregado                   │
│                                                                 │
│                         ⬇️                                      │
│                                                                 │
│                    ⭐ Calificar Pedido                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Abra su navegador web y acceda a la URL del sistema
2. Ingrese su **email** y **contraseña**
3. Haga clic en **"Iniciar Sesión"**
4. Será redirigido automáticamente a **"Mis Pedidos"**

> 💡 **Nota**: Su cuenta de cliente está vinculada al email registrado en su ficha de cliente.

### 2.2 Cerrar Sesión

1. En la esquina superior derecha, haga clic en **"Cerrar Sesión"**

---

## 3. Panel del Cliente (Dashboard)

El Dashboard muestra un resumen de todos sus pedidos.

### 3.1 Información de Bienvenida

Al ingresar verá:
- Mensaje de bienvenida con su nombre de contacto
- Nombre comercial de su empresa

### 3.2 Tarjetas de Resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Total Pedidos** | Cantidad total de pedidos realizados |
| **En Proceso** | Pedidos siendo preparados (armado) |
| **En Camino** | Pedidos en ruta de entrega |
| **Entregados** | Pedidos completados exitosamente |

### 3.3 Alerta de Faltantes

Si alguno de sus pedidos tiene productos faltantes, verá una **alerta amarilla** indicando:
- Cantidad de pedidos con faltantes
- Link para ver esos pedidos específicamente

### 3.4 Pedidos Recientes

Muestra sus últimos 5 pedidos con:
- Número de pedido
- Estado actual
- Fecha de pedido y entrega
- Monto total
- Indicador de faltantes (si aplica)
- Botón para ver detalle

---

## 4. Historial de Pedidos

### Acceder al Historial

1. Desde el Dashboard, haga clic en **"Ver Todos"**
2. O navegue a: `Cliente > Pedidos`

### Información Mostrada

Cada pedido muestra:

| Campo | Descripción |
|-------|-------------|
| **Número** | Código único del pedido (ej: `ORD-00123`) |
| **Estado** | Estado actual con badge de color |
| **Fecha Pedido** | Cuándo se realizó |
| **Fecha Entrega** | Cuándo está programado para entrega |
| **Total** | Monto del pedido |
| **Con Faltantes** | Badge amarillo si tiene productos no disponibles |

### Filtros Disponibles

| Filtro | Descripción |
|--------|-------------|
| **Estado** | Filtrar por estado específico |
| **Búsqueda** | Buscar por número de pedido |
| **Con Faltantes** | Ver solo pedidos con productos faltantes |

### Acciones

- **Ver Detalle**: Abre la vista completa del pedido
- **Volver**: Regresa al Dashboard
- **Soporte WhatsApp**: Contactar ayuda

---

## 5. Detalle del Pedido

### Acceder al Detalle

1. Desde el Dashboard o Historial, haga clic en **"Ver Detalle"**

### Información General

| Campo | Descripción |
|-------|-------------|
| **Número de Pedido** | Código único |
| **Estado** | Estado actual con icono |
| **Fecha de Realización** | Cuándo se creó el pedido |
| **Fecha de Entrega** | Fecha programada de entrega |
| **Prioridad** | Urgente, Alta, Media, Normal, Baja |
| **Tipo de Pedido** | Tipo de orden |
| **Observaciones** | Notas especiales si las hay |

### Alertas de Estado

Dependiendo del estado, verá alertas informativas:

#### En Camino
```
🚚 Tu pedido está en camino
El repartidor está realizando las entregas de hoy
```

#### Con Faltantes
```
⚠️ Este pedido tiene productos faltantes
Algunos productos no estaban disponibles al momento del armado.
Los productos faltantes NO serán incluidos en tu entrega.
💰 El total del pedido se ajustará automáticamente.
```

### Evidencia de Entrega

Una vez entregado el pedido, verá:
- **Foto de entrega**: Imagen tomada por el repartidor
- **Recibido por**: Nombre de quien recibió el pedido

### Tabla de Productos

| Columna | Descripción |
|---------|-------------|
| **Producto** | Nombre y marca |
| **Cantidad** | Unidades solicitadas/entregadas |
| **Precio Unit.** | Precio por unidad |
| **Subtotal** | Total de esa línea |

#### Productos con Faltantes

Si un producto no estaba disponible:
- La fila se marca en **rojo**
- Muestra badge "PRODUCTO NO DISPONIBLE"
- Indica cuántas unidades faltaron
- El precio original aparece tachado

### Resumen de Totales

| Línea | Descripción |
|-------|-------------|
| **Subtotal** | Suma de todos los productos |
| **Descuento** | Descuento aplicado (si hay) |
| **Total** | Monto final a pagar |

---

## 6. Calificación de Pedidos

Después de que un pedido es entregado, puede calificarlo.

### ¿Cuándo puedo calificar?

Solo cuando el pedido está en estado **"Entregado"**

### ¿Qué puedo calificar?

#### 1. Calificación del Pedido
- **Estrellas**: 1 a 5 estrellas
- **Comentarios**: Opcional - sobre la calidad de productos

| Estrellas | Significado |
|-----------|-------------|
| ⭐ | Muy insatisfecho |
| ⭐⭐ | Insatisfecho |
| ⭐⭐⭐ | Neutral |
| ⭐⭐⭐⭐ | Satisfecho |
| ⭐⭐⭐⭐⭐ | Muy satisfecho |

#### 2. Calificación del Repartidor
- **Estrellas**: 1 a 5 estrellas (color azul)
- **Comentarios**: Opcional - sobre el servicio de entrega

### Cómo Calificar

1. Abra el detalle de un pedido **Entregado**
2. Desplácese a la sección **"Calificación del Pedido"**
3. Seleccione las estrellas para el pedido (obligatorio)
4. Agregue comentarios si lo desea
5. Seleccione las estrellas para el repartidor (obligatorio)
6. Agregue comentarios si lo desea
7. Haga clic en **"Enviar Calificaciones"**

### Calificación Enviada

Una vez calificado, verá:
- Sus calificaciones guardadas
- Mensaje de agradecimiento
- No puede modificar una calificación enviada

---

## 7. Estados de Pedido

### Estados Posibles

| Estado | Descripción | Icono |
|--------|-------------|-------|
| **Borrador** | Pedido en preparación (preventista) | 📝 |
| **Pendiente de Armado** | Esperando ser preparado | 📦 |
| **En Armado** | Siendo preparado en depósito | 📦 |
| **Listo para Entrega** | Preparado, esperando repartidor | ✅ |
| **En Camino** | El repartidor está en ruta | 🚚 |
| **Entregado** | Completado exitosamente | ✨ |
| **Cancelado** | Pedido cancelado | ❌ |
| **Esperando Stock** | Faltan productos para armar | ⏳ |

### Colores de Estado

| Color | Estados |
|-------|---------|
| **Gris** | Borrador, Pendiente Armado |
| **Azul** | En Armado, Pendiente Entrega, En Camino |
| **Verde** | Entregado |
| **Rojo** | Cancelado, Esperando Stock |

---

## 8. Faltantes de Productos

### ¿Qué son los faltantes?

Cuando un producto no está disponible al momento del armado, se marca como **faltante**.

### ¿Cómo me afecta?

1. **Productos no incluidos**: No recibirá los productos faltantes
2. **Monto ajustado**: Solo pagará por lo que reciba
3. **Información clara**: Verá exactamente qué falta

### Cómo Identificar Faltantes

#### En el Dashboard
- Alerta amarilla indica cuántos pedidos tienen faltantes
- Link para ver solo esos pedidos

#### En la Lista de Pedidos
- Badge **"⚠️ Con Faltantes"** en color amarillo
- Borde amarillo en la tarjeta del pedido
- Mensaje indicando "Algunos productos no están disponibles"

#### En el Detalle del Pedido
- Alerta amarilla grande explicando la situación
- Productos faltantes marcados en **rojo**
- Badge "❌ PRODUCTO NO DISPONIBLE"
- Cantidad faltante indicada claramente
- Precio original tachado

### ¿Qué puedo hacer?

- Revisar el detalle para ver qué falta
- Contactar soporte si tiene dudas
- El próximo pedido puede incluir esos productos

---

## 9. Soporte por WhatsApp

### Botón de Soporte

En las páginas de pedidos verá el botón **"Soporte WhatsApp"**

### ¿Cómo funciona?

1. Haga clic en el botón verde de WhatsApp
2. Se abrirá WhatsApp (web o app)
3. El mensaje incluirá automáticamente el número de pedido
4. Escriba su consulta y envíe

### ¿Cuándo usar el soporte?

- Dudas sobre su pedido
- Problemas con productos faltantes
- Cambios en la dirección de entrega
- Consultas sobre facturación
- Cualquier inconveniente

---

## 10. Preguntas Frecuentes

### ❓ ¿Puedo hacer pedidos desde el sistema?

No. Los pedidos son realizados a través de su preventista asignado. El portal de cliente es solo para **seguimiento**.

### ❓ ¿Cómo modifico un pedido?

Contacte a su preventista o use el soporte WhatsApp. No es posible modificar pedidos desde el portal.

### ❓ ¿Por qué mi pedido tiene productos faltantes?

Puede deberse a:
- Falta de stock en el momento del armado
- Producto discontinuado
- Error en el pedido original

El monto se ajusta automáticamente - solo paga por lo que recibe.

### ❓ ¿Puedo cancelar un pedido?

Solo el preventista o un administrador pueden cancelar pedidos. Contacte al soporte si necesita cancelar.

### ❓ ¿Cuándo puedo calificar mi pedido?

Solo después de que esté **Entregado**. La opción aparecerá automáticamente en el detalle del pedido.

### ❓ ¿Puedo modificar mi calificación?

No. Una vez enviada, la calificación no puede modificarse.

### ❓ ¿Por qué no aparece mi pedido?

Su cuenta está vinculada al email de su ficha de cliente. Si el email no coincide, los pedidos no aparecerán. Contacte al administrador para corregir esto.

### ❓ ¿Cómo sé que mi pedido está en camino?

El estado cambiará a **"En Camino"** y verá una alerta azul indicando que el repartidor está en ruta.

### ❓ ¿Dónde veo la foto de entrega?

En el detalle del pedido, una vez que esté **Entregado**, verá la sección "Evidencia de Entrega" con la foto y el nombre de quien recibió.

### ❓ ¿Cómo contacto al repartidor?

Use el botón de soporte WhatsApp. No hay contacto directo con el repartidor desde el portal.

### ❓ ¿Puedo ver pedidos de otras sucursales?

Solo puede ver pedidos asociados a su email de cliente. Si tiene múltiples sucursales con diferentes emails, necesitará cuentas separadas.

---

## Resumen de Navegación

```
📱 PORTAL CLIENTE
│
├── 🏠 Dashboard (Mis Pedidos)
│   ├── Tarjetas de resumen
│   ├── Alerta de faltantes
│   ├── Pedidos recientes
│   └── [Ver Todos] → Historial
│
├── 📋 Historial de Pedidos
│   ├── Filtros
│   ├── Lista de todos los pedidos
│   └── [Ver Detalle] → Detalle
│
└── 📦 Detalle del Pedido
    ├── Información general
    ├── Alertas de estado
    ├── Evidencia de entrega (si aplica)
    ├── Tabla de productos
    ├── Totales
    └── Calificación (si entregado)
```

---

## Soporte

Si tiene problemas o consultas adicionales:

- 💬 Use el botón **"Soporte WhatsApp"** en el sistema
- 📧 Contacte a su preventista asignado
- 📞 Llame a la distribuidora

---

*Manual de Usuario v1.0 - Sistema de Gestión de Distribución*
*Última actualización: Enero 2026*


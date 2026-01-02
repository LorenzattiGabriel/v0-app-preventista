# 📋 Manual de Usuario - Rol Preventista

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Panel de Control (Dashboard)](#3-panel-de-control-dashboard)
4. [Gestión de Pedidos](#4-gestión-de-pedidos)
   - [Crear Nuevo Pedido](#41-crear-nuevo-pedido)
   - [Borradores de Pedidos](#42-borradores-de-pedidos)
   - [Lista de Pedidos](#43-lista-de-pedidos)
5. [Gestión de Clientes](#5-gestión-de-clientes)
   - [Ver Clientes](#51-ver-clientes)
   - [Registrar Nuevo Cliente](#52-registrar-nuevo-cliente)
6. [Flujo de Trabajo Recomendado](#6-flujo-de-trabajo-recomendado)
7. [Preguntas Frecuentes](#7-preguntas-frecuentes)

---

## 1. Introducción

El **Preventista** es el rol encargado de la toma de pedidos y gestión de clientes en el sistema de distribución. Sus principales responsabilidades son:

- ✅ Crear y gestionar pedidos de clientes
- ✅ Registrar nuevos clientes
- ✅ Consultar información de clientes existentes
- ✅ Gestionar borradores de pedidos
- ✅ Hacer seguimiento del estado de sus pedidos

### Flujo del Pedido

```
PREVENTISTA              ARMADOR                  REPARTIDOR
    │                       │                         │
    ▼                       │                         │
┌─────────┐                 │                         │
│BORRADOR │                 │                         │
└────┬────┘                 │                         │
     │ Confirmar            │                         │
     ▼                      │                         │
┌─────────────────┐         │                         │
│PENDIENTE_ARMADO │─────────┼──────────►              │
└─────────────────┘         │                         │
                    ┌───────▼───────┐                 │
                    │  EN_ARMADO    │                 │
                    └───────┬───────┘                 │
                            │ Completar              │
                            ▼                         │
                    ┌─────────────────┐               │
                    │PENDIENTE_ENTREGA│───────────────┼──►
                    └─────────────────┘               │
                                              ┌───────▼────────┐
                                              │ EN_REPARTICION │
                                              └───────┬────────┘
                                                      │ Entregar
                                                      ▼
                                              ┌───────────────┐
                                              │   ENTREGADO   │
                                              └───────────────┘
```

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Abra su navegador web y acceda a la URL del sistema
2. En la pantalla de login, ingrese:
   - **Email**: Su correo electrónico registrado
   - **Contraseña**: Su contraseña
3. Haga clic en **"Iniciar Sesión"**

![Login](../public/placeholder.svg)

> ⚠️ **Importante**: Si olvidó su contraseña, contacte al administrador del sistema.

### 2.2 Cerrar Sesión

1. Haga clic en el ícono de su perfil en la esquina superior derecha
2. Seleccione **"Cerrar Sesión"**

---

## 3. Panel de Control (Dashboard)

Al iniciar sesión, verá el **Panel de Control** con un resumen de su actividad:

### 3.1 Tarjetas de Resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Esta Semana** | Cantidad de pedidos creados desde el lunes |
| **Total Pedidos** | Cantidad total de pedidos que ha creado |
| **Pendientes** | Pedidos esperando ser armados |
| **Borradores** | Pedidos guardados sin confirmar |

### 3.2 Acciones Rápidas

Desde el panel puede acceder directamente a:

- 🆕 **Crear Nuevo Pedido**: Inicia el proceso de toma de pedido
- 👤 **Registrar Nuevo Cliente**: Agrega un cliente al sistema
- 📋 **Ver Mis Pedidos**: Lista todos sus pedidos
- 👥 **Ver Clientes**: Consulta el listado de clientes

### 3.3 Borradores Recientes

Si tiene pedidos guardados como borrador, aparecerá un botón para acceder rápidamente a ellos.

---

## 4. Gestión de Pedidos

### 4.1 Crear Nuevo Pedido

**Ruta**: `Panel de Control → Crear Nuevo Pedido`

#### Paso 1: Seleccionar Cliente

1. En la sección **"Información del Cliente"**, busque el cliente:
   - Por nombre comercial
   - Por código de cliente
   - Por nombre de contacto

2. Seleccione el cliente de la lista desplegable

3. Una vez seleccionado, verá la información del cliente:
   - Dirección completa
   - Teléfono
   - Tipo de cliente (Mayorista/Minorista)

> 💡 **Tip**: Si el cliente no existe, haga clic en "Registrar Nuevo Cliente" (ver sección 5.2)

#### Paso 2: Configurar Detalles del Pedido

| Campo | Descripción | Valores |
|-------|-------------|---------|
| **Fecha de Entrega** | Cuándo debe entregarse | Fecha futura |
| **Prioridad** | Urgencia del pedido | Baja, Normal, Media, Alta, Urgente |
| **Tipo de Pedido** | Origen del pedido | Presencial, Web, Teléfono, WhatsApp |
| **Requiere Factura** | Si necesita factura | Sí / No |
| **Método de Pago** | Forma de pago | Efectivo, Transferencia, Tarjeta, etc. |
| **Observaciones** | Notas adicionales | Texto libre |

#### Paso 3: Agregar Productos

1. En la sección **"Productos"**:
   - Seleccione un producto del catálogo
   - Indique la cantidad
   - (Opcional) Modifique el precio unitario
   - (Opcional) Aplique un descuento al ítem

2. Haga clic en **"Agregar"**

3. El producto aparecerá en la tabla con:
   - Nombre del producto
   - Cantidad
   - Precio unitario
   - Descuento
   - Subtotal

4. Para eliminar un producto, haga clic en el ícono 🗑️

> 💡 **Precios automáticos**: El sistema aplica automáticamente el precio mayorista o minorista según el tipo de cliente.

#### Paso 4: Revisar Totales

En la sección **"Totales y Observaciones"**:

- **Subtotal**: Suma de todos los productos
- **Descuento General**: Descuento adicional sobre el total (en $)
- **Total**: Monto final del pedido

> 💡 **Descuento del cliente**: Si el cliente tiene un descuento general configurado, se aplica automáticamente.

#### Paso 5: Guardar o Confirmar

Tiene dos opciones:

| Acción | Botón | Estado resultante | Descripción |
|--------|-------|-------------------|-------------|
| **Guardar Borrador** | "Guardar Borrador" | `BORRADOR` | Guarda el pedido para continuar después |
| **Confirmar Pedido** | "Confirmar Pedido" | `PENDIENTE_ARMADO` | Envía el pedido al área de armado |

---

### 4.2 Borradores de Pedidos

**Ruta**: `Panel de Control → Ver Borradores`

Los borradores son pedidos guardados que aún no han sido confirmados.

#### Funciones disponibles:

| Acción | Descripción |
|--------|-------------|
| **Ver** | Consultar los detalles del borrador |
| **Editar** | Modificar productos, cantidades o datos |
| **Confirmar** | Enviar el pedido a armado |
| **Eliminar** | Descartar el borrador |

#### Filtros disponibles:

- 🔍 Búsqueda por cliente
- 📅 Rango de fechas de entrega
- 📅 Rango de fechas de creación
- ⚡ Prioridad
- 📍 Localidad
- 💰 Rango de total

---

### 4.3 Lista de Pedidos

**Ruta**: `Panel de Control → Ver Mis Pedidos`

Muestra todos los pedidos que usted ha creado, en cualquier estado.

#### Información mostrada:

| Columna | Descripción |
|---------|-------------|
| **Número** | Código único del pedido (ej: `ORD-00123`) |
| **Cliente** | Nombre comercial del cliente |
| **Fecha Pedido** | Cuándo se creó |
| **Fecha Entrega** | Cuándo debe entregarse |
| **Prioridad** | Nivel de urgencia |
| **Estado** | Estado actual del pedido |
| **Total** | Monto total |

#### Estados del Pedido:

| Estado | Color | Significado |
|--------|-------|-------------|
| `BORRADOR` | 🔵 Gris | Guardado, sin confirmar |
| `PENDIENTE_ARMADO` | 🟡 Amarillo | Esperando ser armado |
| `EN_ARMADO` | 🟠 Naranja | Siendo preparado |
| `ESPERANDO_STOCK` | 🔴 Rojo | Falta stock de productos |
| `PENDIENTE_ENTREGA` | 🟣 Púrpura | Armado, listo para repartir |
| `EN_REPARTICION` | 🔵 Azul | En camino al cliente |
| `ENTREGADO` | 🟢 Verde | Entregado exitosamente |
| `CANCELADO` | ⚫ Negro | Pedido cancelado |

---

## 5. Gestión de Clientes

### 5.1 Ver Clientes

**Ruta**: `Panel de Control → Ver Clientes`

Muestra el listado de clientes registrados en el sistema.

#### Filtros disponibles:

| Filtro | Descripción |
|--------|-------------|
| **Búsqueda** | Por nombre comercial, código o contacto |
| **Zona** | Filtrar por zona geográfica |
| **Estado** | Activos, Inactivos o Todos |

#### Información de cada cliente:

- Código de cliente
- Nombre comercial
- Nombre de contacto
- Teléfono
- Localidad
- Tipo (Mayorista/Minorista)
- Zona asignada
- Estado (Activo/Inactivo)

#### Ver detalle del cliente:

Haga clic en un cliente para ver información completa:
- Dirección completa
- Condición IVA
- Datos fiscales
- Límite de crédito
- Descuento general
- Observaciones

---

### 5.2 Registrar Nuevo Cliente

**Ruta**: `Panel de Control → Registrar Nuevo Cliente`

#### Sección 1: Información Básica

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Nombre Comercial** | ✅ Sí | Nombre del negocio/cliente |
| **Nombre de Contacto** | ✅ Sí | Persona de contacto |
| **Teléfono** | ✅ Sí | Número de contacto |
| **Email** | ❌ No | Correo electrónico |
| **Tipo de Cliente** | ✅ Sí | Mayorista o Minorista |
| **Condición IVA** | ❌ No | Responsable Inscripto, Monotributista, etc. |

#### Sección 2: Dirección

**Opciones para completar la dirección:**

1. **Buscar dirección**: Escriba la dirección y seleccione de las sugerencias (autocompletado con Google Maps)

2. **Usar mi ubicación**: Si está en el lugar del cliente, presione el botón para capturar automáticamente las coordenadas GPS

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Calle** | ✅ Sí | Nombre de la calle |
| **Número** | ✅ Sí | Altura de la calle |
| **Piso/Depto** | ❌ No | Si aplica |
| **Localidad** | ✅ Sí | Ciudad/pueblo |
| **Provincia** | ✅ Sí | Provincia |
| **Código Postal** | ❌ No | CP |
| **Zona** | ❌ No | Zona de reparto asignada |

> 💡 **Importante**: Las coordenadas GPS se guardan automáticamente para optimizar rutas de entrega.

#### Sección 3: Información Fiscal y Comercial

| Campo | Descripción |
|-------|-------------|
| **Razón Social** | Nombre legal de la empresa |
| **CUIT/CUIL** | Identificación fiscal |
| **Días de Crédito** | Plazo de pago en días |
| **Límite de Crédito** | Monto máximo de crédito |
| **Descuento General** | % de descuento automático |
| **Observaciones** | Notas sobre el cliente |

#### Guardar Cliente

- Haga clic en **"Guardar Cliente y Continuar"**
- El cliente quedará registrado y disponible para crear pedidos
- Se le asignará automáticamente un código único (ej: `CLI-00456`)

---

## 6. Flujo de Trabajo Recomendado

### Rutina diaria típica:

```
1. 🔐 Iniciar sesión
        │
        ▼
2. 📊 Revisar Dashboard
   ├── ¿Hay borradores pendientes? → Completarlos
   └── ¿Pedidos pendientes? → Verificar estado
        │
        ▼
3. 👥 Visitar clientes
        │
        ▼
4. 📝 Para cada cliente:
   ├── ¿Cliente nuevo? → Registrarlo primero
   └── ¿Cliente existente? → Crear pedido
        │
        ▼
5. 📋 Crear pedido:
   ├── Seleccionar cliente
   ├── Agregar productos
   ├── Si falta información → Guardar como BORRADOR
   └── Si está completo → CONFIRMAR PEDIDO
        │
        ▼
6. 🔄 Repetir para cada cliente
        │
        ▼
7. 🔚 Fin del día:
   └── Revisar borradores pendientes
```

### Mejores prácticas:

1. **Confirme los pedidos lo antes posible** para que puedan ser armados

2. **Complete todos los datos del cliente** al registrarlo, especialmente la dirección con coordenadas

3. **Use borradores** cuando necesite confirmar algo con el cliente antes de enviar el pedido

4. **Verifique la prioridad** según la urgencia real del cliente

5. **Agregue observaciones** con información importante para el armador o repartidor

---

## 7. Preguntas Frecuentes

### ❓ ¿Cómo cancelo un pedido ya confirmado?

Una vez confirmado, el pedido pasa al área de armado. Debe contactar al encargado de armado o administrador para solicitar la cancelación.

### ❓ ¿Puedo modificar un pedido después de confirmarlo?

No. Los pedidos confirmados no pueden modificarse. Si necesita hacer cambios, debe crear un nuevo pedido y solicitar la cancelación del anterior.

### ❓ ¿Por qué no aparece un producto en el catálogo?

El producto puede estar:
- Marcado como inactivo
- Sin stock disponible
- No cargado en el sistema

Contacte al administrador para verificar.

### ❓ ¿Cómo sé si un pedido ya fue entregado?

En la lista de pedidos, verifique la columna **Estado**:
- `ENTREGADO` = El cliente ya recibió el pedido
- `EN_REPARTICION` = Está en camino

### ❓ ¿Qué hago si el cliente no está en el sistema?

Use la opción **"Registrar Nuevo Cliente"** para agregarlo antes de crear el pedido.

### ❓ ¿Puedo ver los pedidos de otros preventistas?

No. Cada preventista solo ve los pedidos que él mismo ha creado.

### ❓ ¿Cómo se calcula el precio para mayoristas vs minoristas?

El sistema aplica automáticamente:
- **Precio Mayorista**: Para clientes tipo "Mayorista"
- **Precio Minorista**: Para clientes tipo "Minorista"
- Si no hay precio específico, usa el precio base

### ❓ ¿Qué significa "Esperando Stock"?

El pedido no puede armarse porque faltan productos. El armador marcó faltantes y el pedido espera reposición de stock.

---

## Soporte

Si tiene problemas o consultas adicionales:

- 📧 Contacte al administrador del sistema
- 📞 Llame al soporte técnico

---

*Manual de Usuario v1.0 - Sistema de Gestión de Distribución*
*Última actualización: Enero 2026*


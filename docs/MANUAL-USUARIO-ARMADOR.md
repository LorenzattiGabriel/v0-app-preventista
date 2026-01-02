# 📦 Manual de Usuario - Rol Armador (Encargado de Armado)

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Panel de Armado (Dashboard)](#3-panel-de-armado-dashboard)
4. [Proceso de Armado](#4-proceso-de-armado)
   - [Tomar un Pedido](#41-tomar-un-pedido)
   - [Armar el Pedido](#42-armar-el-pedido)
   - [Gestión de Faltantes](#43-gestión-de-faltantes)
   - [Confirmar Armado](#44-confirmar-armado)
5. [Funciones Adicionales](#5-funciones-adicionales)
   - [Liberar Pedido](#51-liberar-pedido)
   - [Pausar Armado](#52-pausar-armado)
   - [Ver Detalle de Pedidos Completados](#53-ver-detalle-de-pedidos-completados)
6. [Flujo de Trabajo Recomendado](#6-flujo-de-trabajo-recomendado)
7. [Preguntas Frecuentes](#7-preguntas-frecuentes)

---

## 1. Introducción

El **Armador** (o Encargado de Armado) es el rol responsable de preparar físicamente los pedidos para su posterior entrega. Sus principales responsabilidades son:

- ✅ Armar los pedidos según la lista de productos
- ✅ Verificar el stock disponible
- ✅ Registrar faltantes con su motivo
- ✅ Confirmar cuando un pedido está listo para entrega
- ✅ Mantener actualizado el inventario

### Flujo del Armado

```
                    PREVENTISTA
                         │
                         │ Confirma pedido
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     ÁREA DE ARMADO                          │
│                                                             │
│   ┌─────────────────┐     ┌───────────────┐                │
│   │PENDIENTE_ARMADO │────►│  EN_ARMADO    │                │
│   │ (Cola de espera)│     │ (Armando...)  │                │
│   └─────────────────┘     └───────┬───────┘                │
│                                   │                         │
│                    ┌──────────────┼──────────────┐         │
│                    │              │              │         │
│                    ▼              ▼              ▼         │
│              Sin faltantes   Con faltantes   Liberar       │
│                    │              │              │         │
│                    └──────┬───────┘              │         │
│                           ▼                      ▼         │
│                 ┌─────────────────┐    ┌─────────────────┐ │
│                 │PENDIENTE_ENTREGA│    │PENDIENTE_ARMADO │ │
│                 │ (Listo)         │    │ (Vuelve a cola) │ │
│                 └─────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Pasa a repartidor
                         ▼
                    REPARTIDOR
```

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Abra su navegador web y acceda a la URL del sistema
2. Ingrese su **email** y **contraseña**
3. Haga clic en **"Iniciar Sesión"**
4. Será redirigido automáticamente al **Panel de Armado**

### 2.2 Cerrar Sesión

1. En la esquina superior derecha, haga clic en **"Cerrar Sesión"**

---

## 3. Panel de Armado (Dashboard)

El Panel de Armado es su centro de operaciones. Muestra todos los pedidos que requieren atención.

### 3.1 Tarjetas de Resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Pendientes** | Pedidos esperando ser armados |
| **En Proceso** | Pedidos que están siendo armados (por usted u otros) |
| **Completados Hoy** | Pedidos finalizados en el día |

### 3.2 Columnas de Pedidos

El panel muestra tres columnas organizadas:

#### Columna 1: Pendientes
Pedidos en estado `PENDIENTE_ARMADO`:
- Ordenados por **prioridad** (urgente primero)
- Luego por **fecha de entrega** (más próxima primero)
- Botón **"Armar"** para tomar el pedido

#### Columna 2: En Proceso
Pedidos en estado `EN_ARMADO`:
- Muestra quién está armando cada pedido
- Si es suyo: botón **"Continuar"**
- Si es de otro: mensaje "Ya asignado" (bloqueado)

#### Columna 3: Terminados Hoy
Pedidos completados hoy (estado `PENDIENTE_ENTREGA`):
- Muestra si tiene faltantes
- Botón **"Ver detalle"** para revisar

### 3.3 Información de cada Pedido

Cada tarjeta de pedido muestra:

| Campo | Descripción |
|-------|-------------|
| **Número** | Código del pedido (ej: `ORD-00123`) |
| **Prioridad** | Urgente, Alta, Media, Normal, Baja |
| **Cliente** | Nombre comercial |
| **Localidad** | Ciudad de entrega |
| **Fecha Entrega** | Cuándo debe entregarse |

---

## 4. Proceso de Armado

### 4.1 Tomar un Pedido

1. En el panel, ubique un pedido en la columna **"Pendientes"**
2. Haga clic en el botón **"Armar"**
3. El pedido cambiará automáticamente a estado `EN_ARMADO`
4. Usted quedará asignado como el armador
5. Otros usuarios verán el pedido bloqueado

> ⚠️ **Importante**: Al abrir un pedido, este queda **reservado para usted**. Otros armadores no pueden modificarlo hasta que lo libere o complete.

### 4.2 Armar el Pedido

#### Pantalla de Armado

La pantalla de armado contiene:

**1. Información del Pedido**
- Número de pedido
- Cliente y dirección completa
- Fecha de entrega
- Prioridad (badge de color)
- Observaciones del preventista

**2. Lista de Productos a Armar**

Para cada producto verá:

| Campo | Descripción |
|-------|-------------|
| **Nombre** | Producto y marca |
| **Solicitado** | Cantidad pedida |
| **Precio** | Precio unitario |
| **Cantidad Armada** | Campo editable - cuánto armó realmente |
| **Marcar como faltante** | Checkbox para indicar faltante |

#### Pasos para Armar

1. **Busque cada producto** en el depósito
2. **Verifique la cantidad** solicitada
3. **Coloque en la caja/paquete** del pedido
4. En la pantalla, **confirme la cantidad armada**:
   - Si armó todo: deje la cantidad igual
   - Si armó parcialmente: modifique el número
   - Si no hay stock: marque como faltante (ver sección 4.3)
5. **Repita** para cada producto de la lista

### 4.3 Gestión de Faltantes

Cuando un producto no está disponible (total o parcialmente):

#### Marcar un Faltante

1. **Modifique la cantidad armada** al número real (puede ser 0)
2. **Marque el checkbox** "Marcar como faltante"
3. Se expandirá un formulario adicional:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Motivo del Faltante** | ✅ Sí | Seleccione de la lista |
| **Notas del Faltante** | ❌ No | Detalles adicionales |

#### Motivos de Faltante Disponibles

| Motivo | Cuándo usar |
|--------|-------------|
| **Sin Stock** | No hay unidades en el depósito |
| **Producto Dañado** | El producto está roto o vencido |
| **Producto Discontinuado** | Ya no se comercializa |
| **Error en Pedido** | El producto no debería estar |
| **Otro** | Cualquier otro motivo |

#### Ejemplo de Faltante

```
Producto: Coca Cola 2L
Solicitado: 10 unidades
Stock disponible: 6 unidades

➡️ Cantidad Armada: 6
➡️ Marcar como faltante: ✅
➡️ Motivo: Sin Stock
➡️ Notas: Solo quedan 6 unidades en depósito
```

### 4.4 Confirmar Armado

#### Antes de Confirmar

Revise el **Resumen del Armado**:

| Campo | Descripción |
|-------|-------------|
| **Total Original** | Valor del pedido según lo solicitado |
| **Total Armado** | Valor real según lo armado |
| **Diferencia** | Monto descontado por faltantes |

#### Notas de Armado

En el campo **"Notas de Armado"** puede agregar:
- Observaciones generales
- Instrucciones especiales para el repartidor
- Información sobre el empaque

#### Confirmar

1. Haga clic en **"Confirmar Armado"**
2. Aparecerá un diálogo de confirmación
3. Si hay faltantes, se mostrará un aviso especial
4. Haga clic en **"Confirmar"**

#### ¿Qué sucede al confirmar?

- El pedido cambia a estado `PENDIENTE_ENTREGA`
- Se registra la fecha/hora de finalización
- Se descuenta el stock de los productos
- Si hay faltantes, se marca `has_shortages = true`
- El pedido queda disponible para el repartidor

---

## 5. Funciones Adicionales

### 5.1 Liberar Pedido

Si necesita dejar de armar un pedido y permitir que otro lo tome:

1. En la pantalla de armado, haga clic en **"Liberar Pedido"**
2. El pedido volverá a estado `PENDIENTE_ARMADO`
3. Quedará disponible para otros armadores

> 💡 **Cuándo usar**: Si necesita hacer otra tarea urgente, si se acabó su turno, o si necesita consultar algo.

### 5.2 Pausar Armado

Si necesita pausar temporalmente pero **mantener el pedido asignado**:

1. Haga clic en **"Pausar Armado"**
2. Volverá al panel de control
3. El pedido permanece en estado `EN_ARMADO` asignado a usted
4. Puede retomarlo haciendo clic en **"Continuar"**

> 💡 **Diferencia con Liberar**: Pausar mantiene el pedido asignado a usted; Liberar lo devuelve a la cola general.

### 5.3 Ver Detalle de Pedidos Completados

Para revisar un pedido ya armado:

1. En la columna **"Terminados Hoy"**, haga clic en **"Ver detalle"**
2. Verá un resumen completo:
   - Información del pedido y cliente
   - Lista de productos con cantidades solicitadas vs armadas
   - Faltantes con sus motivos
   - Notas del armado
   - Totales

---

## 6. Flujo de Trabajo Recomendado

### Rutina diaria típica:

```
1. 🔐 Iniciar sesión
        │
        ▼
2. 📊 Revisar Panel de Armado
   ├── Ver cantidad de pedidos pendientes
   └── Identificar pedidos urgentes
        │
        ▼
3. ⚡ Priorizar por:
   ├── 1º Prioridad URGENTE o ALTA
   ├── 2º Fecha de entrega más próxima
   └── 3º Orden de llegada
        │
        ▼
4. 📦 Para cada pedido:
   ├── Tomar pedido ("Armar")
   ├── Buscar productos en depósito
   ├── Armar físicamente
   ├── Registrar cantidades en sistema
   ├── Marcar faltantes si corresponde
   └── Confirmar armado
        │
        ▼
5. 🔄 Repetir hasta vaciar cola
        │
        ▼
6. 📝 Fin de turno:
   ├── Liberar pedidos no terminados
   └── Verificar pedidos completados hoy
```

### Mejores prácticas:

1. **Atienda pedidos urgentes primero**
   - Los pedidos con prioridad alta/urgente tienen badge rojo

2. **No acumule pedidos en EN_ARMADO**
   - Tome uno a la vez
   - Complete o libere antes de tomar otro

3. **Registre faltantes con detalle**
   - Ayuda a planificar reposición de stock
   - Informa al cliente qué falta

4. **Use las notas de armado**
   - Indique si el paquete es frágil
   - Mencione si hay productos refrigerados

5. **Verifique el stock visualmente**
   - Si nota bajo stock, avise al administrador

---

## 7. Preguntas Frecuentes

### ❓ ¿Puedo armar varios pedidos a la vez?

Técnicamente sí, pero **no es recomendable**. El sistema asigna un pedido por vez para evitar confusiones. Complete uno antes de tomar otro.

### ❓ ¿Qué pasa si cierro el navegador sin confirmar?

El pedido permanece en estado `EN_ARMADO` asignado a usted. Puede retomarlo al volver a entrar, o solicitar al administrador que lo libere.

### ❓ ¿Puedo modificar un pedido después de confirmarlo?

No. Una vez confirmado, el pedido pasa a `PENDIENTE_ENTREGA`. Solo un administrador puede hacer cambios.

### ❓ ¿El stock se descuenta automáticamente?

Sí. Al confirmar el armado, el sistema descuenta las cantidades **armadas** (no las solicitadas) del stock de productos.

### ❓ ¿Qué hago si el pedido tiene un error?

1. Si es un error menor: agregue una nota de armado
2. Si es un error grave: libere el pedido y contacte al administrador
3. No confirme pedidos con errores significativos

### ❓ ¿Por qué un pedido aparece bloqueado?

Otro armador lo está trabajando. Verá el mensaje "Ya asignado". Espere a que lo complete o libere, o contacte al otro armador.

### ❓ ¿Cómo sé si un producto está por agotarse?

Actualmente debe verificar visualmente en el depósito. El administrador tiene acceso a reportes de stock bajo.

### ❓ ¿Puedo sustituir un producto por otro?

El sistema tiene la funcionalidad, pero requiere autorización. Consulte con su supervisor antes de sustituir productos.

### ❓ ¿Qué significa el badge "Faltantes" en pedidos completados?

Indica que el pedido se armó incompleto. El cliente recibirá menos productos de los solicitados.

### ❓ ¿Los faltantes se cobran al cliente?

No. El total se recalcula automáticamente. Solo se cobra lo que efectivamente se entrega.

---

## Soporte

Si tiene problemas o consultas adicionales:

- 📧 Contacte al administrador del sistema
- 📞 Llame al soporte técnico

---

*Manual de Usuario v1.0 - Sistema de Gestión de Distribución*
*Última actualización: Enero 2026*


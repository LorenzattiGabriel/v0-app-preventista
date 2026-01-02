# 🚚 Manual de Usuario - Rol Repartidor

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Panel de Entregas (Dashboard)](#3-panel-de-entregas-dashboard)
4. [Gestión de Rutas](#4-gestión-de-rutas)
   - [Iniciar Ruta](#41-iniciar-ruta)
   - [Durante la Ruta](#42-durante-la-ruta)
   - [Finalizar Ruta](#43-finalizar-ruta)
5. [Proceso de Entrega](#5-proceso-de-entrega)
   - [Confirmar Entrega](#51-confirmar-entrega)
   - [Registrar No-Entrega](#52-registrar-no-entrega)
6. [Funciones Adicionales](#6-funciones-adicionales)
   - [Navegación con Google Maps](#61-navegación-con-google-maps)
   - [Ver Detalle del Pedido](#62-ver-detalle-del-pedido)
7. [Flujo de Trabajo Recomendado](#7-flujo-de-trabajo-recomendado)
8. [Preguntas Frecuentes](#8-preguntas-frecuentes)

---

## 1. Introducción

El **Repartidor** es el rol encargado de entregar los pedidos armados a los clientes. Sus principales responsabilidades son:

- ✅ Seguir las rutas de entrega asignadas
- ✅ Entregar los pedidos a los clientes
- ✅ Registrar evidencia de entrega (foto + nombre receptor)
- ✅ Cobrar pedidos cuando corresponda
- ✅ Registrar motivos de no-entrega cuando aplique
- ✅ Finalizar rutas completadas

### Flujo de Entrega

```
                         ARMADOR
                            │
                            │ Pedido armado
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                     ÁREA DE REPARTO                           │
│                                                               │
│   ┌─────────────────┐     ┌────────────────┐                 │
│   │PENDIENTE_ENTREGA│     │  RUTA ASIGNADA │                 │
│   │    (Armado)     │────►│   (Planificada)│                 │
│   └─────────────────┘     └───────┬────────┘                 │
│                                   │                           │
│                            Iniciar Ruta                       │
│                                   │                           │
│                                   ▼                           │
│                         ┌────────────────┐                   │
│                         │ RUTA EN_CURSO  │                   │
│                         │  (Repartiendo) │                   │
│                         └───────┬────────┘                   │
│                                 │                             │
│              Para cada pedido:  │                             │
│                    ┌────────────┼────────────┐               │
│                    │            │            │               │
│                    ▼            ▼            ▼               │
│              ┌──────────┐ ┌──────────┐ ┌──────────────┐      │
│              │ ENTREGADO│ │No Entrega│ │  Pendiente   │      │
│              │    ✅    │ │    ⚠️    │ │      ⏳      │      │
│              └──────────┘ └──────────┘ └──────────────┘      │
│                                 │                             │
│                          Al terminar todos:                   │
│                                 │                             │
│                                 ▼                             │
│                       ┌────────────────┐                     │
│                       │RUTA COMPLETADA │                     │
│                       └────────────────┘                     │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Acceso al Sistema

### 2.1 Iniciar Sesión

1. Abra su navegador web (idealmente en su celular)
2. Acceda a la URL del sistema
3. Ingrese su **email** y **contraseña**
4. Haga clic en **"Iniciar Sesión"**
5. Será redirigido automáticamente al **Panel de Entregas**

> 💡 **Recomendación**: Agregue la aplicación a su pantalla de inicio para acceso rápido.

### 2.2 Cerrar Sesión

1. En la esquina superior derecha, haga clic en **"Cerrar Sesión"**

---

## 3. Panel de Entregas (Dashboard)

El Panel de Entregas es su centro de operaciones diario.

### 3.1 Tarjetas de Resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Rutas de Hoy** | Cantidad de rutas asignadas para hoy |
| **En Curso** | Rutas activas en este momento |
| **Completadas** | Rutas finalizadas hoy |
| **Entregas Hoy** | Total de pedidos entregados hoy |
| **Rutas Futuras** | Rutas planificadas para próximos días |

### 3.2 Pestañas

#### Pestaña "Rutas de Hoy"

Muestra las rutas asignadas para el día actual:

| Campo | Descripción |
|-------|-------------|
| **Código de Ruta** | Identificador único (ej: `RUT-00001`) |
| **Estado** | Planificado, En Curso, Completado |
| **Zona** | Área geográfica de la ruta |
| **Entregas** | Progreso X/Y (entregadas/total) |
| **Hora Inicio** | Hora programada para comenzar |
| **Distancia** | Kilómetros totales estimados |
| **Duración** | Tiempo estimado |

#### Pestaña "Rutas Planificadas"

Permite ver rutas de fechas futuras:
1. Seleccione una fecha en el calendario
2. Vea las rutas planificadas para ese día

---

## 4. Gestión de Rutas

### 4.1 Iniciar Ruta

#### Requisitos para iniciar:
- ✅ La ruta debe estar **planificada para hoy**
- ✅ Debe estar **físicamente en la distribuidora** (GPS)

#### Pasos:

1. En el Panel, ubique su ruta del día
2. Haga clic en **"Ver Ruta"**
3. Revise la información de la ruta y pedidos
4. Haga clic en **"Iniciar Ruta"**
5. **Permita el acceso al GPS** cuando se solicite
6. El sistema verificará que esté en la distribuidora
7. Se abrirá **Google Maps** automáticamente con la ruta optimizada

> ⚠️ **Validación GPS**: Debe estar dentro del radio permitido del depósito para iniciar. Si está fuera del rango, verá un mensaje de error indicando la distancia.

#### ¿Qué sucede al iniciar?

- La ruta cambia a estado `EN_CURSO`
- Todos los pedidos cambian a `EN_REPARTICION`
- Se registra la hora de inicio
- Se abre Google Maps con la ruta completa

### 4.2 Durante la Ruta

Una vez iniciada la ruta, verá:

#### Panel de Estado

```
┌────────────────────────────────────────┐
│ 🚚 Ruta en Curso                       │
│                                        │
│ ✅ 3 entregados                        │
│ ⏳ 5 pendientes                        │
│ ⚠️ 1 no entregado                      │
│                                        │
│ [█████████░░░░░░░░] 40%               │
└────────────────────────────────────────┘
```

#### Barra de Progreso

Muestra visualmente cuántos pedidos ha completado.

#### Lista de Entregas

Los pedidos se muestran en orden de entrega optimizado:

| Elemento | Descripción |
|----------|-------------|
| **Número** | Orden de entrega (1, 2, 3...) |
| **Código** | Número del pedido |
| **Cliente** | Nombre comercial |
| **Dirección** | Calle, número, localidad |
| **Productos** | Cantidad y monto total |
| **Teléfono** | Número de contacto |
| **Observaciones** | Notas especiales |

#### Botones por Pedido

| Botón | Acción |
|-------|--------|
| **Marcar Entregado** | Abre formulario de entrega |
| **Navegar** | Abre Google Maps hacia ese cliente |
| **Ver Detalle** | Muestra productos del pedido |

### 4.3 Finalizar Ruta

#### Requisitos para finalizar:
- ✅ Todos los pedidos deben estar **gestionados** (entregados o con motivo de no-entrega)
- ✅ Debe estar **físicamente en la distribuidora** (GPS)

#### Pasos:

1. Gestione todos los pedidos (entregar o marcar no-entrega)
2. El botón **"Finalizar Ruta"** se habilitará
3. Haga clic en **"Finalizar Ruta"**
4. El sistema verificará su ubicación
5. Se mostrará el **Resumen de Ruta**

#### Resumen de Ruta

Antes de confirmar, verá:

| Información | Descripción |
|-------------|-------------|
| **Total de Pedidos** | Cantidad en la ruta |
| **Entregados** | Cuántos se entregaron |
| **No Entregados** | Cuántos no se pudieron entregar |
| **Total Cobrado** | Monto recaudado |
| **Total Esperado** | Monto que debía cobrar |
| **Diferencia** | Faltante o excedente |

#### ¿Qué sucede al finalizar?

- La ruta cambia a estado `COMPLETADO`
- Se registra la hora de finalización
- Los pedidos no entregados vuelven a `PENDIENTE_ENTREGA` para reasignación

---

## 5. Proceso de Entrega

### 5.1 Confirmar Entrega

Al llegar al cliente y entregar el pedido:

#### Paso 1: Abrir formulario

Haga clic en **"Marcar Entregado"** en el pedido correspondiente.

#### Paso 2: Tomar foto de entrega (obligatorio)

1. Haga clic en el campo de foto
2. Se abrirá la cámara de su dispositivo
3. Tome una foto del pedido entregado
4. La foto aparecerá como vista previa

> 📸 **Requisitos de la foto**:
> - Formato: JPG, PNG o similares
> - Tamaño máximo: 5MB
> - Debe mostrar el pedido/paquetes

#### Paso 3: Registrar receptor (obligatorio)

Ingrese el **nombre de quien recibe** el pedido.

Ejemplo: `Juan Pérez`, `María - Empleada`

#### Paso 4: Registrar cobro (opcional)

Si cobró el pedido:

1. Marque **"Se cobró el pedido"**
2. Ingrese el **importe cobrado**

#### Paso 5: Agregar observaciones (opcional)

Agregue notas relevantes:
- "Dejado en recepción"
- "Firmó el dueño"
- "Pago parcial, resto a fin de mes"

#### Paso 6: Confirmar

Haga clic en **"Confirmar Entrega"**

#### Resultado

- El pedido cambia a `ENTREGADO`
- Se guarda la foto como evidencia
- Se registra el nombre del receptor
- Se actualiza el progreso de la ruta

---

### 5.2 Registrar No-Entrega

Cuando no puede entregar un pedido:

#### Paso 1: Abrir formulario

Haga clic en **"Marcar Entregado"** en el pedido.

#### Paso 2: Activar "No se pudo entregar"

Marque el checkbox **"No se pudo entregar"**

El formulario cambiará para mostrar opciones de no-entrega.

#### Paso 3: Seleccionar motivo (obligatorio)

| Motivo | Cuándo usar |
|--------|-------------|
| **Cliente Ausente** | No había nadie en el domicilio |
| **Cliente Rechazó el Pedido** | El cliente no quiso recibir |
| **Dirección Incorrecta** | No existe o es errónea |
| **Sin Acceso al Domicilio** | Portón cerrado, edificio sin acceso |
| **Comercio Cerrado** | Negocio cerrado temporalmente |
| **Otro Motivo** | Cualquier otra situación |

#### Paso 4: Agregar detalles (opcional)

Describa la situación con más información:
- "Vecino dice que está de vacaciones"
- "El local cambió de dueño"
- "Calle cortada por obras"

#### Paso 5: Confirmar

Haga clic en **"Registrar No-Entrega"**

#### Resultado

- El pedido mantiene estado `EN_REPARTICION` temporalmente
- Se registra el motivo de no-entrega
- Al finalizar la ruta, volverá a `PENDIENTE_ENTREGA` para reasignación

---

## 6. Funciones Adicionales

### 6.1 Navegación con Google Maps

#### Ruta Completa

Al iniciar la ruta, se abre automáticamente Google Maps con:
- **Punto de inicio**: Depósito/distribuidora
- **Waypoints**: Todos los clientes en orden optimizado
- **Punto final**: Retorno al depósito

#### Navegación Individual

Para ir a un cliente específico:

1. En la lista de pedidos, haga clic en **"Navegar"**
2. Se abrirá Google Maps con la dirección del cliente
3. Siga las indicaciones de navegación

#### Reabrir Ruta Completa

Si cerró Google Maps:

1. Haga clic en **"Abrir en Google Maps"**
2. Se abrirá nuevamente la ruta completa

### 6.2 Ver Detalle del Pedido

Para ver los productos de un pedido:

1. Haga clic en **"Ver Detalle"**
2. Verá:
   - Lista de productos
   - Cantidades
   - Precios
   - Observaciones del preventista
   - Notas del armador

---

## 7. Flujo de Trabajo Recomendado

### Rutina diaria típica:

```
🌅 INICIO DEL DÍA
        │
        ▼
1. 🔐 Iniciar sesión
        │
        ▼
2. 📊 Revisar Panel de Entregas
   ├── Ver rutas asignadas para hoy
   └── Verificar cantidad de pedidos
        │
        ▼
3. 📦 Cargar mercadería en vehículo
   └── Verificar todos los pedidos de la ruta
        │
        ▼
4. 🚀 Iniciar Ruta
   ├── Estar en la distribuidora
   ├── Permitir GPS
   └── Google Maps se abre automáticamente
        │
        ▼
5. 🚚 Para cada parada:
   ├── Seguir navegación de Google Maps
   ├── Llegar al cliente
   ├── Entregar pedido
   │   ├── ✅ Entrega exitosa:
   │   │   ├── Tomar foto
   │   │   ├── Registrar receptor
   │   │   └── Cobrar si corresponde
   │   │
   │   └── ⚠️ No se puede entregar:
   │       ├── Seleccionar motivo
   │       └── Agregar detalles
   └── Marcar en la app
        │
        ▼
6. 🔄 Repetir hasta completar todas las paradas
        │
        ▼
7. 🏠 Regresar a la distribuidora
        │
        ▼
8. 🏁 Finalizar Ruta
   ├── Revisar resumen
   └── Confirmar finalización
        │
        ▼
🌙 FIN DEL DÍA
```

### Mejores prácticas:

1. **Revise los pedidos antes de salir**
   - Verifique que tiene todos los paquetes
   - Lea las observaciones especiales

2. **Mantenga el GPS activo**
   - Necesario para iniciar y finalizar ruta
   - Mejor precisión de navegación

3. **Tome fotos claras**
   - Que se vea el pedido/paquetes
   - En buenas condiciones de luz

4. **Registre información precisa**
   - Nombre real del receptor
   - Montos exactos cobrados

5. **No deje pedidos sin gestionar**
   - Siempre marque entrega o no-entrega
   - Agregue detalles útiles para reintento

6. **Ante problemas, consulte**
   - Si no puede entregar, registre el motivo
   - Si hay error en el pedido, anótelo en observaciones

---

## 8. Preguntas Frecuentes

### ❓ ¿Por qué no puedo iniciar la ruta?

Posibles motivos:
- **Ruta no es para hoy**: Solo puede iniciar rutas del día actual
- **GPS no habilitado**: Debe permitir acceso a ubicación
- **Fuera del rango**: Debe estar en la distribuidora (dentro del radio configurado)

### ❓ ¿Por qué no puedo finalizar la ruta?

Posibles motivos:
- **Pedidos sin gestionar**: Debe marcar todos como entregados o indicar motivo de no-entrega
- **Fuera del rango**: Debe regresar a la distribuidora

### ❓ ¿Qué pasa si cierro la app durante la ruta?

La ruta permanece `EN_CURSO`. Puede:
- Volver a abrir la app
- Continuar desde donde quedó
- La información guardada se mantiene

### ❓ ¿Qué pasa con los pedidos no entregados?

Al finalizar la ruta:
- Vuelven a estado `PENDIENTE_ENTREGA`
- Quedan disponibles para ser asignados a otra ruta
- Se conserva el motivo de no-entrega

### ❓ ¿Puedo modificar una entrega ya confirmada?

No. Una vez confirmada, no puede modificarse. Si hubo un error, contacte al administrador.

### ❓ ¿Es obligatorio tomar foto?

Sí. La foto es **obligatoria** para confirmar entregas exitosas. No es necesaria para registrar no-entregas.

### ❓ ¿Qué hago si el GPS no funciona?

1. Verifique que el GPS esté activado en su dispositivo
2. Permita el acceso a ubicación para el navegador
3. Salga a un lugar abierto (mejor señal)
4. Si persiste, contacte al administrador

### ❓ ¿Puedo ver rutas de días anteriores?

Solo puede ver rutas:
- Del día actual
- Futuras (en pestaña "Rutas Planificadas")
- En curso (aunque sean de otro día)

### ❓ ¿Cómo sé el orden de las paradas?

Los pedidos se muestran en orden optimizado:
- Número 1, 2, 3... indica el orden
- Google Maps también muestra el orden
- Siga la secuencia para mayor eficiencia

### ❓ ¿Qué hago si hay un problema con el pedido?

- **Faltantes**: El cliente recibirá menos productos (ya marcado por armador)
- **Pedido incorrecto**: Registre en observaciones y contacte al supervisor
- **Cliente rechaza**: Use opción "Cliente Rechazó el Pedido"

### ❓ ¿Debo cobrar todos los pedidos?

No necesariamente. Depende del acuerdo con cada cliente:
- Algunos pagan en el momento
- Otros tienen cuenta corriente
- Marque "Se cobró el pedido" solo si efectivamente cobró

---

## Soporte

Si tiene problemas o consultas adicionales:

- 📧 Contacte al administrador del sistema
- 📞 Llame al soporte técnico

---

*Manual de Usuario v1.0 - Sistema de Gestión de Distribución*
*Última actualización: Enero 2026*


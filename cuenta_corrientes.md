REQUERIMIENTOS TÉCNICOS DETALLADOS
1. NUEVA ESTRUCTURA DE BASE DE DATOS
   Tabla: customer_account_movements
   CREATE TYPE account_movement_type AS ENUM (
   'DEUDA_PEDIDO',           -- Deuda generada por pedido con faltante
   'PAGO_EFECTIVO',          -- Pago en efectivo
   'PAGO_TRANSFERENCIA',     -- Pago por transferencia
   'PAGO_TARJETA',           -- Pago con tarjeta
   'AJUSTE_CREDITO',         -- Ajuste administrativo a favor
   'AJUSTE_DEBITO',          -- Ajuste administrativo en contra
   'NOTA_CREDITO',           -- Nota de crédito
   'PAGO_ADELANTADO'         -- Pago adelantado de pedido
   );

CREATE TABLE customer_account_movements (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

-- Tipo y descripción
movement_type account_movement_type NOT NULL,
description TEXT NOT NULL,

-- Montos (usar DECIMAL para precisión monetaria)
debit_amount DECIMAL(12,2) DEFAULT 0,  -- Aumenta deuda (positivo)
credit_amount DECIMAL(12,2) DEFAULT 0, -- Reduce deuda (pago)
balance_after DECIMAL(12,2) NOT NULL,  -- Saldo después del movimiento

-- Relaciones opcionales
order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
route_id UUID REFERENCES routes(id) ON DELETE SET NULL,

-- Metadata
created_by UUID REFERENCES profiles(id),
created_at TIMESTAMPTZ DEFAULT NOW(),
notes TEXT,

-- Constraint: solo uno de los montos debe ser > 0
CONSTRAINT check_one_amount CHECK (
(debit_amount > 0 AND credit_amount = 0) OR
(credit_amount > 0 AND debit_amount = 0)
)
);

-- Índices para performance
CREATE INDEX idx_customer_movements_customer ON customer_account_movements(customer_id);
CREATE INDEX idx_customer_movements_order ON customer_account_movements(order_id);
CREATE INDEX idx_customer_movements_date ON customer_account_movements(created_at DESC);
Tabla: order_payments (pagos de pedidos)
CREATE TYPE payment_status AS ENUM (
'PENDIENTE',      -- No pagado
'PAGO_PARCIAL',   -- Pagado parcialmente
'PAGADO',         -- Pagado completamente
'VENCIDO'         -- Pago vencido
);

CREATE TABLE order_payments (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

-- Montos
order_total DECIMAL(12,2) NOT NULL,      -- Total del pedido
total_paid DECIMAL(12,2) DEFAULT 0,      -- Total pagado
balance_due DECIMAL(12,2) NOT NULL,      -- Saldo pendiente

-- Estado de pago
payment_status payment_status DEFAULT 'PENDIENTE',

-- Vencimiento (basado en credit_days del cliente)
due_date DATE,

-- Control
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),

CONSTRAINT unique_order_payment UNIQUE(order_id)
);

CREATE INDEX idx_order_payments_status ON order_payments(payment_status);
CREATE INDEX idx_order_payments_due_date ON order_payments(due_date);
Tabla: route_cash_closures (cierres de caja)
CREATE TABLE route_cash_closures (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
route_id UUID NOT NULL UNIQUE REFERENCES routes(id) ON DELETE CASCADE,
driver_id UUID NOT NULL REFERENCES profiles(id),

-- Montos calculados automáticamente
total_expected DECIMAL(12,2) NOT NULL,   -- Suma de totales de pedidos
total_collected DECIMAL(12,2) NOT NULL,  -- Suma de collected_amount
total_difference DECIMAL(12,2) NOT NULL, -- Diferencia (puede ser negativa)

-- Contadores
total_orders INTEGER NOT NULL,
orders_delivered INTEGER NOT NULL,
orders_collected INTEGER NOT NULL,       -- Pedidos donde was_collected = true

-- Desglose por método de pago
cash_collected DECIMAL(12,2) DEFAULT 0,
transfer_collected DECIMAL(12,2) DEFAULT 0,
card_collected DECIMAL(12,2) DEFAULT 0,

-- Timestamps
closure_date DATE NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),

-- Inmutable: no se puede modificar una vez creado
is_locked BOOLEAN DEFAULT true,

-- Notas del repartidor al cerrar
notes TEXT
);

CREATE INDEX idx_cash_closures_driver ON route_cash_closures(driver_id);
CREATE INDEX idx_cash_closures_date ON route_cash_closures(closure_date DESC);
Modificaciones a tablas existentes:
Tabla orders - agregar campo:
ALTER TABLE orders
ADD COLUMN payment_status payment_status DEFAULT 'PENDIENTE';

CREATE INDEX idx_orders_payment_status ON orders(payment_status);
Tabla customers - agregar campo de saldo:
ALTER TABLE customers
ADD COLUMN current_balance DECIMAL(12,2) DEFAULT 0;

-- Índice para encontrar clientes con deuda
CREATE INDEX idx_customers_with_debt ON customers(current_balance)
WHERE current_balance > 0;
2. SERVICIOS A IMPLEMENTAR
   Servicio: lib/services/accountMovementsService.ts
   /**
* Servicio para gestión de cuenta corriente de clientes
  */

export interface CreateMovementParams {
customerId: string;
movementType: AccountMovementType;
debitAmount?: number;
creditAmount?: number;
description: string;
orderId?: string;
routeId?: string;
createdBy?: string;
notes?: string;
}

export interface CustomerAccountSummary {
customerId: string;
currentBalance: number;
creditLimit: number;
creditAvailable: number;
totalDebt: number;
totalPaid: number;
lastMovementDate: Date | null;
hasOverduePayments: boolean;
}

export const accountMovementsService = {
/**
* Crea un movimiento en cuenta corriente
* Actualiza automáticamente el balance del cliente
  */
  async createMovement(params: CreateMovementParams): Promise<Movement>,

/**
* Obtiene movimientos de un cliente con paginación
  */
  async getCustomerMovements(
  customerId: string,
  page: number,
  limit: number
  ): Promise<PaginatedMovements>,

/**
* Obtiene resumen de cuenta corriente del cliente
  */
  async getCustomerAccountSummary(customerId: string): Promise<CustomerAccountSummary>,

/**
* Registra deuda por pedido con faltante de pago
  */
  async createDebtFromOrder(
  orderId: string,
  amountDue: number,
  routeId?: string
  ): Promise<Movement>,

/**
* Registra pago de cliente
  */
  async registerPayment(
  customerId: string,
  amount: number,
  paymentMethod: string,
  orderId?: string,
  notes?: string
  ): Promise<Movement>,

/**
* Calcula balance actual del cliente
* (suma de debits - suma de credits)
  */
  async calculateCustomerBalance(customerId: string): Promise<number>,

/**
* Obtiene pedidos con deuda de un cliente
  */
  async getCustomerOrdersWithDebt(customerId: string): Promise<Order[]>,
  };
  Servicio: lib/services/orderPaymentsService.ts
  /**
* Servicio para gestión de pagos de pedidos
  */

export const orderPaymentsService = {
/**
* Crea registro de pago para pedido nuevo
  */
  async createOrderPayment(
  orderId: string,
  orderTotal: number,
  customerCreditDays: number
  ): Promise<OrderPayment>,

/**
* Registra pago adelantado antes de entrega
  */
  async registerAdvancePayment(
  orderId: string,
  amount: number,
  paymentMethod: string,
  createdBy: string
  ): Promise<void>,

/**
* Registra cobro durante entrega
  */
  async registerDeliveryPayment(
  orderId: string,
  amountCollected: number,
  routeId: string,
  driverId: string
  ): Promise<void>,

/**
* Actualiza estado de pago del pedido
  */
  async updatePaymentStatus(orderId: string): Promise<void>,

/**
* Obtiene detalle de pago de pedido
  */
  async getOrderPaymentDetail(orderId: string): Promise<OrderPaymentDetail>,

/**
* Marca pedidos vencidos automáticamente
  */
  async markOverdueOrders(): Promise<number>,
  };
  Servicio: lib/services/cashClosureService.ts
  /**
* Servicio para cierres de caja de rutas
  */

export interface CashClosureData {
routeId: string;
totalExpected: number;
totalCollected: number;
totalDifference: number;
totalOrders: number;
ordersDelivered: number;
ordersCollected: number;
cashCollected: number;
transferCollected: number;
cardCollected: number;
}

export const cashClosureService = {
/**
* Genera cierre de caja automático al finalizar ruta
  */
  async generateCashClosure(
  routeId: string,
  driverId: string,
  notes?: string
  ): Promise<CashClosure>,

/**
* Obtiene datos para generar cierre de caja
  */
  async calculateCashClosureData(routeId: string): Promise<CashClosureData>,

/**
* Obtiene cierre de caja de una ruta
  */
  async getRouteCashClosure(routeId: string): Promise<CashClosure | null>,

/**
* Obtiene historial de cierres de caja de un repartidor
  */
  async getDriverCashClosures(
  driverId: string,
  startDate: Date,
  endDate: Date
  ): Promise<CashClosure[]>,

/**
* Reporte consolidado de cierres de caja
  */
  async getCashClosuresReport(
  startDate: Date,
  endDate: Date
  ): Promise<CashClosureReport>,
  };
3. MODIFICACIONES AL COMPONENTE REPARTIDOR
   Archivo: components/repartidor/delivery-route-view.tsx
   Cambios necesarios:
   Modificar diálogo de entrega exitosa:
   // Estado para control de pagos
   const [orderPaymentInfo, setOrderPaymentInfo] = useState<{
   orderTotal: number;
   alreadyPaid: number;
   balanceDue: number;
   paymentStatus: 'PENDIENTE' | 'PAGO_PARCIAL' | 'PAGADO';
   } | null>(null);

// Al abrir diálogo, cargar info de pago del pedido
const handleMarkAsDelivered = async (order: Order) => {
setSelectedOrder(order);

// Obtener información de pago
const paymentInfo = await orderPaymentsService.getOrderPaymentDetail(order.id);
setOrderPaymentInfo(paymentInfo);

setShowDeliveryDialog(true);
};

// En el formulario de entrega:
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
{/* ... foto y nombre ... */}

{/* NUEVA SECCIÓN: Información de pago */}
  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <h3 className="font-semibold text-blue-900">Información de Pago</h3>

    <div className="grid grid-cols-3 gap-4 text-sm">
      <div>
        <p className="text-gray-600">Total del pedido:</p>
        <p className="font-bold text-lg">${orderPaymentInfo.orderTotal.toFixed(2)}</p>
      </div>
      
      <div>
        <p className="text-gray-600">Ya pagado:</p>
        <p className="font-bold text-lg text-green-600">
          ${orderPaymentInfo.alreadyPaid.toFixed(2)}
        </p>
      </div>
      
      <div>
        <p className="text-gray-600">Saldo pendiente:</p>
        <p className="font-bold text-lg text-orange-600">
          ${orderPaymentInfo.balanceDue.toFixed(2)}
        </p>
      </div>
    </div>
    
    {orderPaymentInfo.paymentStatus === 'PAGADO' && (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Este pedido ya está completamente pagado
        </AlertDescription>
      </Alert>
    )}
    
    {orderPaymentInfo.paymentStatus === 'PAGO_PARCIAL' && (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Este pedido tiene un pago parcial de ${orderPaymentInfo.alreadyPaid.toFixed(2)}
        </AlertDescription>
      </Alert>
    )}
  </div>

{/* SECCIÓN DE COBRO */}
{orderPaymentInfo.balanceDue > 0 && (
<div className="space-y-3">
<div className="flex items-center space-x-2">
<Checkbox
id="was-collected"
checked={wasCollected}
onCheckedChange={(checked) => {
setWasCollected(checked as boolean);
if (checked) {
// Sugerir saldo pendiente como monto a cobrar
setCollectedAmount(orderPaymentInfo.balanceDue.toString());
} else {
setCollectedAmount("");
}
}}
/>
<label htmlFor="was-collected" className="text-sm font-medium">
Se cobró el pedido
</label>
</div>

      {wasCollected && (
        <div className="pl-6 space-y-3">
          <div>
            <Label htmlFor="collected-amount">
              Monto cobrado <span className="text-red-500">*</span>
            </Label>
            <Input
              id="collected-amount"
              type="number"
              step="0.01"
              min="0"
              max={orderPaymentInfo.balanceDue}
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(e.target.value)}
              placeholder={`Máximo: $${orderPaymentInfo.balanceDue.toFixed(2)}`}
            />
            {collectedAmount && parseFloat(collectedAmount) < orderPaymentInfo.balanceDue && (
              <p className="text-sm text-orange-600 mt-1">
                Faltante: ${(orderPaymentInfo.balanceDue - parseFloat(collectedAmount)).toFixed(2)}
              </p>
            )}
          </div>
          
          {/* Método de pago */}
          <div>
            <Label htmlFor="payment-method">Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta de Débito/Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      {!wasCollected && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Si no se cobra, se generará una deuda de ${orderPaymentInfo.balanceDue.toFixed(2)} 
            en la cuenta corriente del cliente
          </AlertDescription>
        </Alert>
      )}
    </div>
)}

{orderPaymentInfo.balanceDue === 0 && (
<Alert className="bg-green-50 border-green-200">
<CheckCircle2 className="h-4 w-4 text-green-600" />
<AlertDescription className="text-green-800">
No hay saldo pendiente por cobrar
</AlertDescription>
</Alert>
)}

{/* ... resto del formulario ... */}
</DialogContent>
Modificar función de confirmación de entrega:
const confirmDelivery = async () => {
try {
// Validaciones existentes...

    const collectedAmountNum = wasCollected ? parseFloat(collectedAmount) : 0;
    const balanceDue = orderPaymentInfo.balanceDue;
    
    // Validar que no se cobre más de lo que se debe
    if (collectedAmountNum > balanceDue) {
      toast.error(`No se puede cobrar más del saldo pendiente ($${balanceDue.toFixed(2)})`);
      return;
    }
    
    // 1. Subir foto y actualizar pedido (código existente)
    // ...
    
    // 2. Registrar cobro en route_orders
    await supabase
      .from('route_orders')
      .update({
        was_collected: wasCollected,
        collected_amount: collectedAmountNum,
      })
      .eq('route_id', routeId)
      .eq('order_id', order.id);
    
    // 3. Registrar pago en order_payments
    if (wasCollected && collectedAmountNum > 0) {
      await orderPaymentsService.registerDeliveryPayment(
        order.id,
        collectedAmountNum,
        routeId,
        user.id
      );
    }
    
    // 4. Si hay faltante, generar deuda en cuenta corriente
    if (balanceDue > collectedAmountNum) {
      const debtAmount = balanceDue - collectedAmountNum;
      await accountMovementsService.createDebtFromOrder(
        order.id,
        debtAmount,
        routeId
      );
    }
    
    // 5. Actualizar estado de pago del pedido
    await orderPaymentsService.updatePaymentStatus(order.id);
    
    toast.success("Entrega registrada exitosamente");
    // ...
} catch (error) {
// ...
}
};
Modificar función de finalizar ruta:
const handleCompleteRoute = async () => {
try {
// Validaciones existentes...

    // 1. Actualizar estados de pedidos (código existente)
    // ...
    
    // 2. NUEVO: Generar cierre de caja automático
    const cashClosure = await cashClosureService.generateCashClosure(
      routeId,
      user.id,
      null // notas opcionales
    );
    
    // 3. Actualizar estado de ruta
    await supabase
      .from('routes')
      .update({
        status: 'COMPLETADO',
        actual_end_time: new Date().toISOString(),
      })
      .eq('id', routeId);
    
    // 4. Mostrar resumen con cierre de caja
    toast.success("Ruta finalizada y cierre de caja generado");
    
    // Navegar a página de cierre de caja
    router.push(`/repartidor/routes/${routeId}/closure`);

} catch (error) {
// ...
}
};
Mejorar diálogo de resumen antes de finalizar:
// En el diálogo de confirmación de finalización:
<DialogContent className="max-w-3xl">
<DialogHeader>
<DialogTitle>Confirmar Finalización de Ruta</DialogTitle>
</DialogHeader>

{/* Resumen de entregas */}
  <div className="grid grid-cols-3 gap-4">
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
          <p className="text-sm text-gray-600">Total Pedidos</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <p className="text-2xl font-bold">{stats.delivered}</p>
          <p className="text-sm text-gray-600">Entregados</p>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
          <p className="text-2xl font-bold">{stats.notDelivered}</p>
          <p className="text-sm text-gray-600">No Entregados</p>
        </div>
      </CardContent>
    </Card>
  </div>

{/* NUEVO: Resumen de cierre de caja */}
  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
      <DollarSign className="h-5 w-5" />
      Cierre de Caja
    </h3>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-3 rounded border">
        <p className="text-sm text-gray-600">Total Esperado</p>
        <p className="text-2xl font-bold text-blue-600">
          ${closureData.totalExpected.toFixed(2)}
        </p>
        <p className="text-xs text-gray-500">{closureData.totalOrders} pedidos</p>
      </div>
      
      <div className="bg-white p-3 rounded border">
        <p className="text-sm text-gray-600">Total Cobrado</p>
        <p className="text-2xl font-bold text-green-600">
          ${closureData.totalCollected.toFixed(2)}
        </p>
        <p className="text-xs text-gray-500">{closureData.ordersCollected} pedidos cobrados</p>
      </div>
      
      <div className="col-span-2 bg-white p-3 rounded border border-orange-300">
        <p className="text-sm text-gray-600">Diferencia (Deudas generadas)</p>
        <p className={`text-2xl font-bold ${
          closureData.totalDifference > 0 ? 'text-orange-600' : 'text-gray-600'
        }`}>
          ${closureData.totalDifference.toFixed(2)}
        </p>
        {closureData.totalDifference > 0 && (
          <p className="text-xs text-orange-600 mt-1">
            Se generarán deudas en cuenta corriente de clientes
          </p>
        )}
      </div>
    </div>
    
    {/* Desglose por método de pago */}
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="bg-white p-2 rounded text-center border">
        <p className="text-xs text-gray-600">Efectivo</p>
        <p className="font-bold text-green-700">${closureData.cashCollected.toFixed(2)}</p>
      </div>
      <div className="bg-white p-2 rounded text-center border">
        <p className="text-xs text-gray-600">Transferencia</p>
        <p className="font-bold text-blue-700">${closureData.transferCollected.toFixed(2)}</p>
      </div>
      <div className="bg-white p-2 rounded text-center border">
        <p className="text-xs text-gray-600">Tarjeta</p>
        <p className="font-bold text-purple-700">${closureData.cardCollected.toFixed(2)}</p>
      </div>
    </div>
  </div>

{/* Lista de pedidos no entregados */}
{stats.notDelivered > 0 && (
<Alert className="bg-yellow-50 border-yellow-200">
<AlertCircle className="h-4 w-4 text-yellow-600" />
<AlertDescription>
<p className="font-semibold text-yellow-800 mb-2">
Pedidos no entregados ({stats.notDelivered}):
</p>
<ul className="text-sm space-y-1">
{notDeliveredOrders.map(order => (
<li key={order.id} className="text-yellow-700">
• Pedido #{order.order_number} - {order.no_delivery_reason}
</li>
))}
</ul>
<p className="text-xs text-yellow-600 mt-2">
Estos pedidos volverán a estado PENDIENTE_ENTREGA
</p>
</AlertDescription>
</Alert>
)}

{/* IMPORTANTE: Advertencia de inmutabilidad */}
<Alert className="bg-red-50 border-red-200">
<AlertTriangle className="h-4 w-4 text-red-600" />
<AlertDescription className="text-red-800">
<p className="font-semibold">⚠️ IMPORTANTE:</p>
<p className="text-sm mt-1">
Una vez finalizada la ruta, los valores de cobro y el cierre de caja
<strong> NO podrán ser modificados</strong>. Verifica que todos los datos sean correctos.
</p>
</AlertDescription>
</Alert>

{/* Botones */}
<DialogFooter>
<Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
Cancelar
</Button>
<Button onClick={confirmCompleteRoute} className="bg-green-600 hover:bg-green-700">
Confirmar Finalización
</Button>
</DialogFooter>
</DialogContent>
4. NUEVA PÁGINA: DETALLE DE CIERRE DE CAJA
   Archivo: app/repartidor/routes/[id]/closure/page.tsx
   /**
* Página de detalle de cierre de caja de ruta
* Muestra resumen inmutable del cierre generado
  */

import { cashClosureService } from '@/lib/services/cashClosureService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, CheckCircle2, TrendingUp } from 'lucide-react';

export default async function RouteCashClosurePage({
params
}: {
params: { id: string }
}) {
const closure = await cashClosureService.getRouteCashClosure(params.id);

if (!closure) {
return <div>No se encontró cierre de caja para esta ruta</div>;
}

return (
<div className="container mx-auto p-6 max-w-5xl">
<div className="flex justify-between items-center mb-6">
<div>
<h1 className="text-3xl font-bold">Cierre de Caja</h1>
<p className="text-gray-600">Ruta #{closure.route.route_code}</p>
<p className="text-sm text-gray-500">
{new Date(closure.closure_date).toLocaleDateString('es-AR', {
weekday: 'long',
year: 'numeric',
month: 'long',
day: 'numeric'
})}
</p>
</div>

        <Button variant="outline" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Esperado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">
                ${closure.total_expected.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {closure.total_orders} pedidos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">
                ${closure.total_collected.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {closure.orders_collected} pedidos cobrados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Diferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${
                closure.total_difference > 0 ? 'text-orange-600' : 'text-gray-600'
              }`}>
                ${closure.total_difference.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {closure.total_difference > 0 ? 'Deudas generadas' : 'Sin deudas'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tasa de Cobro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-indigo-600">
                {((closure.total_collected / closure.total_expected) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Efectividad de cobro
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Desglose por método de pago */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Desglose por Método de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Efectivo</p>
              <p className="text-2xl font-bold text-green-700">
                ${closure.cash_collected.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((closure.cash_collected / closure.total_collected) * 100).toFixed(1)}% del total
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Transferencia</p>
              <p className="text-2xl font-bold text-blue-700">
                ${closure.transfer_collected.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((closure.transfer_collected / closure.total_collected) * 100).toFixed(1)}% del total
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Tarjeta</p>
              <p className="text-2xl font-bold text-purple-700">
                ${closure.card_collected.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((closure.card_collected / closure.total_collected) * 100).toFixed(1)}% del total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabla de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalle de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabla con todos los pedidos de la ruta */}
          {/* ... implementar tabla ... */}
        </CardContent>
      </Card>
      
      {closure.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notas del Repartidor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{closure.notes}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Marca de inmutabilidad */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Cierre de Caja Cerrado</p>
          <p className="text-sm text-gray-600">
            Este cierre fue generado automáticamente y es inmutable. 
            No se pueden realizar modificaciones.
          </p>
        </div>
      </div>
    </div>
);
}
5. MÓDULO ADMINISTRADOR: CUENTA CORRIENTE DE CLIENTES
   Archivo: app/admin/customers/[id]/account/page.tsx
   /**
* Vista de cuenta corriente del cliente para administrador
  */

import { accountMovementsService } from '@/lib/services/accountMovementsService';
import { orderPaymentsService } from '@/lib/services/orderPaymentsService';

export default async function CustomerAccountPage({
params
}: {
params: { id: string }
}) {
const customerId = params.id;

// Obtener resumen de cuenta
const summary = await accountMovementsService.getCustomerAccountSummary(customerId);

// Obtener pedidos con deuda
const ordersWithDebt = await accountMovementsService.getCustomerOrdersWithDebt(customerId);

// Obtener movimientos recientes
const movements = await accountMovementsService.getCustomerMovements(customerId, 1, 20);

return (
<div className="container mx-auto p-6">
<h1 className="text-3xl font-bold mb-6">Cuenta Corriente del Cliente</h1>

      {/* Resumen de cuenta */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className={summary.currentBalance > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
          <CardHeader>
            <CardTitle className="text-sm">Saldo Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${
              summary.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              ${summary.currentBalance.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {summary.currentBalance > 0 ? 'Debe' : 'Sin deuda'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Límite de Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              ${summary.creditLimit.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Crédito Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-indigo-600">
              ${summary.creditAvailable.toFixed(2)}
            </p>
            {summary.creditAvailable < 0 && (
              <p className="text-xs text-red-600 mt-1">Excedió el límite</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.hasOverduePayments ? (
              <div>
                <p className="text-2xl font-bold text-red-600">⚠️ VENCIDO</p>
                <p className="text-xs text-red-600 mt-1">Tiene pagos vencidos</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-green-600">✓ AL DÍA</p>
                <p className="text-xs text-green-600 mt-1">Sin pagos vencidos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Pedidos con deuda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pedidos con Deuda Pendiente</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersWithDebt.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay pedidos con deuda pendiente
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Pedido</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Pagado</th>
                    <th className="px-4 py-2 text-right">Deuda</th>
                    <th className="px-4 py-2 text-left">Vence</th>
                    <th className="px-4 py-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersWithDebt.map(order => (
                    <tr key={order.id} className="border-t">
                      <td className="px-4 py-2">
                        <Link 
                          href={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(order.delivery_date).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        ${order.payment.order_total.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">
                        ${order.payment.total_paid.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-red-600 font-bold">
                        ${order.payment.balance_due.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-sm ${
                          new Date(order.payment.due_date) < new Date()
                            ? 'text-red-600 font-semibold'
                            : 'text-gray-600'
                        }`}>
                          {new Date(order.payment.due_date).toLocaleDateString('es-AR')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button 
                          size="sm" 
                          onClick={() => handleRegisterPayment(order.id)}
                        >
                          Registrar Pago
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Historial de movimientos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Movimientos de Cuenta Corriente</CardTitle>
          <Button variant="outline" size="sm">
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Descripción</th>
                  <th className="px-4 py-2 text-right">Debe</th>
                  <th className="px-4 py-2 text-right">Haber</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movements.data.map(movement => (
                  <tr key={movement.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">
                      {new Date(movement.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        movement.movement_type.includes('PAGO')
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {movement.description}
                      {movement.order_id && (
                        <Link 
                          href={`/admin/orders/${movement.order_id}`}
                          className="text-blue-600 hover:underline ml-2"
                        >
                          Ver pedido
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">
                      {movement.debit_amount > 0 && `$${movement.debit_amount.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600 font-medium">
                      {movement.credit_amount > 0 && `$${movement.credit_amount.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2 text-right font-bold">
                      ${movement.balance_after.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          {movements.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              {/* Componente de paginación */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
);
}
Modificar: app/admin/customers/[id]/page.tsx
Agregar botón/tab para acceder a cuenta corriente:
<Tabs defaultValue="info">
<TabsList>
<TabsTrigger value="info">Información</TabsTrigger>
<TabsTrigger value="orders">Pedidos</TabsTrigger>
<TabsTrigger value="account">
Cuenta Corriente
{customer.current_balance > 0 && (
<Badge variant="destructive" className="ml-2">
${customer.current_balance.toFixed(2)}
</Badge>
)}
</TabsTrigger>
</TabsList>

{/* ... tabs existentes ... */}

  <TabsContent value="account">
    {/* Incluir componente de cuenta corriente */}
  </TabsContent>
</Tabs>
6. DASHBOARD ADMIN: WIDGET DE DEUDAS
Modificar: app/admin/dashboard/page.tsx
Agregar widget de clientes con deuda:
// Agregar consulta
const customersWithDebt = await supabase
  .from('customers')
  .select('id, code, commercial_name, current_balance, credit_limit')
  .gt('current_balance', 0)
  .order('current_balance', { ascending: false })
  .limit(10);

// Agregar card en dashboard
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2">
<AlertCircle className="h-5 w-5 text-orange-600" />
Clientes con Deuda
</CardTitle>
</CardHeader>
<CardContent>
{customersWithDebt.data.length === 0 ? (
<p className="text-gray-500 text-center py-4">
No hay clientes con deuda pendiente
</p>
) : (
<div className="space-y-2">
{customersWithDebt.data.map(customer => (
<Link
key={customer.id}
href={`/admin/customers/${customer.id}/account`}
className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition"
>
<div>
<p className="font-medium">{customer.commercial_name}</p>
<p className="text-xs text-gray-600">{customer.code}</p>
</div>
<div className="text-right">
<p className="text-lg font-bold text-red-600">
${customer.current_balance.toFixed(2)}
</p>
<p className="text-xs text-gray-600">
Límite: ${customer.credit_limit.toFixed(2)}
</p>
</div>
</Link>
))}
</div>
)}
</CardContent>
</Card>
7. LABELS Y BADGES DE ESTADO DE PAGO
   Componente: components/ui/payment-status-badge.tsx
   import { Badge } from '@/components/ui/badge';
   import { CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';

interface PaymentStatusBadgeProps {
status: 'PENDIENTE' | 'PAGO_PARCIAL' | 'PAGADO' | 'VENCIDO';
amount?: number;
}

export function PaymentStatusBadge({ status, amount }: PaymentStatusBadgeProps) {
const config = {
PAGADO: {
icon: CheckCircle2,
label: 'Pagado',
className: 'bg-green-100 text-green-800 border-green-300',
},
PAGO_PARCIAL: {
icon: Clock,
label: 'Pago Parcial',
className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
},
PENDIENTE: {
icon: AlertCircle,
label: 'Pendiente',
className: 'bg-orange-100 text-orange-800 border-orange-300',
},
VENCIDO: {
icon: XCircle,
label: 'Vencido',
className: 'bg-red-100 text-red-800 border-red-300',
},
};

const { icon: Icon, label, className } = config[status];

return (
<Badge variant="outline" className={className}>
<Icon className="h-3 w-3 mr-1" />
{label}
{amount !== undefined && ` - $${amount.toFixed(2)}`}
</Badge>
);
}
Usar en listas de pedidos:
// En componentes de lista de pedidos
<PaymentStatusBadge
status={order.payment_status}
amount={order.payment?.balance_due}
/>
8. FUNCIONES Y TRIGGERS DE BASE DE DATOS
   Trigger: Actualizar saldo del cliente automáticamente
   -- Función para actualizar saldo del cliente
   CREATE OR REPLACE FUNCTION update_customer_balance()
   RETURNS TRIGGER AS $$
   BEGIN
   -- Actualizar current_balance del cliente
   UPDATE customers
   SET current_balance = (
   SELECT COALESCE(SUM(debit_amount) - SUM(credit_amount), 0)
   FROM customer_account_movements
   WHERE customer_id = NEW.customer_id
   )
   WHERE id = NEW.customer_id;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_update_customer_balance
AFTER INSERT ON customer_account_movements
FOR EACH ROW
EXECUTE FUNCTION update_customer_balance();
Función: Calcular balance_after automáticamente
-- Función para calcular balance_after antes de insertar
CREATE OR REPLACE FUNCTION calculate_balance_after()
RETURNS TRIGGER AS $$
DECLARE
previous_balance DECIMAL(12,2);
BEGIN
-- Obtener el balance del último movimiento del cliente
SELECT COALESCE(balance_after, 0) INTO previous_balance
FROM customer_account_movements
WHERE customer_id = NEW.customer_id
ORDER BY created_at DESC
LIMIT 1;

-- Si no hay movimientos previos, usar el balance actual del cliente
IF previous_balance IS NULL THEN
SELECT COALESCE(current_balance, 0) INTO previous_balance
FROM customers
WHERE id = NEW.customer_id;
END IF;

-- Calcular nuevo balance
NEW.balance_after := previous_balance + NEW.debit_amount - NEW.credit_amount;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_calculate_balance_after
BEFORE INSERT ON customer_account_movements
FOR EACH ROW
EXECUTE FUNCTION calculate_balance_after();
Función: Marcar pedidos vencidos (cron job diario)
-- Función para marcar pedidos vencidos
CREATE OR REPLACE FUNCTION mark_overdue_orders()
RETURNS INTEGER AS $$
DECLARE
updated_count INTEGER;
BEGIN
UPDATE order_payments
SET payment_status = 'VENCIDO'
WHERE payment_status IN ('PENDIENTE', 'PAGO_PARCIAL')
AND due_date < CURRENT_DATE
AND balance_due > 0;

GET DIAGNOSTICS updated_count = ROW_COUNT;

RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar diariamente con cron job o Supabase Edge Function
9. TESTS Y VALIDACIONES
   Tests unitarios para servicios:
   // __tests__/services/accountMovementsService.test.ts

describe('accountMovementsService', () => {
it('should create debt from order', async () => {
// Test crear deuda
});

it('should register payment and reduce balance', async () => {
// Test registrar pago
});

it('should calculate customer balance correctly', async () => {
// Test cálculo de saldo
});

it('should not allow negative balance_after', async () => {
// Test validación
});
});
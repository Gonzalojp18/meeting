# Plan de Implementación: Sistema de Takeaway Meeting Resto & Bar

## Estado Actual del Proyecto

### Lo que ya existe:
- Menu multi-sede con precios por ubicación
- Checkout de 4 pasos (actualmente envía a WhatsApp)
- Modelo de Order con estados (pending, confirmed, preparing, ready, completed, cancelled)
- Autenticación con NextAuth + JWT
- Roles básicos: admin, manager
- Credenciales de MercadoPago (TEST) configuradas pero NO integradas
- MongoDB Atlas conectado

### Lo que falta para el sistema completo:
- Integración real de pagos con MercadoPago
- Sistema de personalización de productos (contornos/acompañamientos)
- Dashboard de caja por sede
- Roles adicionales (cajero) con asignación por sede
- Estados de pedido en tiempo real
- Reportes y analytics

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                │
│   /menu/[locationId]  →  Checkout  →  MercadoPago  →  Orden    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BASE DE DATOS                           │
│   Orders │ Menu │ Users │ Customizations │ Locations           │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    CAJERO     │    │   MANAGER     │    │    ADMIN      │
│  /caja/[loc]  │    │   /manager    │    │    /admin     │
│               │    │               │    │               │
│ • Ver pedidos │    │ • Todas sedes │    │ • Todo acceso │
│ • Cambiar     │    │ • Ver pedidos │    │ • CRUD menu   │
│   estados     │    │ • NO edita    │    │ • Usuarios    │
│ • Solo su     │    │   menu        │    │ • Reportes    │
│   sede        │    │               │    │ • Roles       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## FASE 1: Sistema de Personalización de Productos (Semana 1-2)

### 1.1 Actualizar Modelo de Menu

**Archivo:** `models/Menu.js`

Agregar schema de customización:

```javascript
const customizationOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },      // "Puré", "Papas Fritas", "Ensalada"
  priceModifier: { type: Number, default: 0 }, // +500 por ejemplo
  isDefault: { type: Boolean, default: false }
});

const customizationGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },       // "Guarnición", "Tipo de Leche"
  type: {
    type: String,
    enum: ['single', 'multiple'],              // single = radio, multiple = checkbox
    default: 'single'
  },
  required: { type: Boolean, default: false },
  minSelections: { type: Number, default: 0 },
  maxSelections: { type: Number, default: 1 },
  options: [customizationOptionSchema]
});

// Agregar a itemSchema:
const itemSchema = new mongoose.Schema({
  // ... campos existentes ...
  customizations: [customizationGroupSchema],   // NUEVO
  preparationTime: { type: Number, default: 15 } // minutos estimados
});
```

### 1.2 Actualizar Cart Store

**Archivo:** `store/cartStore.js`

```javascript
// El item en el carrito ahora incluye customizaciones seleccionadas
{
  _id: "item123",
  name: "Milanesa Napolitana",
  price: 5500,
  quantity: 2,
  selectedCustomizations: [
    {
      groupName: "Guarnición",
      selections: [
        { name: "Papas Fritas", priceModifier: 0 }
      ]
    }
  ],
  itemTotal: 11000  // precio base * cantidad + modificadores
}
```

### 1.3 UI de Personalización

**Nuevo componente:** `components/product/ProductCustomizationModal.jsx`

- Modal que aparece al agregar producto con customizaciones
- Radio buttons para selección única
- Checkboxes para selección múltiple
- Muestra precio actualizado en tiempo real
- Botón "Agregar al pedido" que incluye las selecciones

### 1.4 API para Customizaciones

**Endpoints:**
- `PUT /api/menu/category/[categoryId]/item/[itemId]/customizations` - CRUD de grupos
- Los customizations se guardan como parte del item en el menú

---

## FASE 2: Sistema de Roles y Permisos (Semana 2-3)

### 2.1 Actualizar Modelo de Usuario

**Archivo:** `models/User.js`

```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'manager', 'cashier'],  // Agregar 'cashier'
    default: 'cashier'
  },
  // NUEVO: Asignación de sedes para cajeros
  assignedLocations: [{
    locationId: { type: String },
    locationName: { type: String }
  }],
  // NUEVO: Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

### 2.2 Matriz de Permisos

| Acción                    | Admin | Manager | Cajero |
|---------------------------|-------|---------|--------|
| CRUD Menu                 | ✅    | ❌      | ❌     |
| Ver todas las sedes       | ✅    | ✅      | ❌     |
| Ver pedidos (su sede)     | ✅    | ✅      | ✅     |
| Cambiar estado pedido     | ✅    | ✅      | ✅     |
| Cancelar pedido           | ✅    | ✅      | ❌     |
| Crear usuarios            | ✅    | ❌      | ❌     |
| Asignar cajeros a sedes   | ✅    | ❌      | ❌     |
| Ver reportes              | ✅    | ✅      | ❌     |
| Descargar reportes        | ✅    | ✅      | ❌     |
| Configuración sistema     | ✅    | ❌      | ❌     |

### 2.3 Middleware de Autorización

**Nuevo archivo:** `lib/authorize.js`

```javascript
export function authorize(...allowedRoles) {
  return async (req) => {
    const session = await auth();
    if (!session) return { authorized: false, error: 'No autenticado' };
    if (!allowedRoles.includes(session.user.role)) {
      return { authorized: false, error: 'Sin permisos' };
    }
    return { authorized: true, user: session.user };
  };
}

// Uso en API route:
const { authorized, user, error } = await authorize('admin', 'manager')(req);
if (!authorized) return NextResponse.json({ error }, { status: 403 });
```

### 2.4 APIs de Gestión de Usuarios

**Endpoints:**
- `GET /api/users` - Listar usuarios (admin only)
- `POST /api/users` - Crear usuario (admin only)
- `PUT /api/users/[id]` - Actualizar usuario/rol/sedes (admin only)
- `DELETE /api/users/[id]` - Desactivar usuario (admin only)
- `PUT /api/users/[id]/locations` - Asignar sedes a cajero (admin only)

---

## FASE 3: Integración MercadoPago (Semana 3-4)

### 3.1 Flujo de Pago

```
Cliente confirma pedido
         │
         ▼
┌─────────────────────┐
│ POST /api/orders    │  ← Crea orden con status: 'pending_payment'
│ (crea preference)   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Redirect a MP       │  ← Cliente paga en MercadoPago
│ Checkout Pro        │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ MP Webhook          │  ← POST /api/webhooks/mercadopago
│ (notifica pago)     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Actualiza orden     │  ← status: 'confirmed', paymentStatus: 'approved'
│ Notifica a caja     │
└─────────────────────┘
```

### 3.2 Configuración MercadoPago

**Archivo:** `lib/mercadopago.js`

```javascript
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

export async function createPreference(order) {
  const preference = new Preference(client);

  const items = order.items.map(item => ({
    id: item.itemId,
    title: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    currency_id: 'ARS'
  }));

  const result = await preference.create({
    body: {
      items,
      payer: {
        name: order.customer.name,
        surname: order.customer.lastname,
        phone: { number: order.customer.phone }
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/order-success/${order.orderNumber}`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/order-failed/${order.orderNumber}`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/order-pending/${order.orderNumber}`
      },
      auto_return: 'approved',
      external_reference: order._id.toString(),
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`
    }
  });

  return result;
}
```

### 3.3 Webhook de MercadoPago

**Archivo:** `app/api/webhooks/mercadopago/route.js`

```javascript
export async function POST(req) {
  const body = await req.json();

  if (body.type === 'payment') {
    const payment = await getPaymentInfo(body.data.id);
    const order = await Order.findById(payment.external_reference);

    if (payment.status === 'approved') {
      order.paymentStatus = 'approved';
      order.status = 'confirmed';
      order.mercadoPagoId = payment.id;
      await order.save();

      // Emitir evento para caja (ver Fase 5)
      await notifyCashier(order);
    }
  }

  return NextResponse.json({ received: true });
}
```

### 3.4 Actualizar Checkout Flow

**Modificar:** `components/cart/CheckoutFlow.jsx`

- Eliminar opción de WhatsApp
- Al confirmar, crear orden y obtener preference de MP
- Redirigir a MP Checkout Pro
- Manejar retorno success/failure/pending

---

## FASE 4: Dashboard de Caja (Semana 4-5)

### 4.1 Estructura de Rutas

```
/caja/[locationId]           → Dashboard principal del cajero
/caja/[locationId]/pedidos   → Lista de pedidos del día
/caja/[locationId]/historial → Pedidos anteriores
```

### 4.2 Componentes del Dashboard

**Layout:** `app/caja/[locationId]/layout.jsx`
- Verificar que el usuario tiene acceso a esa sede
- Header con nombre de sede y usuario
- Navegación lateral

**Dashboard Principal:** `app/caja/[locationId]/page.jsx`
```
┌──────────────────────────────────────────────────────────────┐
│  CAJA - Harrods & Chaves                    👤 Juan (Cajero) │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ NUEVOS  │  │EN PREP. │  │ LISTOS  │  │ENTREGAD.│        │
│  │   12    │  │    5    │  │    3    │  │   45    │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ PEDIDOS ACTIVOS                              🔄 Auto   │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ #0045 │ María García │ 2 items │ $4,500 │ ⏳ NUEVO    │ │
│  │ #0044 │ Juan Pérez   │ 5 items │ $8,200 │ 👨‍🍳 PREP.   │ │
│  │ #0043 │ Ana López    │ 1 item  │ $2,100 │ ✅ LISTO    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Componente de Pedido

**Archivo:** `components/caja/OrderCard.jsx`

```javascript
const OrderCard = ({ order, onStatusChange }) => {
  const statusColors = {
    confirmed: 'bg-yellow-100 border-yellow-400',
    preparing: 'bg-blue-100 border-blue-400',
    ready: 'bg-green-100 border-green-400'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${statusColors[order.status]}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-2xl font-bold">#{order.orderNumber}</span>
          <p className="text-gray-600">{order.customer.name} {order.customer.lastname}</p>
          <p className="text-sm text-gray-500">{order.customer.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">${order.total.toLocaleString()}</p>
          <p className="text-sm">{order.deliveryMethod}</p>
        </div>
      </div>

      {/* Items del pedido */}
      <div className="mt-4 space-y-2">
        {order.items.map(item => (
          <div key={item._id} className="flex justify-between text-sm">
            <span>{item.quantity}x {item.name}</span>
            {item.customizations && (
              <span className="text-gray-500 text-xs">
                {item.customizations.map(c => c.selections.map(s => s.name).join(', ')).join(' | ')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Notas */}
      {order.notes && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
          📝 {order.notes}
        </div>
      )}

      {/* Acciones */}
      <div className="mt-4 flex gap-2">
        {order.status === 'confirmed' && (
          <button onClick={() => onStatusChange('preparing')}
                  className="flex-1 bg-blue-500 text-white py-2 rounded">
            👨‍🍳 Empezar Preparación
          </button>
        )}
        {order.status === 'preparing' && (
          <button onClick={() => onStatusChange('ready')}
                  className="flex-1 bg-green-500 text-white py-2 rounded">
            ✅ Marcar Listo
          </button>
        )}
        {order.status === 'ready' && (
          <button onClick={() => onStatusChange('completed')}
                  className="flex-1 bg-gray-500 text-white py-2 rounded">
            📦 Entregado
          </button>
        )}
      </div>
    </div>
  );
};
```

### 4.4 APIs de Pedidos para Caja

**Endpoints:**
- `GET /api/orders?locationId=X&status=Y&date=Z` - Listar pedidos con filtros
- `PATCH /api/orders/[id]/status` - Cambiar estado del pedido
- `GET /api/orders/[id]` - Detalle de pedido
- `POST /api/orders/[id]/notes` - Agregar nota administrativa

---

## FASE 5: Actualizaciones en Tiempo Real (Semana 5)

### 5.1 Opciones de Implementación

**Opción A: Polling (más simple)**
```javascript
// En el dashboard de caja, hacer fetch cada 10 segundos
useEffect(() => {
  const interval = setInterval(() => {
    fetchOrders();
  }, 10000);
  return () => clearInterval(interval);
}, []);
```

**Opción B: Server-Sent Events (recomendado)**
```javascript
// API: /api/orders/stream
export async function GET(req) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Escuchar cambios en MongoDB
      const changeStream = Order.watch();
      changeStream.on('change', (change) => {
        sendEvent(change);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

**Opción C: WebSockets con Socket.io (más complejo pero más potente)**
- Requiere servidor separado o usar Vercel Edge Functions
- Mejor para notificaciones bidireccionales
- Considerar para Fase 2 del proyecto

### 5.2 Notificaciones de Audio

```javascript
// Cuando llega un nuevo pedido
const playNotificationSound = () => {
  const audio = new Audio('/sounds/new-order.mp3');
  audio.play();
};

// También mostrar notificación del browser
if (Notification.permission === 'granted') {
  new Notification('Nuevo Pedido', {
    body: `Pedido #${order.orderNumber} - ${order.customer.name}`,
    icon: '/logo.png'
  });
}
```

---

## FASE 6: Panel de Manager y Admin (Semana 6)

### 6.1 Dashboard Manager

**Ruta:** `/manager`

```
┌──────────────────────────────────────────────────────────────┐
│  MANAGER - Vista General                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Seleccionar Sede: [Todas ▼] [Harrods ▼] [Sanitarias ▼]     │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  HARRODS        │  │  SANITARIAS     │                   │
│  │  Pedidos: 23    │  │  Pedidos: 15    │                   │
│  │  Ventas: $45k   │  │  Ventas: $32k   │                   │
│  │  🟢 Online      │  │  🟢 Online      │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  📊 Resumen del Día                                          │
│  • Total ventas: $77,500                                     │
│  • Pedidos completados: 38                                   │
│  • Ticket promedio: $2,039                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Dashboard Admin

**Ruta:** `/admin`

Además de todo lo del Manager, incluye:
- Gestión de menú (existente)
- Gestión de usuarios
- Configuración de sedes
- Reportes avanzados

---

## FASE 7: Reportes y Analytics (Semana 7-8)

### 7.1 Métricas a Implementar

```javascript
// API: /api/reports/sales
{
  period: { start: Date, end: Date },

  // Totales
  totalSales: Number,
  totalOrders: Number,
  averageTicket: Number,

  // Por día
  dailySales: [{ date, total, orders }],

  // Por sede
  salesByLocation: [{ locationId, locationName, total, orders }],

  // Productos
  topProducts: [{ itemId, name, quantity, revenue }],

  // Métodos
  salesByDeliveryMethod: { pickup: Number, delivery: Number },

  // Estados
  ordersByStatus: { completed, cancelled, ... }
}
```

### 7.2 Exportación de Reportes

**Archivo:** `lib/reportExporter.js`

```javascript
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export async function exportToExcel(data, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ventas');

  // Headers
  sheet.columns = [
    { header: 'Fecha', key: 'date' },
    { header: 'Pedido', key: 'orderNumber' },
    { header: 'Cliente', key: 'customer' },
    { header: 'Total', key: 'total' },
    { header: 'Estado', key: 'status' }
  ];

  // Data
  data.forEach(row => sheet.addRow(row));

  return workbook.xlsx.writeBuffer();
}

export async function exportToPDF(data, title) {
  const doc = new PDFDocument();
  doc.fontSize(20).text(title, { align: 'center' });
  // ... más lógica de PDF
  return doc;
}
```

### 7.3 UI de Reportes

**Componente:** `components/admin/ReportsPanel.jsx`

- Selector de rango de fechas
- Filtros por sede
- Gráficos con Chart.js o Recharts
- Botones de exportación XLS/PDF
- Tabla de datos con paginación

---

## FASE 8: Impresión Térmica (Futuro - Electron)

### 8.1 Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web App       │────▶│  Electron App   │────▶│ Impresora       │
│   (Vercel)      │     │  (Local)        │     │ Térmica         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │   WebSocket/SSE       │
        └───────────────────────┘
```

### 8.2 Electron App (Concepto)

```javascript
// main.js (Electron)
const { app, BrowserWindow, ipcMain } = require('electron');
const escpos = require('escpos');

// Conectar a impresora térmica
const device = new escpos.USB();
const printer = new escpos.Printer(device);

// Escuchar eventos de la web
ipcMain.on('print-order', (event, order) => {
  device.open(() => {
    printer
      .font('a')
      .align('ct')
      .style('bu')
      .size(1, 1)
      .text(`PEDIDO #${order.orderNumber}`)
      .text('------------------------')
      .align('lt')
      .text(`Cliente: ${order.customer.name}`)
      .text(`Tel: ${order.customer.phone}`)
      .text('------------------------');

    order.items.forEach(item => {
      printer.text(`${item.quantity}x ${item.name}`);
      if (item.customizations) {
        item.customizations.forEach(c => {
          printer.text(`   → ${c.selections.map(s => s.name).join(', ')}`);
        });
      }
    });

    printer
      .text('------------------------')
      .style('b')
      .text(`TOTAL: $${order.total}`)
      .cut()
      .close();
  });
});
```

---

## Cronograma Estimado

| Fase | Descripción | Duración | Dependencias |
|------|-------------|----------|--------------|
| 1 | Personalización de productos | 2 semanas | - |
| 2 | Sistema de roles | 1 semana | - |
| 3 | Integración MercadoPago | 1.5 semanas | Fase 1 |
| 4 | Dashboard de Caja | 1.5 semanas | Fase 2, 3 |
| 5 | Tiempo Real | 1 semana | Fase 4 |
| 6 | Paneles Manager/Admin | 1 semana | Fase 2, 4 |
| 7 | Reportes | 1.5 semanas | Fase 4 |
| 8 | Impresión Térmica | 2 semanas | Todo anterior |

**Total estimado: 11-12 semanas**

---

## Orden de Implementación Recomendado

### Sprint 1 (Semanas 1-2): Base
1. ✅ Modelo de customizaciones en Menu
2. ✅ UI de selección de customizaciones
3. ✅ Actualizar cartStore para manejar customizaciones

### Sprint 2 (Semanas 3-4): Pagos
4. ✅ Integración MercadoPago completa
5. ✅ Actualizar checkout flow (sin WhatsApp)
6. ✅ Webhook de confirmación de pago

### Sprint 3 (Semanas 5-6): Operaciones
7. ✅ Sistema de roles y permisos
8. ✅ Dashboard de caja básico
9. ✅ Gestión de estados de pedido

### Sprint 4 (Semanas 7-8): Gestión
10. ✅ Panel de Manager
11. ✅ Panel de Admin ampliado
12. ✅ Actualizaciones en tiempo real

### Sprint 5 (Semanas 9-10): Analytics
13. ✅ Sistema de reportes
14. ✅ Exportación XLS/PDF
15. ✅ Gráficos y métricas

### Sprint 6 (Semanas 11-12): Extras
16. ✅ App Electron para impresión
17. ✅ Testing y optimización
18. ✅ Documentación

---

## Archivos a Crear/Modificar

### Nuevos Archivos:
```
models/
  └── (actualizar Menu.js y User.js)

lib/
  ├── mercadopago.js
  ├── authorize.js
  └── reportExporter.js

app/
  ├── caja/
  │   └── [locationId]/
  │       ├── layout.jsx
  │       ├── page.jsx
  │       └── pedidos/page.jsx
  ├── manager/
  │   ├── layout.jsx
  │   └── page.jsx
  ├── api/
  │   ├── webhooks/
  │   │   └── mercadopago/route.js
  │   ├── users/
  │   │   ├── route.js
  │   │   └── [id]/route.js
  │   ├── orders/
  │   │   ├── [id]/status/route.js
  │   │   └── stream/route.js
  │   └── reports/
  │       └── sales/route.js
  ├── order-success/[orderNumber]/page.jsx
  └── order-failed/[orderNumber]/page.jsx

components/
  ├── product/
  │   └── ProductCustomizationModal.jsx
  ├── caja/
  │   ├── OrderCard.jsx
  │   ├── OrderList.jsx
  │   └── StatusBadge.jsx
  └── admin/
      ├── ReportsPanel.jsx
      └── UserManagement.jsx
```

---

## Variables de Entorno Adicionales

```env
# MercadoPago (producción)
MP_ACCESS_TOKEN=APP_USR-xxx
MP_PUBLIC_KEY=APP_USR-xxx

# URLs
NEXT_PUBLIC_BASE_URL=https://meeting-pink.vercel.app

# Webhook secret (para validar requests de MP)
MP_WEBHOOK_SECRET=xxx
```

---

## Consideraciones de Seguridad

1. **Validar webhooks de MP** con firma/secret
2. **Sanitizar inputs** de customizaciones (evitar XSS)
3. **Rate limiting** en endpoints públicos
4. **Validar permisos** en cada API route
5. **No exponer datos sensibles** en responses
6. **Usar HTTPS** en todos los callbacks de MP

---

## Próximos Pasos Inmediatos

1. **Confirmar prioridades** - ¿Empezar por customizaciones o por pagos?
2. **Obtener credenciales MP de producción** - Las actuales son de TEST
3. **Definir customizaciones iniciales** - ¿Qué productos las necesitan?
4. **Crear usuarios de prueba** - Para testear roles
5. **Configurar webhook URL en MP** - Necesario para pagos

---

*Documento generado el 28/01/2026*
*Proyecto: Meeting Resto & Bar - Sistema Takeaway*

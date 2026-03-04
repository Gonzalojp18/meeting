# � Analytics & KPIs — TakeasyGo

## �🟢 Admin (Restaurante)

KPIs y métricas disponibles para el administrador de cada restaurante.

| KPI | Descripción |
|-----|-------------|
| Tasa de cancelación | Porcentaje de órdenes canceladas sobre el total |
| Agrupación de órdenes por hora | Heatmap de volumen de pedidos por franja horaria |
| Tasa de pago exitoso | Porcentaje de pagos aprobados vs. rechazados/pendientes |
| Retención generada por red | Clientes que repiten en la misma sucursal o red |
| Tiempo promedio de preparación | Desde confirmación hasta que el pedido está listo |

---

## 🔵 Superadmin

KPIs globales para el superadmin del SaaS, con visibilidad de todos los restaurantes.

| KPI | Descripción |
|-----|-------------|
| Tasa de cancelación global | Tasa de cancelación agregada en toda la plataforma |
| Agrupación de órdenes por hora | Volumen de pedidos por hora a nivel plataforma |
| Sistema de recurrencia de clientes | Frecuencia de re-orden por cliente/teléfono |
| Timestamps operativos | Seguimiento de tiempos clave en el flujo del pedido |
| Tasa de pago exitoso | Tasa de aprobación de pagos en toda la plataforma |
| Retención generada por red | Retención de clientes a nivel de red de restaurantes |
| Proyección de ingresos por comisión | Comisión estimada / real generada por la plataforma |
| Conversión en marketplace *(futuro)* | Si hay exploración, ver conversión de visita → orden |

---

## 🔧 Features Técnicas Necesarias

### 1. Timestamps Operativos en el Modelo `Order`

Campos nuevos a agregar en el schema de MongoDB:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `confirmedAt` | `Date` | Momento en que el restaurante confirma la orden |
| `readyAt` | `Date` | Momento en que el pedido está listo para retirar/entregar |
| `deliveredAt` | `Date` | Momento de entrega al cliente |

**Cálculos derivados:**
- **Tiempo de confirmación:** `confirmedAt - createdAt`
- **Tiempo de preparación:** `readyAt - confirmedAt`
- **Promedio por rango horario**
- **Promedio por sede (locationId)**

---

### 2. Sistema de Recurrencia de Clientes

Track por `customer.phone` o `customer.email` para identificar:
- Clientes que repiten pedidos
- Frecuencia de retorno
- Revenue por cliente recurrente

---

### 3. Conversión en Marketplace *(si hay exploración pública)*

Si se habilita navegación pública del menú, trackear el funnel:

```
Visita → Clic en menú → Orden creada → Pago aprobado
```

| Evento | Campo |
|--------|-------|
| `page_view` | Vista a página del restaurante |
| `menu_click` | Clic en un ítem del menú |
| `order_created` | Orden generada |
| `payment_approved` | Pago aprobado por MercadoPago |

**Tasa de conversión por restaurante:** `órdenes / visitas`

---

### 4. Proyección de Ingresos por Comisión

Requiere definir el modelo de comisión (% fijo o por escalones), luego:
- GMV (Gross Merchandise Value) de la plataforma
- Comisión estimada = GMV × tasa
- Proyección mensual/anual por tendencia

---

### 5. Tracking de Origen del Pedido (Source)

Campo `source` en `Order` para identificar el canal de entrada:

| Valor | Descripción |
|-------|-------------|
| `qr` | Escáner de QR en local |
| `link` | Link directo compartido |
| `marketplace` | Exploración pública |
| `direct` | URL directa conocida |
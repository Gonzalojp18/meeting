/**
 * help.data.js
 * Contenido del Centro de Ayuda, organizado por secciones y filtrado por rol.
 *
 * roles:
 *   'staff'       → solo ve secciones con roles: ['staff', ...]
 *   'admin'       → ve secciones con roles: ['staff', 'admin', ...]
 *   'manager'     → ve secciones con roles: ['staff', 'admin', 'manager', ...]
 *   'superadmin'  → ve todo
 */

export const HELP_SECTIONS = [

    // ─────────────────────────────────────────────────────────────────────────
    // PANEL DE CAJA (para todos los roles)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'caja',
        title: 'Panel de Caja',
        emoji: '🖥️',
        color: 'orange',
        roles: ['staff', 'admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'caja-overview',
                title: '¿Qué es el Panel de Caja?',
                content: `El Panel de Caja es tu central de operaciones en tiempo real. Aquí verás todos los pedidos que llegan a tu sede, organizados por estado, y podrás gestionarlos paso a paso.
        
El panel se actualiza automáticamente cada 30 segundos para mostrarte los pedidos más recientes.`,
            },
            {
                id: 'caja-estados',
                title: 'Estados de un pedido',
                content: `Cada pedido pasa por los siguientes estados en orden:`,
                steps: [
                    '🟡 **Pendiente** — El pedido fue creado pero aún no se confirmó el pago.',
                    '🔵 **Confirmado** — El pago fue aprobado. Toca "Pasar a: Preparando" para comenzar.',
                    '🟠 **Preparando** — La cocina está trabajando en el pedido.',
                    '🟢 **Listo** — El pedido está listo para ser retirado por el cliente.',
                    '⚫ **Completado** — El cliente retiró su pedido.',
                    '🔴 **Cancelado** — El pedido fue cancelado (puede haber reembolso en curso).',
                ],
            },
            {
                id: 'caja-avanzar',
                title: 'Cómo avanzar el estado de un pedido',
                steps: [
                    'Encontrá el pedido en la lista.',
                    'Hacé clic sobre la tarjeta para expandir los detalles.',
                    'Usá el botón naranja **"Pasar a: [siguiente estado]"** para avanzar.',
                    'El cambio se guarda automáticamente y el cliente ve la actualización en su pantalla de seguimiento.',
                ],
                tip: 'Cuando el pedido llega a "Confirmado", la impresora de cocina imprime el ticket automáticamente.',
            },
            {
                id: 'caja-filtros',
                title: 'Filtros y búsqueda',
                content: `Usá los filtros superiores para ver solo un tipo de pedido:`,
                steps: [
                    '**Todos** — Ver todos los pedidos de la sede.',
                    '**Activos** — Solo los pedidos que no están completados ni cancelados.',
                    '**Por estado** — Filtrá por Pendiente, Confirmado, Preparando, Listo o Completado.',
                    '**Por teléfono** — Escribí el número del cliente para encontrar su pedido.',
                ],
            },
            {
                id: 'caja-imprimir',
                title: 'Reimprimir un ticket',
                steps: [
                    'Expandí la tarjeta del pedido.',
                    'Hacé clic en el botón **"Ticket"** (ícono de impresora).',
                    'Se enviará una reimpresión a la impresora asignada.',
                ],
                tip: 'Si la impresora no responde, verificá su estado en la sección Impresoras.',
            },
            {
                id: 'caja-retiro',
                title: 'Confirmar retiro del cliente',
                content: `Cuando el cliente retira su pedido, puede confirmarlo desde su teléfono. Si no lo hace, podés hacerlo manualmente:`,
                steps: [
                    'Expandí el pedido en estado **Listo**.',
                    'Usá el botón verde **"Marcar como Retirado (Override)"**.',
                    'Esto completa el pedido y lo mueve al historial.',
                ],
            },
            {
                id: 'caja-sonido',
                title: 'Notificaciones sonoras',
                content: `El panel emite un sonido cuando llega un nuevo pedido. Podés activarlo o silenciarlo con el ícono de campana en el header. El sonido funciona solo si el navegador tiene permisos de audio activados.`,
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DISPONIBILIDAD (staff + admin)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'disponibilidad',
        title: 'Disponibilidad',
        emoji: '✅',
        color: 'green',
        roles: ['staff', 'admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'disp-overview',
                title: '¿Para qué sirve?',
                content: `La sección de Disponibilidad te permite activar o desactivar ítems del menú en tiempo real. Si un producto se agotó, podés ocultarlo del menú del cliente sin necesidad de eliminarlo.`,
            },
            {
                id: 'disp-uso',
                title: 'Cómo cambiar la disponibilidad de un ítem',
                steps: [
                    'Andá a la pestaña **Disponibilidad** en el menú.',
                    'Buscá el producto que querés modificar.',
                    'Activá o desactivá el toggle al lado del nombre.',
                    'El cambio es inmediato y se refleja en el menú del cliente.',
                ],
                tip: 'Los ítems desactivados no se eliminan — quedan guardados y podés reactivarlos cuando el producto vuelva a estar disponible.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // IMPRESORAS
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'impresoras',
        title: 'Impresoras',
        emoji: '🖨️',
        color: 'blue',
        roles: ['staff', 'admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'imp-overview',
                title: '¿Qué hace esta sección?',
                content: `Desde Impresoras podés gestionar las impresoras térmicas conectadas al sistema. El sistema soporta dos tipos de impresoras por sede: **Caja** (para tickets de cliente) y **Cocina** (para tickets internos).`,
            },
            {
                id: 'imp-estado',
                title: 'Verificar estado de una impresora',
                steps: [
                    'Andá a la pestaña **Impresoras**.',
                    'Cada impresora muestra su estado: 🟢 Online, 🔴 Offline, ⚠️ Error.',
                    'Si está offline, verificá que el agente de impresión esté corriendo en la PC del local.',
                ],
            },
            {
                id: 'imp-prueba',
                title: 'Hacer una prueba de impresión',
                steps: [
                    'Seleccioná la impresora en la lista.',
                    'Hacé clic en **"Prueba de impresión"**.',
                    'Se imprimirá un ticket de prueba con la fecha y nombre de la impresora.',
                ],
                tip: 'Usá esto cuando instales una impresora nueva o después de un reinicio del sistema.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // HISTORIAL DE TICKETS
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'historial',
        title: 'Historial de Tickets',
        emoji: '📋',
        color: 'gray',
        roles: ['staff', 'admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'hist-overview',
                title: '¿Qué muestra el historial?',
                content: `El Historial registra todos los intentos de impresión: exitosos y con error. Es útil para auditar problemas de impresión y confirmar que los tickets se enviaron correctamente.`,
            },
            {
                id: 'hist-uso',
                title: 'Cómo consultar el historial',
                steps: [
                    'Andá a la pestaña **Historial**.',
                    'Filtrá por fecha o por impresora.',
                    'Cada entrada muestra: número de pedido, tipo de ticket (caja/cocina), estado (éxito/error) y timestamp.',
                ],
                tip: 'Si un ticket aparece con error, podés reimprimir desde el Panel de Caja buscando el pedido por número.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'dashboard',
        title: 'Dashboard',
        emoji: '📊',
        color: 'orange',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'dash-overview',
                title: '¿Qué muestra el Dashboard?',
                content: `El Dashboard es la vista principal del panel de administración. Muestra un resumen del rendimiento del mes actual: ventas, órdenes, ticket promedio y comparativa de sedes.`,
            },
            {
                id: 'dash-filtro-sede',
                title: 'Filtrar por sede',
                content: `Si tenés varias sedes, podés seleccionar una en el selector del encabezado del Dashboard. Los números se actualizarán para mostrar solo los datos de esa sede.`,
                tip: 'Seleccioná "Todas las sedes" para ver el consolidado.',
            },
            {
                id: 'dash-metricas',
                title: 'Métricas del catálogo',
                content: `El Dashboard también muestra cuántos productos y categorías hay activos en el menú, y cuántas promociones están configuradas actualmente.`,
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MÉTRICAS OPERACIONALES (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'metricas',
        title: 'Métricas Operacionales',
        emoji: '📈',
        color: 'amber',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'met-horas',
                title: 'Órdenes por hora (horas pico)',
                content: `El gráfico de barras muestra en qué horarios del día recibís más pedidos. La barra más alta es la hora pico. Usá esta información para planificar el staffing.`,
                tip: 'Los datos se muestran en hora local de Argentina (Buenos Aires). Solo se cuentan pedidos activos, no cancelados.',
            },
            {
                id: 'met-preparacion',
                title: 'Tiempo promedio de preparación',
                content: `Esta tabla muestra cuánto tarda en promedio tu sede desde que el pedido es confirmado hasta que está listo.`,
                steps: [
                    '🟢 Menos de 20 minutos — Excelente rendimiento.',
                    '🟡 Entre 20 y 30 minutos — Aceptable, pero hay margen de mejora.',
                    '🔴 Más de 30 minutos — Revisar el proceso de cocina.',
                ],
                tip: 'Esta métrica se acumula con el uso. Las órdenes anteriores a la actualización del sistema no tienen datos de tiempo.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCTOS (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'productos',
        title: 'Productos',
        emoji: '🍽️',
        color: 'orange',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'prod-agregar',
                title: 'Agregar un producto',
                steps: [
                    'Andá a la pestaña **Productos**.',
                    'Buscá la categoría donde querés agregar el ítem.',
                    'Hacé clic en el botón **"+ Agregar Item"**.',
                    'Completá el formulario: nombre, descripción, precio, foto (opcional) y personalizaciones.',
                    'Guardá los cambios.',
                ],
            },
            {
                id: 'prod-editar',
                title: 'Editar o eliminar un producto',
                steps: [
                    'Encontrá el producto en la lista.',
                    'Usá el ícono de lápiz para editar o el ícono de papelera para eliminar.',
                    'Confirmá la acción. La eliminación es irreversible.',
                ],
                tip: 'Si no querés eliminar el producto sino ocultarlo temporalmente, usá **Disponibilidad** en cambio.',
            },
            {
                id: 'prod-personalizaciones',
                title: 'Personalizaciones de un producto',
                content: `Podés agregar grupos de opciones a cada producto (ej: "Punto de cocción", "Salsas"). Cada grupo puede ser de selección única o múltiple.`,
                steps: [
                    'Al editar un producto, buscá la sección **"Personalizaciones"**.',
                    'Agregá un grupo con nombre y tipo (única o múltiple).',
                    'Añadí las opciones dentro de ese grupo.',
                    'Guardá el producto.',
                ],
            },
            {
                id: 'prod-reorden',
                title: 'Reordenar productos',
                content: `Podés cambiar el orden en que aparecen los productos dentro de una categoría arrastrando y soltando las tarjetas. El orden se guarda automáticamente.`,
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORÍAS (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'categorias',
        title: 'Categorías',
        emoji: '📂',
        color: 'blue',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'cat-overview',
                title: 'Gestión de categorías',
                content: `Las categorías agrupan los productos del menú (ej: Entradas, Principales, Bebidas). Podés crearlas, editarlas, reordenarlas y eliminarlas.`,
            },
            {
                id: 'cat-crear',
                title: 'Crear una categoría',
                steps: [
                    'Andá a la pestaña **Categorías**.',
                    'Hacé clic en **"Nueva Categoría"**.',
                    'Ingresá el nombre y, opcionalmente, una descripción.',
                    'Guardá. La categoría aparecerá en el menú del cliente.',
                ],
                tip: 'Las categorías nuevas aparecen al final. Podés reordenarlas después.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // UPSELLING (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'upselling',
        title: 'Upselling Inteligente',
        emoji: '🤖',
        color: 'emerald',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'ups-overview',
                title: '¿Qué es el Upselling?',
                content: `El sistema de Upselling sugiere automáticamente productos adicionales al cliente durante el proceso de pedido. Por ejemplo, si el cliente agrega una hamburguesa, el sistema puede sugerir papas fritas o una bebida.

Las ventas generadas por upselling se marcan como "upsell" en los reportes, diferenciándolas de las orgánicas.`,
            },
            {
                id: 'ups-crear',
                title: 'Crear una regla de upselling',
                steps: [
                    'Andá a la pestaña **Upselling**.',
                    'Hacé clic en **"Nueva Regla"**.',
                    'Definí el producto disparador (trigger) y el producto sugerido.',
                    'Configurá el mensaje que verá el cliente.',
                    'Activá la regla y guardá.',
                ],
                tip: 'Mantené el número de reglas razonable. Muchas sugerencias pueden ser contraproducentes.',
            },
            {
                id: 'ups-metricas',
                title: 'Medir la efectividad',
                content: `En los reportes podés ver cuántas ventas provinieron de upselling vs. selección orgánica del cliente. Esto te permite evaluar qué reglas funcionan y cuáles desactivar.`,
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // USUARIOS (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'usuarios',
        title: 'Gestión de Usuarios',
        emoji: '👥',
        color: 'purple',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'usr-roles',
                title: 'Roles disponibles',
                content: `El sistema tiene los siguientes roles:`,
                steps: [
                    '**Admin** — Acceso completo al panel, incluyendo credenciales de pago y auditoría.',
                    '**Manager** — Similar al admin, pero sin acceso a credenciales de MercadoPago.',
                    '**Staff** — Solo accede al Panel de Caja y funciones operativas.',
                ],
            },
            {
                id: 'usr-crear',
                title: 'Crear un usuario',
                steps: [
                    'Andá a **Usuarios**.',
                    'Hacé clic en **"Nuevo Usuario"**.',
                    'Ingresá nombre, email, contraseña y seleccioná el rol.',
                    'Si es Staff, asignale al menos una sede.',
                    'Guardá. El usuario ya puede iniciar sesión.',
                ],
                tip: 'Asignale solo las sedes que el staff necesita. No des acceso innecesario.',
            },
            {
                id: 'usr-desactivar',
                title: 'Desactivar un usuario',
                content: `Podés desactivar un usuario sin eliminarlo. Esto bloquea su acceso sin perder su historial. Útil cuando alguien deja de trabajar temporalmente.`,
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // REPORTES (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'reportes',
        title: 'Reportes de Ventas',
        emoji: '📄',
        color: 'orange',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'rep-overview',
                title: '¿Qué incluyen los reportes?',
                content: `Los reportes muestran un resumen de ventas con detalle de órdenes, productos más vendidos, totales por sede y comparativas de período. Podés exportarlos en PDF o Excel.`,
            },
            {
                id: 'rep-exportar',
                title: 'Exportar un reporte',
                steps: [
                    'Andá a **Reportes**.',
                    'Seleccioná el rango de fechas (inicio y fin).',
                    'Opcionalmente filtrá por sede.',
                    'Hacé clic en **"Exportar PDF"** o **"Exportar Excel"**.',
                    'El archivo se descargará automáticamente.',
                ],
                tip: 'Los reportes en Excel son ideales para análisis propio. Los PDF son más prácticos para presentar a terceros.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // REEMBOLSOS (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'reembolsos',
        title: 'Reembolsos',
        emoji: '💰',
        color: 'red',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'ref-overview',
                title: '¿Cómo funcionan los reembolsos?',
                content: `Cuando un pedido se cancela con pago aprobado, el sistema inicia un proceso de reembolso a través de MercadoPago. El dinero vuelve al cliente en 10-30 días hábiles según el banco.`,
            },
            {
                id: 'ref-proceso',
                title: 'Procesar un reembolso',
                steps: [
                    'Andá a la pestaña **Reembolsos**.',
                    'Buscá el pedido con reembolso pendiente.',
                    'Revisá los detalles y hacé clic en **"Procesar Reembolso"**.',
                    'El sistema enviará la solicitud a MercadoPago.',
                    'El estado cambiará a "Procesando" y luego a "Completado" cuando se confirme.',
                ],
                tip: 'Solo los pedidos con paymentStatus "approved" pueden ser reembolsados. Si el pago estaba pendiente, no hay nada que reembolsar.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AJUSTES (admin + manager)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'ajustes',
        title: 'Ajustes del Sistema',
        emoji: '⚙️',
        color: 'gray',
        roles: ['admin', 'manager', 'superadmin'],
        articles: [
            {
                id: 'ajt-mp',
                title: 'Credenciales de MercadoPago (solo Admin)',
                content: `En esta sección el administrador configura las credenciales de MercadoPago para habilitar el cobro online. Sin estas credenciales el pago no funciona.`,
                tip: 'Solo el rol Admin puede ver y editar las credenciales de MercadoPago. Los Manager ven un mensaje informativo.',
            },
            {
                id: 'ajt-takeaway',
                title: 'Configuración de Takeaway',
                content: `Configurá los tiempos de espera estimados y las opciones de entrega disponibles para los clientes (Retiro en Sucursal / A domicilio).`,
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AUDITORÍA (solo admin)
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'auditoria',
        title: 'Auditoría',
        emoji: '🔒',
        color: 'slate',
        roles: ['admin', 'superadmin'],
        articles: [
            {
                id: 'aud-overview',
                title: '¿Qué registra la Auditoría?',
                content: `La Auditoría registra todas las acciones importantes realizadas por los usuarios del panel: cambios de estado en pedidos, ediciones de productos, creación/eliminación de usuarios, cambios de configuración, etc.`,
            },
            {
                id: 'aud-interpretar',
                title: 'Cómo interpretar el log',
                content: `Cada entrada del log muestra:`,
                steps: [
                    '**Fecha y hora** — Cuándo ocurrió la acción.',
                    '**Usuario** — Quién realizó la acción (nombre y rol).',
                    '**Acción** — Qué se hizo (ej: "Cambio de estado de pedido").',
                    '**Detalle** — Información adicional sobre el cambio.',
                ],
                tip: 'Usá la auditoría para investigar discrepancias o para verificar quién modificó qué en el sistema.',
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYTICS SUPERADMIN
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'analytics',
        title: 'Analytics de Plataforma',
        emoji: '🌐',
        color: 'purple',
        roles: ['superadmin'],
        articles: [
            {
                id: 'ana-gmv',
                title: 'GMV — Gross Merchandise Value',
                content: `El GMV es la suma total de todos los pedidos con pago aprobado en la plataforma. Es la métrica base para entender el volumen del negocio.`,
            },
            {
                id: 'ana-comision',
                title: 'Proyección de comisión hipotética',
                content: `Este KPI muestra cuánto generaría la plataforma si cobrara el 10% de cada pedido aprobado. Es un escenario hipotético para evaluar el potencial de monetización.

⚠️ Este número NO es un cobro real — es una proyección financiera.`,
            },
            {
                id: 'ana-recurrencia',
                title: 'Recurrencia de clientes',
                content: `Muestra cuántos clientes (identificados por número de teléfono) realizaron más de un pedido. La tasa de recurrencia es un indicador de fidelización.`,
                tip: 'Una tasa de recurrencia superior al 25% es considerada muy buena para este tipo de negocio.',
            },
            {
                id: 'ana-retencion',
                title: 'Retención por red',
                content: `Clientes que realizaron pedidos en más de una sede de la plataforma. Indica que el cliente conoce la red y no solo un local específico.`,
            },
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SUPERADMIN — LOCACIONES / CLIENTES
    // ─────────────────────────────────────────────────────────────────────────
    {
        id: 'locaciones',
        title: 'Gestión de Locaciones',
        emoji: '📍',
        color: 'indigo',
        roles: ['superadmin'],
        articles: [
            {
                id: 'loc-overview',
                title: '¿Qué son las locaciones?',
                content: `Las locaciones son las sedes físicas de los restaurantes registrados en la plataforma. Desde aquí podés agregar nuevas sedes, editar sus datos y gestionar su estado.`,
            },
        ],
    },
    {
        id: 'clientes',
        title: 'Clientes de la Plataforma',
        emoji: '👤',
        color: 'teal',
        roles: ['superadmin'],
        articles: [
            {
                id: 'cli-overview',
                title: '¿Qué muestra Clientes?',
                content: `El listado de Clientes muestra todos los usuarios finales que realizaron al menos un pedido en la plataforma. Podés ver su historial de pedidos y datos de contacto.`,
            },
        ],
    },
];

/**
 * Filtra las secciones de ayuda según el rol del usuario.
 * El superadmin ve todo. El resto ve solo lo que su rol permite.
 */
export function getHelpSectionsForRole(role) {
    if (!role) return [];
    if (role === 'superadmin') return HELP_SECTIONS;
    return HELP_SECTIONS.filter(section => section.roles.includes(role));
}

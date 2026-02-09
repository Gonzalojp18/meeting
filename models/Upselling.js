import mongoose from 'mongoose';

/**
 * UPSELLING MODEL
 * 
 * Sistema de upselling inteligente para sugerencias de venta cruzada.
 * Los precios se calculan dinámicamente desde el menú.
 * Soporta múltiples ubicaciones de display con tracking de métricas.
 */

const upsellingSchema = new mongoose.Schema(
    {
        // Nombre interno para admin
        name: {
            type: String,
            required: [true, 'El nombre es requerido'],
            trim: true
        },

        // Tipo de promoción
        type: {
            type: String,
            enum: ['upsell', 'cross-sell', 'combo', 'upgrade'],
            required: true
        },

        // Categoría comercial (para filtros admin)
        category: {
            type: String,
            enum: [
                'cafeteria', 'desayunos', 'hamburguesas', 'sandwiches',
                'platos', 'ensaladas', 'wraps', 'tartas', 'bigtoast',
                'entradas', 'postres', 'muffins', 'alfajores', 'licuados',
                'detox', 'bebidas', 'combos-especiales'
            ],
            required: true
        },

        // Producto que dispara la sugerencia (null = sin trigger, se muestra en categoría)
        triggerItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Menu.categories.items',
            default: null
        },

        // Nombre del trigger (para display en admin sin hacer lookup)
        triggerItemName: {
            type: String,
            trim: true,
            default: null
        },

        // Categoría donde mostrar si no hay trigger específico
        triggerCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        triggerCategoryName: {
            type: String,
            trim: true,
            default: null
        },

        // Productos sugeridos
        suggestedItems: [{
            itemId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            itemName: {
                type: String,
                required: true,
                trim: true
            },
            // Precio se obtiene dinámicamente del menú, no se guarda aquí
        }],

        // Copy publicitario para el cliente
        copyText: {
            type: String,
            required: [true, 'El texto de la promoción es requerido'],
            trim: true,
            maxlength: 100
        },

        // Descripción opcional más larga
        description: {
            type: String,
            trim: true,
            maxlength: 200
        },

        // Nivel de ticket esperado
        ticketLevel: {
            type: String,
            enum: ['bajo', 'medio', 'alto'],
            default: 'medio'
        },

        // Momento del día ideal
        timing: {
            type: String,
            enum: ['mañana', 'tarde', 'noche', 'todo-el-dia'],
            default: 'todo-el-dia'
        },

        // Días activos (0=domingo, 1=lunes, ..., 6=sábado)
        daysActive: {
            type: [Number],
            default: [0, 1, 2, 3, 4, 5, 6] // Todos los días por defecto
        },

        // UBICACIONES DE DISPLAY - El admin controla dónde se muestra
        displayLocations: {
            // Mostrar en la carta/menú takeaway (como banner en categoría)
            inMenu: {
                type: Boolean,
                default: false
            },
            // Mostrar en el checkout
            inCheckout: {
                type: Boolean,
                default: true
            },
            // Mostrar en el carrito drawer
            inCart: {
                type: Boolean,
                default: true
            }
        },

        // Estado activo/inactivo
        isActive: {
            type: Boolean,
            default: true
        },

        // Prioridad para ordenamiento (mayor = más prioritario)
        priority: {
            type: Number,
            default: 0
        },

        // Límite de veces que se muestra por sesión de usuario
        displayLimit: {
            type: Number,
            default: 3
        },

        // MÉTRICAS DE ALCANCE
        metrics: {
            // Impresiones totales
            impressions: {
                total: { type: Number, default: 0 },
                inMenu: { type: Number, default: 0 },
                inCheckout: { type: Number, default: 0 },
                inCart: { type: Number, default: 0 }
            },
            // Clicks/Agregados al carrito
            clicks: {
                total: { type: Number, default: 0 },
                inMenu: { type: Number, default: 0 },
                inCheckout: { type: Number, default: 0 },
                inCart: { type: Number, default: 0 }
            },
            // Tasa de conversión se calcula: clicks.total / impressions.total
            lastImpressionAt: Date,
            lastClickAt: Date
        },

        // Location del restaurante (null = todas las locations)
        locationId: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Índices para consultas eficientes
upsellingSchema.index({ isActive: 1, 'displayLocations.inMenu': 1 });
upsellingSchema.index({ isActive: 1, 'displayLocations.inCheckout': 1 });
upsellingSchema.index({ isActive: 1, 'displayLocations.inCart': 1 });
upsellingSchema.index({ triggerItemId: 1, isActive: 1 });
upsellingSchema.index({ triggerCategoryId: 1, isActive: 1 });
upsellingSchema.index({ category: 1, isActive: 1 });
upsellingSchema.index({ type: 1 });
upsellingSchema.index({ priority: -1 });

// Virtual para tasa de conversión
upsellingSchema.virtual('conversionRate').get(function () {
    if (!this.metrics?.impressions?.total || this.metrics.impressions.total === 0) {
        return 0;
    }
    return ((this.metrics.clicks.total / this.metrics.impressions.total) * 100).toFixed(2);
});

// Asegurar que los virtuals se incluyan en JSON
upsellingSchema.set('toJSON', { virtuals: true });
upsellingSchema.set('toObject', { virtuals: true });

export default mongoose.models.Upselling || mongoose.model('Upselling', upsellingSchema);

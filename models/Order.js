import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Información del cliente (sin registro)
    customer: {
      name: {
        type: String,
        required: [true, "El nombre es requerido"],
        trim: true,
      },
      lastname: {
        type: String,
        required: [true, "El apellido es requerido"],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, "El teléfono es requerido"],
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },

    // Items del pedido
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        customizations: [
          {
            groupName: String,
            selected: String,
          },
        ],
        // Origen del item: 'organic' = seleccionado por el cliente, 'upsell' = sugerido por el sistema
        origin: {
          type: String,
          enum: ['organic', 'upsell'],
          default: 'organic',
        },
        // ID del upselling que originó este item (solo si origin = 'upsell')
        upsellId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
      },
    ],

    // Ubicación
    location: {
      locationId: {
        type: String,
        required: true,
      },
      locationName: {
        type: String,
        required: true,
      },
    },

    // Método de entrega
    deliveryMethod: {
      type: String,
      enum: ["Retiro en Sucursal", "A domicilio"],
      required: true,
    },

    deliveryAddress: {
      type: String,
      trim: true,
    },

    // Pago (solo MercadoPago)
    paymentMethod: {
      type: String,
      default: "Mercado Pago",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "refunded"],
      default: "pending",
    },

    mercadoPagoId: {
      type: String,
      trim: true,
    },

    // Estado del pedido
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    // Precios
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Notas
    notes: {
      type: String,
      trim: true,
    },

    adminNotes: {
      type: String,
      trim: true,
    },

    // Timestamps adicionales
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,

    // Confirmación de retiro por cliente
    customerPickupConfirmed: {
      type: Boolean,
      default: false,
    },
    customerPickupAt: Date,

    // Información de reembolso/cancelación
    refund: {
      status: {
        type: String,
        enum: ['none', 'pending', 'processing', 'completed', 'failed'],
        default: 'none'
      },
      requestedAt: Date,
      requestedBy: { // Cliente que solicitó
        name: String,
        phone: String,
        email: String
      },
      processedAt: Date,
      processedBy: { // Admin/Manager que procesó
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        userRole: String
      },
      mercadoPagoRefundId: String,
      amount: Number,
      reason: String,
      notes: String, // Notas internas del admin
      errorMessage: String // Para capturar errores de MP
    },

    // Flag para excluir de métricas (cancelados/reembolsados)
    canBeCounted: {
      type: Boolean,
      default: true
    },

    // Soft Delete flag
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Estado de impresión (para el orquestador Saga)
    printStatus: {
      printed: { type: Boolean, default: false },
      error: { type: Boolean, default: false },
      lastError: { type: String, trim: true },
      needsManualReprint: { type: Boolean, default: false },
      targetUids: [{ type: String }],
    },

    // Historial detallado de impresiones (Feature Request)
    printHistory: [
      {
        role: String, // 'cashier', 'kitchen'
        printerName: String,
        status: String, // 'success', 'error'
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Índices para consultas eficientes
orderSchema.index({ 'refund.status': 1, createdAt: -1 });
orderSchema.index({ canBeCounted: 1, createdAt: -1 });
orderSchema.index({ status: 1, 'location.locationId': 1 });

export default mongoose.models.Order || mongoose.model("Order", orderSchema);

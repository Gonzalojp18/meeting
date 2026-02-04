import mongoose from 'mongoose';

// Schema para cada opción de customización (ej: "Puré", "Papas Fritas")
const customizationOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  priceModifier: {
    type: Number,
    default: 0  // Ej: +500 para agregar queso extra
  },
  isDefault: {
    type: Boolean,
    default: false  // Si está preseleccionado
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
});

// Schema para grupos de customización (ej: "Guarnición", "Tipo de Leche")
const customizationGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true  // "Guarnición", "Tipo de Leche", "Punto de Cocción"
  },
  type: {
    type: String,
    enum: ['single', 'multiple'],  // single = radio buttons, multiple = checkboxes
    default: 'single'
  },
  required: {
    type: Boolean,
    default: false  // Si el cliente DEBE elegir algo
  },
  maxSelections: {
    type: Number,
    default: 1  // Para type: 'multiple', cuántos puede elegir máximo
  },
  options: [customizationOptionSchema]
});

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  description: String,
  prices: {
    location1: {
      type: Number,
      required: [true, "This field can't be empty"],
      min: 0
    },
    location2: {
      type: Number,
      required: [true, "This field can't be empty"],
      min: 0
    },
    location3: {
      type: Number,
      min: 0
    }
  },
  image: {
    type: String,
    trim: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  // NUEVO: Customizaciones del producto
  customizations: [customizationGroupSchema],
  // NUEVO: Tiempo estimado de preparación en minutos
  preparationTime: {
    type: Number,
    default: 15
  }
});

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "This field can't be empty"],
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  style: {
    type: String,
    enum: ['default', 'compact', 'featured'],
    default: 'default'
  },
  image: {
    url: { type: String, trim: true },
    position: {
      type: String,
      enum: ['top', 'bottom', 'beside-title']
    },
    alt: { type: String, trim: true }
  },
  items: [itemSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  // Sedes donde aplica esta categoría (vacío = todas las sedes)
  locations: {
    type: [String],
    default: []
  },
  // Horario de disponibilidad para takeaway (null = hereda horario global)
  schedule: {
    availableFrom: {
      type: String,
      default: null
    },
    availableTo: {
      type: String,
      default: null
    }
  }
});

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameId: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const menuSchema = new mongoose.Schema(
  {
    categories: [categorySchema],
    locations: [locationSchema],
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Menu || mongoose.model('Menu', menuSchema);

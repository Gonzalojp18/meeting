import mongoose from "mongoose";
const printerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
    },
    uid: {
      type: String,
      required: [
        true,
        "El UID es requerido (proviene del hardware o simulador)",
      ],
      unique: true,
      trim: true,
    },
    connectionType: {
      type: String,
      enum: ["network", "usb"],
      default: "network",
    },
    ip: {
      type: String,
      trim: true,
      // No requerida, porque impresoras USB no tienen IP (el agente las enruta por COM)
    },
    port: {
      type: mongoose.Schema.Types.Mixed, // Permite Number (9100) o String ('COM3', '/dev/usb/lp0')
      default: 9100,
    },
    baudRate: {
      type: Number,
      default: 9600, // Común para serial, aunque su default será 38400 en UI
    },
    paperWidth: {
      type: Number,
      enum: [58, 80],
      default: 80,
    },
    roles: [
      {
        type: String,
        enum: ["kitchen", "bar", "cashier", "main"],
        default: ["kitchen"],
      },
    ],
    locationId: {
      type: String,
      required: [true, "La sede es requerida"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastStatus: {
      type: String,
      enum: ["online", "offline", "error", "pending", "unknown"],
      default: "unknown",
    },
    statusMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

printerSchema.index({ name: 1, locationId: 1 }, { unique: true });

export default mongoose.models.Printer ||
  mongoose.model("Printer", printerSchema);

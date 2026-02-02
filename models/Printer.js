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
    ip: {
      type: String,
      required: [true, "La IP es requerida"],
      trim: true,
    },
    port: {
      type: Number,
      default: 9100,
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

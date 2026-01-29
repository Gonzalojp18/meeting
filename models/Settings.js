import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

// Singleton pattern: solo debe haber un documento por key
SettingsSchema.statics.getValue = async function(key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : null;
};

SettingsSchema.statics.setValue = async function(key, value) {
  return this.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true }
  );
};

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

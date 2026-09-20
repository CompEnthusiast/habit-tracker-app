const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'Health' },
  color: { type: String, default: 'accent2' },
  targetPerWeek: { type: Number, min: 1, max: 7, default: 7 },
  reminderEnabled: { type: Boolean, default: false },
  reminderTime: { type: String, default: '' },
  // days: { "1": true, "15": true, ... } keyed by "YYYY-MM-DD-day" or just day number per month
  // Store as map of "YYYY-MM": { "1": true, "5": true }
  completions: {
    type: Map,
    of: Boolean,
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Habit', habitSchema);

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
  autoSync: {
    enabled: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ['none', 'google_calendar', 'google_tasks', 'google_fit'],
      default: 'none',
    },
    keyword: { type: String, default: '', trim: true },
    fitMetric: {
      type: String,
      enum: ['steps', 'active_minutes', 'calories', 'distance'],
      default: 'steps',
    },
    targetValue: { type: Number, default: 10000 },
  },
  // days: { "YYYY-MM-DD": true, ... }
  completions: {
    type: Map,
    of: Boolean,
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Habit', habitSchema);

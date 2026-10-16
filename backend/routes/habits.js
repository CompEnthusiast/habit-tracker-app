const express = require('express');
const Habit = require('../models/Habit');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

/** Helper to get today's date in YYYY-MM-DD */
function getTodayDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/habits — get all active habits for logged-in user
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id, deleted: { $ne: true } }).sort({ createdAt: 1 });
    const result = habits.map((h) => ({
      _id: h._id,
      name: h.name,
      category: h.category,
      color: h.color,
      priority: h.priority || 'Medium',
      recurring: h.recurring || 'daily',
      carryOver: h.carryOver !== undefined ? h.carryOver : true,
      targetPerWeek: h.targetPerWeek,
      reminderEnabled: h.reminderEnabled,
      reminderTime: h.reminderTime,
      autoSync: h.autoSync || { enabled: false, source: 'none', keyword: '', fitMetric: 'steps', targetValue: 10000 },
      completions: Object.fromEntries(h.completions || new Map()),
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/habits — create a new habit
router.post('/', async (req, res) => {
  try {
    const {
      name,
      category,
      color,
      priority,
      recurring,
      carryOver,
      targetPerWeek,
      reminderEnabled,
      reminderTime,
      autoSync,
    } = req.body;

    const habit = await Habit.create({
      user: req.user._id,
      name,
      category,
      color,
      priority: priority || 'Medium',
      recurring: recurring || 'daily',
      carryOver: carryOver !== undefined ? carryOver : true,
      targetPerWeek,
      reminderEnabled,
      reminderTime,
      autoSync: autoSync || { enabled: false, source: 'none', keyword: '', fitMetric: 'steps', targetValue: 10000 },
    });

    res.status(201).json({
      _id: habit._id,
      name: habit.name,
      category: habit.category,
      color: habit.color,
      priority: habit.priority,
      recurring: habit.recurring,
      carryOver: habit.carryOver,
      targetPerWeek: habit.targetPerWeek,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime,
      autoSync: habit.autoSync,
      completions: {},
      createdAt: habit.createdAt,
      updatedAt: habit.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/habits/:id — update habit details
router.patch('/:id', async (req, res) => {
  try {
    const allowed = [
      'name',
      'category',
      'color',
      'priority',
      'recurring',
      'carryOver',
      'targetPerWeek',
      'reminderEnabled',
      'reminderTime',
      'autoSync',
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );
    updates.updatedAt = new Date();

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, deleted: { $ne: true } },
      updates,
      { new: true, runValidators: true }
    );
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    res.json({
      _id: habit._id,
      name: habit.name,
      category: habit.category,
      color: habit.color,
      priority: habit.priority,
      recurring: habit.recurring,
      carryOver: habit.carryOver,
      targetPerWeek: habit.targetPerWeek,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime,
      autoSync: habit.autoSync,
      completions: Object.fromEntries(habit.completions || new Map()),
      createdAt: habit.createdAt,
      updatedAt: habit.updatedAt,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/habits/:id — soft delete with tombstone
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { deleted: true, deletedAt: new Date(), updatedAt: new Date() },
      { new: true }
    );
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json({ message: 'Habit deleted successfully', id: habit._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/habits/:id/toggle — toggle a day completion with locked history enforcement
// Body: { key: "2026-10-16" }
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { key } = req.body; // e.g. "2026-10-16"
    if (!key) return res.status(400).json({ message: 'Date key is required' });

    const todayKey = getTodayDateKey();
    if (key < todayKey) {
      return res.status(400).json({
        message: 'History is strictly locked. Past days cannot be edited or unticked.',
        isLocked: true,
      });
    }

    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id, deleted: { $ne: true } });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const current = habit.completions.get(key) || false;
    habit.completions.set(key, !current);
    habit.updatedAt = new Date();
    await habit.save();

    res.json({
      _id: habit._id,
      completions: Object.fromEntries(habit.completions),
      updatedAt: habit.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/habits/sync — batch sync endpoint for offline mutations & conflict resolution
router.post('/sync', async (req, res) => {
  try {
    const { mutations = [] } = req.body;
    const todayKey = getTodayDateKey();
    const results = [];

    for (const m of mutations) {
      try {
        if (m.type === 'toggle') {
          const { habitId, key } = m.payload;
          if (key < todayKey) {
            results.push({ status: 'rejected', reason: 'Past day locked', id: m.id });
            continue;
          }
          const habit = await Habit.findOne({ _id: habitId, user: req.user._id });
          if (habit) {
            const current = habit.completions.get(key) || false;
            habit.completions.set(key, !current);
            habit.updatedAt = new Date();
            await habit.save();
            results.push({ status: 'applied', id: m.id });
          }
        } else if (m.type === 'delete') {
          await Habit.findOneAndUpdate(
            { _id: m.payload.habitId, user: req.user._id },
            { deleted: true, deletedAt: new Date(), updatedAt: new Date() }
          );
          results.push({ status: 'applied', id: m.id });
        }
      } catch (mutationErr) {
        results.push({ status: 'error', error: mutationErr.message, id: m.id });
      }
    }

    // Return the latest active habits
    const activeHabits = await Habit.find({ user: req.user._id, deleted: { $ne: true } });
    const formatted = activeHabits.map((h) => ({
      _id: h._id,
      name: h.name,
      category: h.category,
      color: h.color,
      priority: h.priority || 'Medium',
      recurring: h.recurring || 'daily',
      carryOver: h.carryOver !== undefined ? h.carryOver : true,
      targetPerWeek: h.targetPerWeek,
      reminderEnabled: h.reminderEnabled,
      reminderTime: h.reminderTime,
      autoSync: h.autoSync,
      completions: Object.fromEntries(h.completions || new Map()),
      updatedAt: h.updatedAt,
    }));

    res.json({
      success: true,
      results,
      habits: formatted,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

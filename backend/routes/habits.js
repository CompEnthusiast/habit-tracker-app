const express = require('express');
const Habit = require('../models/Habit');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/habits — get all habits for logged-in user
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: 1 });
    // Convert Mongoose Map to plain object for each habit
    const result = habits.map(h => ({
      _id: h._id,
      name: h.name,
      category: h.category,
      color: h.color,
      targetPerWeek: h.targetPerWeek,
      reminderEnabled: h.reminderEnabled,
      reminderTime: h.reminderTime,
      completions: Object.fromEntries(h.completions),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/habits — create a new habit
router.post('/', async (req, res) => {
  try {
    const { name, category, color, targetPerWeek, reminderEnabled, reminderTime } = req.body;
    const habit = await Habit.create({
      user: req.user._id,
      name,
      category,
      color,
      targetPerWeek,
      reminderEnabled,
      reminderTime,
    });
    res.status(201).json({
      _id: habit._id,
      name: habit.name,
      category: habit.category,
      color: habit.color,
      targetPerWeek: habit.targetPerWeek,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime,
      completions: {},
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/habits/:id — update habit details
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'category', 'color', 'targetPerWeek', 'reminderEnabled', 'reminderTime'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json({
      _id: habit._id,
      name: habit.name,
      category: habit.category,
      color: habit.color,
      targetPerWeek: habit.targetPerWeek,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime,
      completions: Object.fromEntries(habit.completions),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/habits/:id — delete a habit
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/habits/:id/toggle — toggle a day completion
// Body: { key: "2026-09-05" }
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { key } = req.body; // e.g. "2026-09-05"
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const current = habit.completions.get(key) || false;
    habit.completions.set(key, !current);
    await habit.save();

    res.json({
      _id: habit._id,
      completions: Object.fromEntries(habit.completions),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

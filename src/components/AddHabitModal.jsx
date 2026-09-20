import { useEffect, useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'accent1', label: 'Pink', hex: '#ec4899' },
  { id: 'accent2', label: 'Cyan', hex: '#06b6d4' },
  { id: 'accent3', label: 'Amber', hex: '#f59e0b' },
  { id: 'primary', label: 'Blue', hex: '#3b82f6' },
  { id: 'secondary', label: 'Purple', hex: '#a855f7' },
  { id: 'success', label: 'Green', hex: '#22c55e' },
];

const CATEGORY_OPTIONS = [
  'Health', 'Self Care', 'Productivity', 'Work', 'Fitness', 'Learning', 'Mindfulness', 'Social',
];

export default function AddHabitModal({ onClose, onAdd, onUpdate, editingHabit = null }) {
  const [name, setName] = useState(editingHabit?.name || '');
  const [category, setCategory] = useState('Health');
  const [color, setColor] = useState(editingHabit?.color || 'accent2');
  const [targetPerWeek, setTargetPerWeek] = useState(editingHabit?.targetPerWeek || 7);
  const [reminderEnabled, setReminderEnabled] = useState(editingHabit?.reminderEnabled || false);
  const [reminderTime, setReminderTime] = useState(editingHabit?.reminderTime || '');

  useEffect(() => {
    setName(editingHabit?.name || '');
    setCategory(editingHabit?.category || 'Health');
    setColor(editingHabit?.color || 'accent2');
    setTargetPerWeek(editingHabit?.targetPerWeek || 7);
    setReminderEnabled(editingHabit?.reminderEnabled || false);
    setReminderTime(editingHabit?.reminderTime || '');
  }, [editingHabit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = { name: name.trim(), category, color, targetPerWeek: Number(targetPerWeek), reminderEnabled, reminderTime };
    if (editingHabit) onUpdate(editingHabit._id, data);
    else onAdd(data);
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/10 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
          boxShadow: '0 0 80px rgba(139,92,246,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
        />

        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.2)' }}>
                <Sparkles size={20} className="text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{editingHabit ? 'Edit Habit' : 'New Habit'}</h2>
                <p className="text-xs text-gray-500">{editingHabit ? 'Adjust your goal' : 'Build something great'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Habit Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Habit Name
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Drink 2L of water"
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 border border-white/10 outline-none focus:border-secondary/60 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      category === cat
                        ? 'bg-secondary/20 text-secondary border border-secondary/40'
                        : 'text-gray-500 border border-white/5 hover:border-white/15 hover:text-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Color
              </label>
              <div className="flex gap-3">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    title={c.label}
                    className={`w-8 h-8 rounded-full transition-all duration-200 ${
                      color === c.id ? 'scale-125 ring-2 ring-white/50 ring-offset-2 ring-offset-surface' : 'hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="target-per-week" className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Target / week
                </label>
                <select
                  id="target-per-week"
                  value={targetPerWeek}
                  onChange={(e) => setTargetPerWeek(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-white text-sm border border-white/10 outline-none focus:border-secondary/60"
                  style={{ background: '#252535' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>{value} day{value === 1 ? '' : 's'}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="reminder-time" className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Reminder
                </label>
                <input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  disabled={!reminderEnabled}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-white text-sm border border-white/10 outline-none focus:border-secondary/60 disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
                <label className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} />
                  Enable reminder
                </label>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                boxShadow: '0 8px 30px rgba(168,85,247,0.4)',
              }}
            >
              <Plus size={18} />
              {editingHabit ? 'Save Changes' : 'Add Habit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

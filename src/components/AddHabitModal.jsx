import { useEffect, useState } from 'react';
import { X, Sparkles, AlertCircle, Clock, Repeat, ArrowRight } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'accent1', label: 'Electric Orange', hex: '#FF7A00' },
  { id: 'accent2', label: 'Warm Amber', hex: '#FFA64D' },
  { id: 'accent3', label: 'Deep Ember', hex: '#CC5200' },
  { id: 'primary', label: 'Silver Mist', hex: '#C1C1C1' },
  { id: 'secondary', label: 'Slate Smoke', hex: '#8E8E93' },
  { id: 'success', label: 'Solar Gold', hex: '#FFB800' },
];

const CATEGORY_OPTIONS = [
  'Health', 'Self Care', 'Productivity', 'Work', 'Fitness', 'Learning', 'Mindfulness', 'Social',
];

const PRIORITY_OPTIONS = [
  { id: 'High', label: 'High', color: '#FF4444' },
  { id: 'Medium', label: 'Medium', color: '#FFB800' },
  { id: 'Low', label: 'Low', color: '#8E8E93' },
];

const RECURRING_OPTIONS = [
  { id: 'daily', label: 'Every Day' },
  { id: 'weekdays', label: 'Mon - Fri' },
  { id: 'weekends', label: 'Sat - Sun' },
];

export default function AddHabitModal({ onClose, onAdd, onUpdate, editingHabit = null }) {
  const [name, setName] = useState(editingHabit?.name || '');
  const [category, setCategory] = useState(editingHabit?.category || 'Health');
  const [color, setColor] = useState(editingHabit?.color || 'accent1');
  const [priority, setPriority] = useState(editingHabit?.priority || 'Medium');
  const [recurring, setRecurring] = useState(editingHabit?.recurring || 'daily');
  const [carryOver, setCarryOver] = useState(editingHabit?.carryOver !== undefined ? editingHabit.carryOver : true);
  const [targetPerWeek, setTargetPerWeek] = useState(editingHabit?.targetPerWeek || 7);
  const [reminderEnabled, setReminderEnabled] = useState(editingHabit?.reminderEnabled || false);
  const [reminderTime, setReminderTime] = useState(editingHabit?.reminderTime || '');
  const [autoSyncSource, setAutoSyncSource] = useState(editingHabit?.autoSync?.source || 'none');
  const [autoSyncKeyword, setAutoSyncKeyword] = useState(editingHabit?.autoSync?.keyword || '');
  const [fitMetric, setFitMetric] = useState(editingHabit?.autoSync?.fitMetric || 'steps');
  const [fitTargetValue, setFitTargetValue] = useState(editingHabit?.autoSync?.targetValue || 10000);

  useEffect(() => {
    setName(editingHabit?.name || '');
    setCategory(editingHabit?.category || 'Health');
    setColor(editingHabit?.color || 'accent1');
    setPriority(editingHabit?.priority || 'Medium');
    setRecurring(editingHabit?.recurring || 'daily');
    setCarryOver(editingHabit?.carryOver !== undefined ? editingHabit.carryOver : true);
    setTargetPerWeek(editingHabit?.targetPerWeek || 7);
    setReminderEnabled(editingHabit?.reminderEnabled || false);
    setReminderTime(editingHabit?.reminderTime || '');
    setAutoSyncSource(editingHabit?.autoSync?.source || 'none');
    setAutoSyncKeyword(editingHabit?.autoSync?.keyword || '');
    setFitMetric(editingHabit?.autoSync?.fitMetric || 'steps');
    setFitTargetValue(editingHabit?.autoSync?.targetValue || 10000);
  }, [editingHabit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      category,
      color,
      priority,
      recurring,
      carryOver,
      targetPerWeek: Number(targetPerWeek),
      reminderEnabled,
      reminderTime,
      autoSync: {
        enabled: autoSyncSource !== 'none',
        source: autoSyncSource,
        keyword: autoSyncKeyword.trim() || name.trim(),
        fitMetric,
        targetValue: Number(fitTargetValue),
      },
    };
    if (editingHabit) onUpdate(editingHabit._id, data);
    else onAdd(data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(16,14,12,0.92)' }}
      onClick={onClose}
    >
      {/* Modal Card — Neo-Brutalist */}
      <div
        className="relative w-full max-w-lg bg-[#1E1D1C] border-2 border-[#FF7A00] overflow-hidden my-8"
        style={{ boxShadow: '6px 6px 0px #FF7A00' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Orange accent bar at top */}
        <div className="h-1.5 w-full bg-[#FF7A00]" />

        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b-2 border-[#494848] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FF7A00] border-2 border-black" style={{ boxShadow: '2px 2px 0px #000' }}>
                <Sparkles size={16} className="text-[#100E0C]" />
              </div>
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-widest font-mono">
                  {editingHabit ? 'EDIT HABIT' : 'NEW HABIT'}
                </h2>
                <p className="text-[10px] text-[#FF7A00] uppercase tracking-wider font-mono">
                  {editingHabit ? '// MODIFY DISCIPLINE' : '// LOG DISCIPLINE'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 border-2 border-[#494848] text-[#C1C1C1] hover:border-[#FF7A00] hover:text-[#FF7A00] transition-all"
              style={{ boxShadow: '2px 2px 0px #000' }}
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Habit Name */}
            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#C1C1C1] mb-1">
                HABIT TITLE *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 5 AM Deep Work, Morning Run"
                className="w-full px-3 py-2 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none shadow-[2px_2px_0px_#000000]"
              />
            </div>

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#C1C1C1] mb-1">
                  CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#C1C1C1] mb-1">
                  PRIORITY LEVEL
                </label>
                <div className="flex gap-1.5">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`flex-1 py-1.5 px-2 text-xs font-mono font-bold border-2 transition-all ${
                        priority === p.id
                          ? 'border-[#FF7A00] bg-[#FF7A00] text-black font-black shadow-[2px_2px_0px_#000]'
                          : 'border-[#494848] bg-[#100E0C] text-[#C1C1C1] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recurring Schedule & Carry Over */}
            <div className="p-3 bg-[#100E0C] border-2 border-[#494848] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-white uppercase flex items-center gap-1.5">
                  <Repeat size={13} className="text-[#FF7A00]" />
                  RECURRENCE FREQUENCY
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {RECURRING_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRecurring(r.id)}
                    className={`py-1.5 px-2 text-xs font-mono border-2 transition-all text-center ${
                      recurring === r.id
                        ? 'border-[#FF7A00] bg-[#1E1D1C] text-[#FF7A00] font-black shadow-[2px_2px_0px_#FF7A00]'
                        : 'border-[#494848] text-[#C1C1C1] hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Carry Over Toggle */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-[#494848]">
                <input
                  type="checkbox"
                  checked={carryOver}
                  onChange={(e) => setCarryOver(e.target.checked)}
                  className="accent-[#FF7A00] w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-[#C1C1C1]">
                  Carry over if unfinished at midnight (auto-transfer to next day)
                </span>
              </label>
            </div>

            {/* Due Time / Reminder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#C1C1C1] mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-[#FF7A00]" />
                  DUE TIME (OPTIONAL)
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => {
                    setReminderTime(e.target.value);
                    if (e.target.value) setReminderEnabled(true);
                  }}
                  className="w-full px-3 py-2 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#C1C1C1] mb-1">
                  WEEKLY TARGET (DAYS)
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={targetPerWeek}
                  onChange={(e) => setTargetPerWeek(e.target.value)}
                  className="w-full px-3 py-2 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none"
                />
              </div>
            </div>

            {/* Color Accent Picker */}
            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#C1C1C1] mb-1.5">
                ACCENT PALETTE
              </label>
              <div className="flex gap-2.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    title={c.label}
                    className={`w-7 h-7 border-2 transition-transform ${
                      color === c.id
                        ? 'border-white scale-125 shadow-[2px_2px_0px_#000]'
                        : 'border-black hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t-2 border-[#494848]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-[#494848] bg-[#100E0C] text-[#C1C1C1] font-mono font-bold text-xs hover:text-white uppercase"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2 border-2 border-black bg-[#FF7A00] text-black font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-px hover:translate-y-px active:translate-x-[2px] active:translate-y-[2px]"
              >
                {editingHabit ? 'UPDATE HABIT' : '+ SAVE HABIT'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

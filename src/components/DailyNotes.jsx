/**
 * DailyNotes — Reflection/journal text field per date
 * 
 * Persisted in localStorage keyed by date
 */
import { useState, useEffect, useCallback } from 'react';
import { PenLine, Save, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'habit_tracker_daily_notes';

function getAllNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

export default function DailyNotes({ dateKey }) {
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(true);
  const [showSaved, setShowSaved] = useState(false);

  // Load note for this date
  useEffect(() => {
    const all = getAllNotes();
    setNotes(all[dateKey] || '');
    setSaved(true);
  }, [dateKey]);

  const handleChange = (e) => {
    setNotes(e.target.value);
    setSaved(false);
  };

  const handleSave = useCallback(() => {
    const all = getAllNotes();
    if (notes.trim()) {
      all[dateKey] = notes;
    } else {
      delete all[dateKey];
    }
    saveAllNotes(all);
    setSaved(true);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [notes, dateKey]);

  // Auto-save on blur or after 2s of inactivity
  useEffect(() => {
    if (saved) return;
    const timer = setTimeout(handleSave, 2000);
    return () => clearTimeout(timer);
  }, [notes, saved, handleSave]);

  const formattedDate = (() => {
    try {
      const d = new Date(dateKey + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    } catch {
      return dateKey;
    }
  })();

  return (
    <div className="brutal-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[--color-borderSlate]">
        <div className="flex items-center gap-2">
          <PenLine size={16} className="text-[--color-primary]" />
          <span className="text-sm font-black uppercase text-[--color-text] tracking-wider">DAILY NOTES</span>
          <span className="brutal-badge bg-[--color-background] text-[--color-silver] rounded text-[9px]">
            {formattedDate}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showSaved && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-[--color-primary] animate-pulse">
              <CheckCircle2 size={11} /> SAVED
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saved}
            className="brutal-btn brutal-btn-ghost px-2 py-1 text-[10px] rounded"
            aria-label="Save notes"
          >
            <Save size={11} />
          </button>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={handleChange}
        onBlur={handleSave}
        placeholder="How was your day? What went well? What can you improve?"
        className="w-full min-h-[80px] px-3 py-2 text-xs text-[--color-text] placeholder-[--color-silver]/40 bg-[--color-background] border-2 border-[--color-borderSlate] outline-none focus:border-[--color-primary] font-mono resize-y transition-all"
        aria-label="Daily reflection notes"
      />
    </div>
  );
}

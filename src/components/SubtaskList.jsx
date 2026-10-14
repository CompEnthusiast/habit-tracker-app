/**
 * SubtaskList — Nested checklist inside a task/habit
 * 
 * Stored in localStorage keyed by habitId + dateKey
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, X, CheckCircle2, Circle, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';

const STORAGE_KEY = 'habit_tracker_subtasks';

function getAllSubtasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllSubtasks(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function SubtaskList({ habitId, habitName }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newText, setNewText] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Load subtasks for this habit
  useEffect(() => {
    const all = getAllSubtasks();
    setSubtasks(all[habitId] || []);
  }, [habitId]);

  // Save subtasks
  const save = useCallback((tasks) => {
    const all = getAllSubtasks();
    all[habitId] = tasks;
    saveAllSubtasks(all);
  }, [habitId]);

  const addSubtask = () => {
    if (!newText.trim()) return;
    const updated = [...subtasks, { id: Date.now().toString(), text: newText.trim(), done: false }];
    setSubtasks(updated);
    save(updated);
    setNewText('');
  };

  const toggleSubtask = (id) => {
    const updated = subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    setSubtasks(updated);
    save(updated);
  };

  const removeSubtask = (id) => {
    const updated = subtasks.filter((s) => s.id !== id);
    setSubtasks(updated);
    save(updated);
  };

  const doneCount = subtasks.filter((s) => s.done).length;
  const total = subtasks.length;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-[9px] font-mono text-[--color-silver] hover:text-[--color-primary] transition-colors uppercase"
        aria-label={`Show subtasks for ${habitName}`}
      >
        <ListChecks size={10} />
        {total > 0 ? `${doneCount}/${total} SUBTASKS` : 'ADD SUBTASKS'}
        <ChevronDown size={9} />
      </button>
    );
  }

  return (
    <div className="mt-2 p-2 border border-[--color-borderSlate]/50 bg-[--color-background]/50 rounded">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono font-bold text-[--color-primary] uppercase">
          SUBTASKS {total > 0 && `(${doneCount}/${total})`}
        </span>
        <button
          onClick={() => setExpanded(false)}
          className="text-[--color-silver] hover:text-[--color-primary]"
          aria-label="Collapse subtasks"
        >
          <ChevronUp size={11} />
        </button>
      </div>

      {/* Subtask items */}
      <div className="space-y-1">
        {subtasks.map((st) => (
          <div key={st.id} className="flex items-center gap-1.5 group">
            <button
              onClick={() => toggleSubtask(st.id)}
              className="shrink-0 transition-transform active:scale-90"
              aria-label={`Toggle "${st.text}"`}
            >
              {st.done ? (
                <CheckCircle2 size={12} className="text-[--color-primary]" />
              ) : (
                <Circle size={12} className="text-[--color-silver]" />
              )}
            </button>
            <span className={`text-[10px] flex-1 truncate ${st.done ? 'line-through text-[--color-silver]/50' : 'text-[--color-text]'}`}>
              {st.text}
            </span>
            <button
              onClick={() => removeSubtask(st.id)}
              className="opacity-0 group-hover:opacity-100 text-[--color-silver] hover:text-red-400 transition-all"
              aria-label={`Remove "${st.text}"`}
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="flex items-center gap-1 mt-1.5">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }}
          placeholder="Add subtask…"
          className="flex-1 px-1.5 py-0.5 text-[10px] text-[--color-text] placeholder-[--color-silver]/40 bg-transparent border-b border-[--color-borderSlate] outline-none focus:border-[--color-primary] font-mono"
        />
        <button
          onClick={addSubtask}
          disabled={!newText.trim()}
          className="text-[--color-primary] hover:scale-110 transition-transform disabled:opacity-30"
          aria-label="Add subtask"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

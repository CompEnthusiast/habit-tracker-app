/**
 * HistoryView — Browse past days' locked completion data
 * 
 * Features:
 * - Calendar-style date picker
 * - Read-only view of completed habits per day
 * - Lock icon on all past days
 * - Completion percentage per day
 */
import { useState, useMemo } from 'react';
import { Lock, ChevronLeft, ChevronRight, Calendar, CheckCircle2, X } from 'lucide-react';

export default function HistoryView({ habits = [], onClose }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // Start at yesterday
    return d;
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const viewKey = viewDate.toISOString().slice(0, 10);
  const isPast = viewKey < todayKey;
  const isToday = viewKey === todayKey;

  const formattedDate = viewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Get habits data for the selected date
  const dayData = useMemo(() => {
    return habits.map((habit) => ({
      ...habit,
      completed: Boolean(habit.completions?.[viewKey]),
    }));
  }, [habits, viewKey]);

  const completedCount = dayData.filter((h) => h.completed).length;
  const completionPct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const prevDay = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const nextDay = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      // Don't go past today
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return next > today ? d : next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(16,14,12,0.92)' }}>
      <div
        className="w-full max-w-lg bg-[--color-surface] border-2 border-[--color-primary] overflow-hidden max-h-[85vh] flex flex-col"
        style={{ boxShadow: '6px 6px 0px var(--color-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[--color-primary]/40 bg-[--color-background]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[--color-primary] border-2 border-[--color-primary]" style={{ boxShadow: '2px 2px 0px #000' }}>
              <Calendar size={16} className="text-[--color-background]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[--color-text] uppercase tracking-widest font-mono">HISTORY</h2>
              <p className="text-[10px] text-[--color-primary] font-mono uppercase tracking-wider">// LOCKED · READ-ONLY</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[--color-borderSlate] text-[--color-silver] hover:border-[--color-primary] hover:text-[--color-primary] transition-all"
            style={{ boxShadow: '2px 2px 0px #000' }}
            aria-label="Close history"
          >
            <X size={16} />
          </button>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[--color-borderSlate] bg-[--color-surface]">
          <button onClick={prevDay} className="month-nav" aria-label="Previous day">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-sm font-black text-[--color-text] uppercase">{formattedDate}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              {isPast && <Lock size={11} className="text-[--color-primary]" />}
              <span className="text-[10px] font-mono text-[--color-silver] uppercase">
                {isToday ? 'TODAY' : isPast ? 'LOCKED' : 'FUTURE'}
              </span>
              <span className="text-[10px] font-mono font-black text-[--color-primary]">{completionPct}%</span>
            </div>
          </div>
          <button onClick={nextDay} className="month-nav" aria-label="Next day" disabled={isToday}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-2 bg-[--color-background]">
          <div className="w-full h-2 bg-[--color-borderSlate] overflow-hidden border border-[--color-borderSlate]">
            <div
              className="h-full bg-[--color-primary] transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-[--color-silver] mt-1">
            {completedCount} / {habits.length} COMPLETED
          </p>
        </div>

        {/* Habits List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {dayData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs font-mono text-[--color-silver] uppercase">NO HABITS FOUND</p>
            </div>
          ) : (
            dayData.map((habit) => (
              <div
                key={habit._id}
                className={`flex items-center gap-3 p-3 border-2 transition-all ${
                  habit.completed
                    ? 'border-[--color-primary] bg-[--color-primary]/10'
                    : 'border-[--color-borderSlate] bg-[--color-background]'
                }`}
                style={{ boxShadow: habit.completed ? '2px 2px 0px var(--color-primary)' : '2px 2px 0px #000' }}
              >
                {/* Status icon */}
                <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                  habit.completed
                    ? 'bg-[--color-primary] border-2 border-black text-black'
                    : 'bg-[--color-surface] border-2 border-[--color-borderSlate]'
                }`}>
                  {habit.completed && <span className="text-xs font-black">✓</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${
                    habit.completed ? 'text-[--color-primary]' : 'text-[--color-silver]'
                  }`}>
                    {habit.name}
                  </p>
                  <span className="text-[9px] font-mono text-[--color-silver] uppercase">{habit.category}</span>
                </div>

                {/* Lock icon for past days */}
                {isPast && (
                  <Lock size={12} className="text-[--color-silver]/50 shrink-0" />
                )}

                {/* Status badge */}
                <span className={`text-[9px] font-black font-mono uppercase px-2 py-0.5 border ${
                  habit.completed
                    ? 'bg-[--color-primary] text-black border-black'
                    : 'bg-[--color-surface] text-[--color-silver] border-[--color-borderSlate]'
                }`}>
                  {habit.completed ? 'DONE' : 'MISSED'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t-2 border-[--color-borderSlate] bg-[--color-background] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border-2 border-[--color-borderSlate] hover:border-[--color-primary] text-[--color-text] text-xs font-black uppercase tracking-widest transition-all font-mono"
            style={{ boxShadow: '2px 2px 0px #000' }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

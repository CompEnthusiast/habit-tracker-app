import { useState } from 'react';
import { Trash2, CalendarDays, Calendar, Pencil } from 'lucide-react';

const colorHexMap = {
  primary:   '#3b82f6',
  secondary: '#a855f7',
  accent1:   '#ec4899',
  accent2:   '#06b6d4',
  accent3:   '#f59e0b',
  success:   '#22c55e',
};

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Get the start weekday (0=Sun) of a given year/month/day=1 */
function getMonthStartDay(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

/** Build 7-day windows for weekly view: [{weekLabel, days:[{day,weekday}]}] */
function buildWeeks(daysInMonth, year, month) {
  const startDay = getMonthStartDay(year, month);
  const weeks = [];
  let dayNum = 1;
  let weekDayIdx = startDay;

  while (dayNum <= daysInMonth) {
    const week = { days: [] };
    const weekStart = dayNum;
    for (let d = 0; d < 7; d++) {
      if ((d < weekDayIdx && weeks.length === 0) || dayNum > daysInMonth) {
        week.days.push(null);
      } else {
        week.days.push({ day: dayNum, weekday: d });
        dayNum++;
      }
    }
    weekDayIdx = 0;
    const firstReal = week.days.find(Boolean);
    const lastReal = [...week.days].reverse().find(Boolean);
    week.label = firstReal && lastReal
      ? `${firstReal.day}–${lastReal.day}`
      : '';
    weeks.push(week);
  }
  return weeks;
}

export default function HabitGrid({
  habits, monthDaysMap, toggleHabit, deleteHabit, daysInMonth, currentDay,
  currentYear, currentMonth, editHabit
}) {
  const [view, setView] = useState('monthly'); // 'monthly' | 'weekly'
  const [weekIdx, setWeekIdx] = useState(0);

  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weeks = buildWeeks(daysInMonth, currentYear, currentMonth);

  // Clamp weekIdx if weeks changed
  const safeWeekIdx = Math.min(weekIdx, weeks.length - 1);
  const currentWeek = weeks[safeWeekIdx];

  if (habits.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-white/10"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="text-5xl mb-4">🌱</div>
        <p className="text-lg font-semibold text-gray-300">No habits yet</p>
        <p className="text-sm text-gray-600 mt-1">Click "+ Add Habit" to get started</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border border-white/5 shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
    >
      {/* View toggle bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setView('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              view === 'monthly'
                ? 'text-white shadow-md'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            style={view === 'monthly' ? { background: 'linear-gradient(135deg, #a855f7, #6366f1)' } : {}}
          >
            <Calendar size={12} />
            Monthly
          </button>
          <button
            onClick={() => { setView('weekly'); setWeekIdx(Math.max(0, weeks.findIndex(w => w.days.some(d => d && d.day === currentDay)) )); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              view === 'weekly'
                ? 'text-white shadow-md'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            style={view === 'weekly' ? { background: 'linear-gradient(135deg, #a855f7, #6366f1)' } : {}}
          >
            <CalendarDays size={12} />
            Weekly
          </button>
        </div>

        {/* Week navigator (weekly view only) */}
        {view === 'weekly' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekIdx(i => Math.max(0, i - 1))}
              disabled={safeWeekIdx === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold"
            >‹</button>
            <span className="text-xs font-semibold text-gray-400 min-w-[60px] text-center">
              Days {currentWeek.label}
            </span>
            <button
              onClick={() => setWeekIdx(i => Math.min(weeks.length - 1, i + 1))}
              disabled={safeWeekIdx === weeks.length - 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold"
            >›</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: view === 'weekly' ? '500px' : '860px' }}>

          {/* Header */}
          <div className="flex items-end px-4 pt-2 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2 shrink-0" style={{ width: '220px' }}>
              <div className="w-7 shrink-0" />
              <span className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">Habit</span>
            </div>

            {view === 'monthly' ? (
              <div className="flex flex-1 justify-between pr-4">
                {allDays.map((day) => (
                  <div
                    key={day}
                    className={`w-6 text-center text-[10px] font-bold ${
                      day === currentDay ? 'text-secondary' : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 justify-around pr-4">
                {currentWeek.days.map((slot, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5" style={{ width: '44px' }}>
                    <span className="text-[9px] font-bold text-gray-600 uppercase">{WEEKDAY_LABELS[i]}</span>
                    {slot && (
                      <span className={`text-[11px] font-bold ${slot.day === currentDay ? 'text-secondary' : 'text-gray-500'}`}>
                        {slot.day}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {habits.map((habit) => {
              const hex = colorHexMap[habit.color] || '#3b82f6';
              const days_ = monthDaysMap[habit._id] || {};
              const completedCount = Object.values(days_).filter(Boolean).length;
              const pct = Math.round((completedCount / daysInMonth) * 100);

              // Weekly stats for badge
              const weekDays = view === 'weekly'
                ? currentWeek.days.filter(Boolean).map(s => s.day)
                : [];
              const weekDone = weekDays.filter(d => days_[d]).length;

              return (
                <div key={habit._id} className="group flex items-center px-4 py-2.5 hover:bg-white/[0.025] transition-colors">
                  {/* Fixed left col */}
                  <div className="flex items-center gap-2 shrink-0" style={{ width: '220px' }}>
                    <button
                      onClick={() => deleteHabit(habit._id)}
                      title="Delete habit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => editHabit?.(habit)}
                      title="Edit habit"
                      aria-label={`Edit ${habit.name}`}
                      className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 text-gray-700 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-200"
                    >
                      <Pencil size={13} />
                    </button>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: hex, boxShadow: `0 0 6px ${hex}80` }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-200 group-hover:text-white truncate transition-colors leading-tight">
                        {habit.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-medium tracking-wider text-gray-600 uppercase">{habit.category}</span>
                        {view === 'monthly' ? (
                          <span className="text-[9px] font-bold" style={{ color: hex }}>{pct}%</span>
                        ) : (
                          <span className="text-[9px] font-bold" style={{ color: hex }}>{weekDone}/{weekDays.length} this week</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Day cells */}
                  {view === 'monthly' ? (
                    <div className="flex flex-1 justify-between pr-4">
                      {allDays.map((day) => {
                        const done = !!(monthDaysMap[habit._id] || {})[day];
                        const isToday = day === currentDay;
                        return (
                          <button
                            key={day}
                            onClick={() => toggleHabit(habit._id, day)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-150
                              ${done ? 'text-white scale-105'
                                : isToday ? 'border border-dashed text-transparent hover:scale-110'
                                : 'border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] text-transparent hover:scale-110'}`}
                            style={done ? { background: hex, boxShadow: `0 0 10px ${hex}60` }
                              : isToday ? { borderColor: hex + '60' } : {}}
                          >
                            {done ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-1 justify-around pr-4">
                      {currentWeek.days.map((slot, i) => {
                        if (!slot) return <div key={i} style={{ width: '44px' }} />;
                        const done = !!(monthDaysMap[habit._id] || {})[slot.day];
                        const isToday = slot.day === currentDay;
                        return (
                          <div key={i} className="flex justify-center" style={{ width: '44px' }}>
                            <button
                              onClick={() => toggleHabit(habit._id, slot.day)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-150
                                ${done ? 'text-white scale-105'
                                  : isToday ? 'border border-dashed text-transparent hover:scale-110'
                                  : 'border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] text-transparent hover:scale-110'}`}
                              style={done ? { background: hex, boxShadow: `0 0 12px ${hex}70` }
                                : isToday ? { borderColor: hex + '70' } : {}}
                            >
                              {done ? '✓' : ''}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

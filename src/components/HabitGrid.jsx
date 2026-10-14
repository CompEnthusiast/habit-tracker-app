import { useState } from 'react';
import { Trash2, CalendarDays, Calendar, Pencil, Lock, GripVertical } from 'lucide-react';

const colorHexMap = {
  primary:   '#FF7A00',
  secondary: '#FFA64D',
  accent1:   '#FF7A00',
  accent2:   '#FFA64D',
  accent3:   '#FF5500',
  success:   '#FF7A00',
};

const WEEKDAY_LABELS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function getMonthStartDay(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function buildWeeks(daysInMonth, year, month) {
  const startDay = getMonthStartDay(year, month);
  const weeks = [];
  let dayNum = 1;
  let weekDayIdx = startDay;

  while (dayNum <= daysInMonth) {
    const week = { days: [] };
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
  habits = [],
  monthDaysMap = {},
  toggleHabit,
  deleteHabit,
  daysInMonth,
  currentDay,
  currentYear,
  currentMonth,
  selectedYear,
  selectedMonth,
  editHabit,
  onReorderHabits,
}) {
  const [view, setView] = useState('monthly'); // 'monthly' | 'weekly'
  const [weekIdx, setWeekIdx] = useState(0);
  const [lockedNotice, setLockedNotice] = useState('');
  const [draggedHabitId, setDraggedHabitId] = useState(null);

  const isCurrentMonthView =
    (selectedYear === undefined || selectedYear === currentYear) &&
    (selectedMonth === undefined || selectedMonth === currentMonth);

  const isPastMonth =
    (selectedYear < currentYear) ||
    (selectedYear === currentYear && selectedMonth < currentMonth);

  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weeks = buildWeeks(daysInMonth, selectedYear || currentYear, selectedMonth || currentMonth);

  const safeWeekIdx = Math.min(weekIdx, Math.max(0, weeks.length - 1));
  const currentWeek = weeks[safeWeekIdx] || { days: [], label: '' };

  const showLockedToast = (day) => {
    setLockedNotice(`Day ${day} is in the past and permanently LOCKED (read-only).`);
    setTimeout(() => setLockedNotice(''), 2500);
  };

  const handleDayClick = (habitId, day) => {
    // If past month, completely locked
    if (isPastMonth) {
      showLockedToast(day);
      return;
    }

    if (isCurrentMonthView) {
      if (day < currentDay) {
        showLockedToast(day);
        return;
      }
      if (day > currentDay) {
        // Future days cannot be pre-completed
        return;
      }
    }

    // Toggle today's habit
    toggleHabit(habitId, day);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, habitId) => {
    setDraggedHabitId(habitId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetHabitId) => {
    e.preventDefault();
    if (!draggedHabitId || draggedHabitId === targetHabitId || !onReorderHabits) return;
    onReorderHabits(draggedHabitId, targetHabitId);
    setDraggedHabitId(null);
  };

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-[#494848] bg-[#1E1D1C] shadow-[4px_4px_0px_#000000]">
        <div className="text-5xl mb-3">🎯</div>
        <p className="text-lg font-black uppercase text-white font-mono">NO HABITS RECORDED</p>
        <p className="text-xs font-mono text-[#C1C1C1] mt-1">Click "+ ADD HABIT" to start building consistency</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[#494848] bg-[#1E1D1C] shadow-[5px_5px_0px_#000000] overflow-hidden relative">
      {/* Toast Notice if attempting to edit locked history */}
      {lockedNotice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#FF4444] text-black font-mono font-black text-xs border-2 border-black shadow-[4px_4px_0px_#000] flex items-center gap-2 animate-bounce">
          <Lock size={13} />
          <span>{lockedNotice}</span>
        </div>
      )}

      {/* View toggle bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b-2 border-[#494848] bg-[#100E0C]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#1E1D1C] border-2 border-[#494848]">
            <button
              onClick={() => setView('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-black uppercase transition-all font-mono ${
                view === 'monthly'
                  ? 'bg-[#FF7A00] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                  : 'text-[#C1C1C1] hover:text-white'
              }`}
            >
              <Calendar size={12} strokeWidth={2.5} />
              MONTHLY
            </button>
            <button
              onClick={() => {
                setView('weekly');
                const foundIdx = weeks.findIndex((w) => w.days.some((d) => d && d.day === currentDay));
                setWeekIdx(Math.max(0, foundIdx));
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-black uppercase transition-all font-mono ${
                view === 'weekly'
                  ? 'bg-[#FF7A00] text-black border-2 border-black shadow-[2px_2px_0px_#000000]'
                  : 'text-[#C1C1C1] hover:text-white'
              }`}
            >
              <CalendarDays size={12} strokeWidth={2.5} />
              WEEKLY
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[#C1C1C1] border border-[#494848] px-2 py-0.5 bg-[#100E0C]">
            <Lock size={10} className="text-[#FF7A00]" /> PAST DAYS LOCKED
          </span>
        </div>

        {/* Week navigator (weekly view only) */}
        {view === 'weekly' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
              disabled={safeWeekIdx === 0}
              className="w-7 h-7 rounded border-2 border-[#494848] bg-[#1E1D1C] flex items-center justify-center text-white hover:bg-[#FF7A00] hover:text-black hover:border-black transition-all disabled:opacity-30 disabled:cursor-not-allowed text-base font-black shadow-[2px_2px_0px_#000000]"
            >
              ‹
            </button>
            <span className="text-xs font-mono font-black text-white min-w-[70px] text-center uppercase">
              DAYS {currentWeek.label}
            </span>
            <button
              onClick={() => setWeekIdx((i) => Math.min(weeks.length - 1, i + 1))}
              disabled={safeWeekIdx === weeks.length - 1}
              className="w-7 h-7 rounded border-2 border-[#494848] bg-[#1E1D1C] flex items-center justify-center text-white hover:bg-[#FF7A00] hover:text-black hover:border-black transition-all disabled:opacity-30 disabled:cursor-not-allowed text-base font-black shadow-[2px_2px_0px_#000000]"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: view === 'weekly' ? '540px' : '920px' }}>
          {/* Header Row */}
          <div className="flex items-end px-4 pt-3 pb-2.5 border-b-2 border-[#494848] bg-[#100E0C]/60">
            <div className="flex items-center gap-2 shrink-0" style={{ width: '240px' }}>
              <div className="w-14 shrink-0" />
              <span className="text-[10px] font-black font-mono tracking-widest text-[#C1C1C1] uppercase">
                HABIT // PRIORITY
              </span>
            </div>

            {view === 'monthly' ? (
              <div className="flex flex-1 justify-between pr-4">
                {allDays.map((day) => {
                  const isToday = isCurrentMonthView && day === currentDay;
                  const isPast = isPastMonth || (isCurrentMonthView && day < currentDay);

                  return (
                    <div
                      key={day}
                      className={`w-6 text-center text-[10px] font-mono font-black ${
                        isToday
                          ? 'text-[#FF7A00] scale-125 bg-black/50 rounded border border-[#FF7A00]/70'
                          : isPast
                          ? 'text-[#8E8E93]'
                          : 'text-[#494848]'
                      }`}
                      title={isPast ? `Day ${day} (Locked)` : isToday ? `Today (Day ${day})` : `Day ${day}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 justify-around pr-4">
                {currentWeek.days.map((slot, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5" style={{ width: '44px' }}>
                    <span className="text-[9px] font-black font-mono text-[#C1C1C1] uppercase">
                      {WEEKDAY_LABELS[i]}
                    </span>
                    {slot && (
                      <span
                        className={`text-[11px] font-mono font-black ${
                          isCurrentMonthView && slot.day === currentDay ? 'text-[#FF7A00]' : 'text-white'
                        }`}
                      >
                        {slot.day}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rows */}
          <div className="divide-y-2 divide-[#494848]/60">
            {habits.map((habit) => {
              const hex = colorHexMap[habit.color] || '#FF7A00';
              const days_ = monthDaysMap[habit._id] || {};
              const completedCount = Object.values(days_).filter(Boolean).length;
              const pct = Math.round((completedCount / daysInMonth) * 100);

              const priority = habit.priority || 'Medium';
              const priorityColor =
                priority === 'High' ? 'text-[#FF4444] border-[#FF4444]/60' :
                priority === 'Medium' ? 'text-[#FFB800] border-[#FFB800]/60' : 'text-[#8E8E93] border-[#8E8E93]/60';

              const weekDays =
                view === 'weekly' ? currentWeek.days.filter(Boolean).map((s) => s.day) : [];
              const weekDone = weekDays.filter((d) => days_[d]).length;

              return (
                <div
                  key={habit._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, habit._id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, habit._id)}
                  className="group flex items-center px-4 py-2.5 border-b border-[#494848]/30 hover:bg-[#FF7A00]/[0.04] transition-colors duration-100"
                >
                  {/* Fixed left col with Drag Handle, Edit, Delete, Priority */}
                  <div className="flex items-center gap-1.5 shrink-0" style={{ width: '240px' }}>
                    <span
                      title="Drag to reorder"
                      className="cursor-grab active:cursor-grabbing text-[#494848] hover:text-[#FF7A00] p-0.5"
                    >
                      <GripVertical size={13} />
                    </span>
                    <button
                      onClick={() => deleteHabit(habit._id)}
                      title="Delete habit"
                      className="w-6 h-6 flex items-center justify-center rounded border border-transparent hover:border-[#FF4444] text-[#C1C1C1]/60 hover:text-[#FF4444] hover:bg-[#FF4444]/15 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      onClick={() => editHabit?.(habit)}
                      title="Edit habit"
                      aria-label={`Edit ${habit.name}`}
                      className="w-6 h-6 flex items-center justify-center rounded border border-transparent hover:border-[#FF7A00] text-[#C1C1C1]/60 hover:text-[#FF7A00] hover:bg-[#FF7A00]/15 transition-all"
                    >
                      <Pencil size={12} />
                    </button>

                    <div
                      className="w-2.5 h-2.5 shrink-0"
                      style={{ background: hex, border: '1px solid #000' }}
                    />

                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-black text-white group-hover:text-[#FF7A00] truncate transition-colors leading-tight font-mono">
                        {habit.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[8px] font-mono font-bold tracking-wider text-[#C1C1C1] uppercase">
                          {habit.category}
                        </span>
                        <span className={`text-[8px] font-mono font-bold px-1 py-0 border ${priorityColor}`}>
                          {priority.toUpperCase()}
                        </span>
                        {view === 'monthly' ? (
                          <span className="text-[9px] font-mono font-black text-[#FF7A00]">{pct}%</span>
                        ) : (
                          <span className="text-[9px] font-mono font-black text-[#FF7A00]">
                            {weekDone}/{weekDays.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Day cells */}
                  {view === 'monthly' ? (
                    <div className="flex flex-1 justify-between pr-4">
                      {allDays.map((day) => {
                        const done = !!(monthDaysMap[habit._id] || {})[day];
                        const isToday = isCurrentMonthView && day === currentDay;
                        const isPast = isPastMonth || (isCurrentMonthView && day < currentDay);
                        const isFuture = isCurrentMonthView && day > currentDay;

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayClick(habit._id, day)}
                            title={
                              isPast
                                ? `Day ${day} (LOCKED - Read Only)`
                                : isToday
                                ? `Today (Day ${day}) - Click to toggle`
                                : `Day ${day} (Future)`
                            }
                            className={`w-6 h-6 flex items-center justify-center text-[11px] font-black transition-all duration-100 ${
                              done
                                ? isPast
                                  ? 'bg-[#FF7A00]/80 text-black border-2 border-black/80 cursor-not-allowed opacity-90'
                                  : 'bg-[#FF7A00] text-black border-2 border-black shadow-[2px_2px_0px_#000000] scale-105 hover:scale-110 active:scale-95'
                                : isToday
                                ? 'border-2 border-dashed border-[#FF7A00] bg-[#FF7A00]/10 text-transparent hover:scale-110 hover:bg-[#FF7A00]/20 active:scale-95'
                                : isPast
                                ? 'border-2 border-[#333333] bg-[#141414] text-[#494848] cursor-not-allowed text-[8px]'
                                : 'border-2 border-[#2b2a2a] bg-[#100E0C] text-transparent cursor-not-allowed opacity-40'
                            }`}
                          >
                            {done ? '✓' : isPast ? '·' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-1 justify-around pr-4">
                      {currentWeek.days.map((slot, i) => {
                        if (!slot) return <div key={i} style={{ width: '44px' }} />;
                        const done = !!(monthDaysMap[habit._id] || {})[slot.day];
                        const isToday = isCurrentMonthView && slot.day === currentDay;
                        const isPast = isPastMonth || (isCurrentMonthView && slot.day < currentDay);

                        return (
                          <div key={i} className="flex justify-center" style={{ width: '44px' }}>
                            <button
                              type="button"
                              onClick={() => handleDayClick(habit._id, slot.day)}
                              title={isPast ? `Day ${slot.day} (LOCKED)` : `Day ${slot.day}`}
                              className={`w-8 h-8 flex items-center justify-center text-xs font-black transition-all duration-100 ${
                                done
                                  ? isPast
                                    ? 'bg-[#FF7A00]/80 text-black border-2 border-black cursor-not-allowed'
                                    : 'bg-[#FF7A00] text-black border-2 border-black shadow-[3px_3px_0px_#000000] scale-105 hover:scale-110 active:scale-95'
                                  : isToday
                                  ? 'border-2 border-dashed border-[#FF7A00] bg-[#FF7A00]/10 text-transparent hover:scale-110 active:scale-95'
                                  : isPast
                                  ? 'border-2 border-[#333333] bg-[#141414] text-[#555] cursor-not-allowed'
                                  : 'border-2 border-[#2b2a2a] bg-[#100E0C] text-transparent cursor-not-allowed opacity-40'
                              }`}
                            >
                              {done ? '✓' : isPast ? '·' : ''}
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

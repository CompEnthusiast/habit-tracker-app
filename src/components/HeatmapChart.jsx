/**
 * HeatmapChart — GitHub-style contribution heatmap
 * 
 * Shows 52 weeks of completion data in a grid
 * Color intensity = percentage of habits completed that day
 */
import { useMemo } from 'react';

const DAYS_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTHS_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Get color intensity based on completion percentage */
function getHeatColor(pct) {
  if (pct === 0) return 'var(--color-background)';
  if (pct <= 25) return '#FF7A0030';
  if (pct <= 50) return '#FF7A0060';
  if (pct <= 75) return '#FF7A00A0';
  return '#FF7A00';
}

export default function HeatmapChart({ habits = [] }) {
  const weeks = useMemo(() => {
    const today = new Date();
    const result = [];

    // Go back ~365 days
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Align to Sunday
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    const current = new Date(startDate);
    let weekDays = [];
    let weekIdx = 0;

    while (current <= today || weekDays.length > 0) {
      const dateKey = current.toISOString().slice(0, 10);
      const isFuture = current > today;

      // Calculate completion for this day
      let totalHabits = 0;
      let completedHabits = 0;
      if (!isFuture) {
        for (const habit of habits) {
          totalHabits++;
          if (habit.completions?.[dateKey]) completedHabits++;
        }
      }

      const pct = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

      weekDays.push({
        date: dateKey,
        dayOfWeek: current.getDay(),
        month: current.getMonth(),
        pct: isFuture ? -1 : pct,
        completed: completedHabits,
        total: totalHabits,
      });

      current.setDate(current.getDate() + 1);

      if (weekDays.length === 7) {
        result.push({ weekIdx, days: weekDays });
        weekDays = [];
        weekIdx++;
      }

      // Stop after 53 weeks max
      if (weekIdx > 53) break;
    }

    // Push remaining partial week
    if (weekDays.length > 0) {
      result.push({ weekIdx, days: weekDays });
    }

    return result;
  }, [habits]);

  // Month labels with positions
  const monthPositions = useMemo(() => {
    const positions = [];
    let lastMonth = -1;
    for (const week of weeks) {
      const firstDay = week.days[0];
      if (firstDay && firstDay.month !== lastMonth) {
        positions.push({ month: firstDay.month, weekIdx: week.weekIdx });
        lastMonth = firstDay.month;
      }
    }
    return positions;
  }, [weeks]);

  if (habits.length === 0) {
    return (
      <div className="brutal-card rounded-xl p-6 flex flex-col items-center justify-center text-center">
        <p className="text-3xl mb-2">📊</p>
        <p className="text-xs font-mono font-bold text-[--color-silver] uppercase">ADD HABITS TO SEE HEATMAP</p>
      </div>
    );
  }

  return (
    <div className="brutal-card rounded-xl p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[--color-borderSlate]">
        <span className="text-base font-black uppercase text-[--color-text] tracking-wider">COMPLETION HEATMAP</span>
        <span className="text-[10px] font-mono text-[--color-silver]">PAST 12 MONTHS</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px]">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {monthPositions.map((mp, i) => (
              <span
                key={`${mp.month}-${i}`}
                className="text-[9px] font-mono font-bold text-[--color-silver] uppercase"
                style={{ position: 'relative', left: `${mp.weekIdx * 14}px` }}
              >
                {MONTHS_LABELS[mp.month]}
              </span>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1 shrink-0">
              {DAYS_LABELS.map((label, i) => (
                <div key={i} className="h-[12px] flex items-center">
                  <span className="text-[8px] font-mono text-[--color-silver] w-6 text-right">{label}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week) => (
              <div key={week.weekIdx} className="flex flex-col gap-0.5">
                {week.days.map((day) => (
                  <div
                    key={day.date}
                    className="w-[12px] h-[12px] rounded-[2px] border border-[--color-borderSlate]/30 transition-all hover:scale-150 hover:z-10 cursor-default"
                    style={{
                      background: day.pct < 0 ? 'transparent' : getHeatColor(day.pct),
                      opacity: day.pct < 0 ? 0 : 1,
                    }}
                    title={day.pct < 0 ? '' : `${day.date}: ${day.completed}/${day.total} (${Math.round(day.pct)}%)`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 ml-8 text-[9px] font-mono text-[--color-silver]">
            <span>LESS</span>
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="w-[12px] h-[12px] rounded-[2px] border border-[--color-borderSlate]/30"
                style={{ background: getHeatColor(pct) }}
              />
            ))}
            <span>MORE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

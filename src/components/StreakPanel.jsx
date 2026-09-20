import { Flame, Zap } from 'lucide-react';
import { getCurrentStreak, getLongestStreak } from '../utils/streaks';

const colorHexMap = {
  primary:   '#3b82f6',
  secondary: '#a855f7',
  accent1:   '#ec4899',
  accent2:   '#06b6d4',
  accent3:   '#f59e0b',
  success:   '#22c55e',
};

export default function StreakPanel({ habits }) {
  if (habits.length === 0) {
    return (
      <div
        className="rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center text-center"
        style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
      >
        <p className="text-3xl mb-2">🔥</p>
        <p className="text-sm text-gray-500">Add habits to see streaks</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border border-white/5 p-6 shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Flame size={16} className="text-accent3" />
        <span className="text-base font-bold text-white">Streaks</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <div className="space-y-3">
        {habits.map((habit) => {
          const current = getCurrentStreak(habit.completions);
          const longest = getLongestStreak(habit.completions);
          const hex = colorHexMap[habit.color] || '#3b82f6';

          return (
            <div
              key={habit._id}
              className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.04]"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              {/* Color dot */}
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: hex, boxShadow: `0 0 6px ${hex}` }}
              />
              {/* Name */}
              <p className="text-xs font-semibold text-gray-300 flex-1 truncate">{habit.name}</p>

              {/* Current streak */}
              <div className="flex items-center gap-1 shrink-0">
                <Flame size={11} className={current > 0 ? 'text-accent3' : 'text-gray-700'} />
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: current > 0 ? '#f59e0b' : '#374151' }}
                >
                  {current}d
                </span>
              </div>

              {/* Best */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Zap size={11} className={longest > 0 ? 'text-secondary' : 'text-gray-700'} />
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: longest > 0 ? '#a855f7' : '#374151' }}
                >
                  {longest}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Flame size={10} className="text-accent3" /> Current streak (days)
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Zap size={10} className="text-secondary" /> Best streak (days)
        </div>
      </div>
    </div>
  );
}

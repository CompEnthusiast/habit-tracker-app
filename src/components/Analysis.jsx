const colorHexMap = {
  primary:   '#3b82f6',
  secondary: '#a855f7',
  accent1:   '#ec4899',
  accent2:   '#06b6d4',
  accent3:   '#f59e0b',
  success:   '#22c55e',
};

export default function Analysis({ habits, monthDaysMap, daysInMonth }) {
  if (habits.length === 0) {
    return (
      <div
        className="rounded-3xl border border-white/5 p-6 h-full flex flex-col items-center justify-center text-center"
        style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
      >
        <p className="text-3xl mb-2">📊</p>
        <p className="text-sm text-gray-500">Add habits to see analysis</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border border-white/5 p-6 h-full shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
    >
      <div className="flex items-center gap-2 mb-6">
        <span className="text-base font-bold text-white">Analysis</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      <div className="space-y-5">
        {habits.map((habit) => {
          const days = monthDaysMap[habit._id] || {};
          const completedCount = Object.values(days).filter(Boolean).length;
          const percentage = (completedCount / daysInMonth) * 100;
          const hex = colorHexMap[habit.color] || '#3b82f6';

          return (
            <div key={habit._id}>
              <div className="flex justify-between items-baseline text-xs mb-2">
                <span className="font-semibold text-gray-300 truncate max-w-[70%]">{habit.name}</span>
                <span className="font-bold tabular-nums" style={{ color: hex }}>{percentage.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${hex}80, ${hex})`,
                    boxShadow: `0 0 8px ${hex}50`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

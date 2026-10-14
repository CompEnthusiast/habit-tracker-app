const colorHexMap = {
  accent1:   '#FF7A00',
  accent2:   '#FFA64D',
  accent3:   '#CC5200',
  primary:   '#C1C1C1',
  secondary: '#8E8E93',
  success:   '#FFB800',
};

export default function Analysis({ habits, monthDaysMap, daysInMonth }) {
  if (habits.length === 0) {
    return (
      <div
        className="border-2 border-[#494848] bg-[#1E1D1C] p-6 h-full flex flex-col items-center justify-center text-center"
        style={{ boxShadow: '4px 4px 0px #000' }}
      >
        <p className="text-3xl mb-2">📊</p>
        <p className="text-xs text-[#C1C1C1] uppercase font-mono tracking-widest">// Add habits to see analysis</p>
      </div>
    );
  }

  return (
    <div
      className="border-2 border-[#494848] bg-[#1E1D1C] p-5 h-full"
      style={{ boxShadow: '4px 4px 0px #000' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs font-black text-[#FF7A00] uppercase tracking-widest font-mono">// ANALYSIS</span>
        <div className="flex-1 h-[2px] bg-[#FF7A00]/40" />
      </div>

      <div className="space-y-4">
        {habits.map((habit) => {
          const days = monthDaysMap[habit._id] || {};
          const completedCount = Object.values(days).filter(Boolean).length;
          const percentage = (completedCount / daysInMonth) * 100;
          const hex = colorHexMap[habit.color] || '#FF7A00';

          return (
            <div key={habit._id}>
              <div className="flex justify-between items-baseline text-xs mb-1.5">
                <span className="font-bold text-[#C1C1C1] truncate max-w-[70%] font-mono uppercase tracking-wider">{habit.name}</span>
                <span className="font-black tabular-nums font-mono" style={{ color: hex }}>{percentage.toFixed(0)}%</span>
              </div>
              {/* Progress bar — brutalist: square edges, hard border */}
              <div className="h-3 w-full bg-[#100E0C] border-2 border-[#494848] overflow-hidden">
                <div
                  className="h-full transition-all duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background: hex,
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

import { Flame, Zap } from 'lucide-react';
import { getCurrentStreak, getLongestStreak } from '../utils/streaks';

const colorHexMap = {
  accent1:   '#FF7A00',
  accent2:   '#FFA64D',
  accent3:   '#CC5200',
  primary:   '#C1C1C1',
  secondary: '#8E8E93',
  success:   '#FFB800',
};

export default function StreakPanel({ habits }) {
  if (habits.length === 0) {
    return (
      <div className="rounded-xl border-2 border-[#494848] bg-[#1E1D1C] p-6 flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_#000000]">
        <p className="text-3xl mb-2">🔥</p>
        <p className="text-xs font-mono font-bold text-[#C1C1C1] uppercase">NO HABITS TO TRACK STREAKS</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[#494848] bg-[#1E1D1C] p-6 shadow-[5px_5px_0px_#000000]">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b-2 border-[#494848]">
        <Flame size={18} className="text-[#FF7A00]" />
        <span className="text-base font-black uppercase text-white tracking-wider">STREAK VELOCITY</span>
        <span className="ml-auto brutal-badge-orange rounded">HOT</span>
      </div>

      <div className="space-y-2.5">
        {habits.map((habit) => {
          const current = getCurrentStreak(habit.completions);
          const longest = getLongestStreak(habit.completions);
          const hex = colorHexMap[habit.color] || '#FF7A00';

          return (
            <div
              key={habit._id}
              className="group flex items-center gap-3 p-3 border-2 border-[#494848] bg-[#100E0C] shadow-[2px_2px_0px_#000000] hover:border-[#FF7A00] hover:-translate-y-px hover:shadow-[3px_3px_0px_#FF7A00] active:translate-y-0 transition-all duration-100 cursor-default"
            >
              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-none shrink-0 transition-transform group-hover:scale-125"
                style={{ background: hex, border: '1px solid #000' }}
              />
              {/* Name */}
              <p className="text-xs font-bold text-white flex-1 truncate group-hover:text-[#FF7A00] transition-colors">{habit.name}</p>

              {/* Current streak */}
              <div className="flex items-center gap-1 shrink-0 px-2.5 py-1 bg-[#FF7A00] text-black border border-black font-black text-xs shadow-[1.5px_1.5px_0px_#000000] transition-all group-hover:scale-105 group-hover:shadow-[2.5px_2.5px_0px_#000000]">
                <Flame size={12} className="text-black fill-black" />
                <span className="tabular-nums font-mono">
                  {current}D
                </span>
              </div>

              {/* Best */}
              <div className="flex items-center gap-1 shrink-0 ml-1 px-2.5 py-1 bg-[#1E1D1C] text-white border-2 border-[#494848] font-bold text-xs shadow-[1.5px_1.5px_0px_#000000] transition-all group-hover:border-[#C1C1C1]">
                <Zap size={12} className="text-[#FF7A00]" />
                <span className="tabular-nums font-mono text-[#C1C1C1]">
                  BEST: {longest}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3.5 border-t-2 border-[#494848] font-mono text-[10px] text-[#C1C1C1] uppercase">
        <div className="flex items-center gap-1.5 font-bold">
          <Flame size={11} className="text-[#FF7A00]" /> CURRENT
        </div>
        <div className="w-px h-3 bg-[#494848]" />
        <div className="flex items-center gap-1.5 font-bold">
          <Zap size={11} className="text-white" /> ALL-TIME RECORD
        </div>
      </div>
    </div>
  );
}

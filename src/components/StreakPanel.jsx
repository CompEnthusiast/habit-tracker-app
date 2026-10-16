import { Flame, Zap, Shield, Sparkles } from 'lucide-react';
import { getCurrentStreak, getLongestStreak } from '../utils/streaks';

const colorHexMap = {
  accent1:   '#FF7A00',
  accent2:   '#FFA64D',
  accent3:   '#CC5200',
  primary:   '#C1C1C1',
  secondary: '#8E8E93',
  success:   '#FFB800',
};

export default function StreakPanel({
  habits = [],
  globalStreak = 0,
  globalBestStreak = 0,
  freezeTokensAvailable = 2,
  onOpenFreezeModal = () => {},
}) {
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
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#494848] mb-4">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[#FF7A00]" />
          <span className="text-base font-black uppercase text-white tracking-wider font-mono">
            STREAK VELOCITY
          </span>
        </div>

        <button
          onClick={onOpenFreezeModal}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#100E0C] border-2 border-[#494848] hover:border-[#FF7A00] text-xs font-mono text-[#C1C1C1] hover:text-[#FF7A00] transition-all shadow-[2px_2px_0px_#000]"
          title="Open Streak Freeze Shield Modal"
        >
          <Shield size={12} className="text-[#FF7A00]" />
          <span className="font-bold">{freezeTokensAvailable} FREEZES</span>
        </button>
      </div>

      {/* Global Streak Banner */}
      <div className="p-3 bg-[#100E0C] border-2 border-[#494848] shadow-[3px_3px_0px_#000] mb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-[#C1C1C1] uppercase">ACTIVE DAILY STREAK</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-mono font-black text-[#FF7A00]">
              {globalStreak} DAYS
            </span>
            <span className="text-[10px] font-mono text-[#8E8E93]">
              BEST: {globalBestStreak}D
            </span>
          </div>
        </div>
        <div className="w-10 h-10 border-2 border-black bg-[#FF7A00] flex items-center justify-center shadow-[2px_2px_0px_#000]">
          <Flame size={20} className="text-black fill-black animate-pulse" />
        </div>
      </div>

      {/* Habit Streaks List */}
      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {habits.map((habit) => {
          const current = getCurrentStreak(habit.completions || {});
          const longest = getLongestStreak(habit.completions || {});
          const hex = colorHexMap[habit.color] || '#FF7A00';

          return (
            <div
              key={habit._id}
              className="group flex items-center gap-3 p-3 border-2 border-[#494848] bg-[#100E0C] shadow-[2px_2px_0px_#000000] hover:border-[#FF7A00] hover:-translate-y-px hover:shadow-[3px_3px_0px_#FF7A00] active:translate-y-0 transition-all duration-100 cursor-default"
            >
              {/* Color indicator */}
              <div
                className="w-2.5 h-2.5 rounded-none shrink-0 transition-transform group-hover:scale-125"
                style={{ background: hex, border: '1px solid #000' }}
              />
              {/* Name */}
              <p className="text-xs font-bold text-white flex-1 truncate group-hover:text-[#FF7A00] transition-colors font-mono">
                {habit.name}
              </p>

              {/* Current streak */}
              <div className="flex items-center gap-1 shrink-0 px-2.5 py-1 bg-[#FF7A00] text-black border border-black font-black text-xs shadow-[1.5px_1.5px_0px_#000000] transition-all group-hover:scale-105">
                <Flame size={12} className="text-black fill-black" />
                <span className="tabular-nums font-mono">{current}D</span>
              </div>

              {/* Best record */}
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

      <div className="flex items-center justify-between mt-4 pt-3.5 border-t-2 border-[#494848] font-mono text-[10px] text-[#C1C1C1] uppercase">
        <div className="flex items-center gap-1.5 font-bold">
          <Flame size={11} className="text-[#FF7A00]" /> CURRENT STREAK
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          <Shield size={11} className="text-[#FF7A00]" /> FROZEN DAYS PROTECTED
        </div>
      </div>
    </div>
  );
}

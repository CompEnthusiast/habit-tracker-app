import { Award, Flame, Target, Trophy } from 'lucide-react';
import { getLongestStreak } from '../utils/streaks';

export default function Achievements({ habits, completedCount }) {
  const bestStreak = habits.reduce((best, habit) => Math.max(best, getLongestStreak(habit.completions || {})), 0);
  const badges = [
    { label: 'First Check-in', unlocked: completedCount >= 1, icon: Target },
    { label: '7-Day Streak', unlocked: bestStreak >= 7, icon: Flame },
    { label: '30-Day Master', unlocked: bestStreak >= 30, icon: Trophy },
  ];

  return (
    <section className="rounded-xl border-2 border-[#494848] bg-[#1E1D1C] p-6 shadow-[5px_5px_0px_#000000]">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b-2 border-[#494848]">
        <Award size={18} className="text-[#FF7A00]" />
        <h2 className="text-base font-black uppercase text-white tracking-wider">ACHIEVEMENTS</h2>
        <span className="ml-auto brutal-badge-orange rounded">
          {badges.filter((badge) => badge.unlocked).length}/{badges.length} UNLOCKED
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {badges.map(({ label, unlocked, icon: Icon }) => (
          <div
            key={label}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
              unlocked
                ? 'bg-[#FF7A00] text-black border-black shadow-[3px_3px_0px_#000000]'
                : 'bg-[#100E0C] border-[#494848] text-[#737373] shadow-[2px_2px_0px_#000000] opacity-60'
            }`}
            title={label}
          >
            <Icon size={18} strokeWidth={2.5} className="mb-1.5" />
            <span className="text-[10px] font-mono font-black uppercase leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

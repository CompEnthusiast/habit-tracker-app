import { Award, Flame, Target, Trophy } from 'lucide-react';
import { getLongestStreak } from '../utils/streaks';

export default function Achievements({ habits, completedCount }) {
  const bestStreak = habits.reduce((best, habit) => Math.max(best, getLongestStreak(habit.completions || {})), 0);
  const badges = [
    { label: 'First check-in', unlocked: completedCount >= 1, icon: Target },
    { label: '7-day streak', unlocked: bestStreak >= 7, icon: Flame },
    { label: '30-day streak', unlocked: bestStreak >= 30, icon: Trophy },
  ];

  return (
    <section className="rounded-3xl border border-white/5 p-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}>
      <div className="flex items-center gap-2 mb-5">
        <Award size={16} className="text-accent3" />
        <h2 className="text-base font-bold text-white">Achievements</h2>
        <span className="ml-auto text-xs text-gray-500">{badges.filter((badge) => badge.unlocked).length}/{badges.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {badges.map(({ label, unlocked, icon: Icon }) => (
          <div key={label} className={`achievement ${unlocked ? 'achievement--unlocked' : ''}`} title={label}>
            <Icon size={18} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

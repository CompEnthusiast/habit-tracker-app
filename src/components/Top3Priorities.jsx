import React from 'react';
import { Target, Star, CheckCircle, Circle } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export default function Top3Priorities({
  habits = [],
  priorityIds = [],
  onTogglePriority,
  onToggleComplete
}) {
  const topHabits = habits.filter(h => priorityIds.includes(h._id));

  return (
    <div className="bg-[#1E1D1C] border-2 border-[#494848] p-4 shadow-[4px_4px_0px_#000000] text-stone-100">
      <div className="flex items-center justify-between mb-3 border-b-2 border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-[#FF7A00]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Today&apos;s Top 3 Priorities ({topHabits.length}/3)
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-stone-400">
          Eisenhower Focus
        </span>
      </div>

      {topHabits.length === 0 ? (
        <div className="p-3 bg-stone-900 border border-stone-800 text-xs text-stone-400 text-center">
          Tap the star <Star size={12} className="inline text-amber-400" /> on any 3 habits below to lock in your daily focus.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {topHabits.map((habit, index) => {
            const isDone = habit.completed;
            return (
              <div
                key={habit._id}
                className={`p-3 border-2 transition flex items-center justify-between gap-2 ${
                  isDone
                    ? 'border-emerald-600 bg-emerald-950/20 opacity-80'
                    : 'border-stone-700 bg-stone-900 hover:border-[#FF7A00]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => {
                      onToggleComplete(habit._id);
                      if (!isDone) soundEffects.playHabitCheck();
                    }}
                    className="shrink-0 text-stone-400 hover:text-white"
                  >
                    {isDone ? (
                      <CheckCircle size={18} className="text-emerald-400" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <div className="truncate">
                    <span className="text-[10px] font-black uppercase text-[#FF7A00] block">
                      #{index + 1} Priority
                    </span>
                    <span
                      className={`text-xs font-bold truncate block ${
                        isDone ? 'line-through text-stone-500' : 'text-stone-100'
                      }`}
                    >
                      {habit.title || habit.name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onTogglePriority(habit._id)}
                  title="Unpin from Top 3"
                  className="text-amber-400 hover:text-stone-400 shrink-0 p-1"
                >
                  <Star size={14} fill="#fbbf24" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Plus,
  CheckSquare,
  Calendar as CalendarIcon,
  Activity,
  Award,
  Timer,
  ListChecks,
  Search,
  Filter,
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import SubtaskList from './SubtaskList';

const colorHexMap = {
  primary: '#FF7A00',
  secondary: '#FFA64D',
  accent1: '#FF7A00',
  accent2: '#FFA64D',
  accent3: '#FF5500',
  success: '#FF7A00',
};

export default function TodayTasksChecklist({
  habits = [],
  todayDateKey,
  todayDayNum,
  onToggleHabit,
  onAddHabit,
  onOpenPomodoro,
}) {
  const [muted, setMuted] = useState(sounds.isMuted());
  const [filterPriority, setFilterPriority] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubtasksHabitId, setExpandedSubtasksHabitId] = useState(null);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  const activeHabits = useMemo(() => habits.filter((h) => !h.droppedFromToday), [habits]);

  const completedTodayHabits = activeHabits.filter(
    (h) => h.completions && h.completions[todayDateKey]
  );
  const totalHabits = activeHabits.length;
  const completedCount = completedTodayHabits.length;
  const completionPercent =
    totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
  const isAllDone = totalHabits > 0 && completedCount === totalHabits;

  // Filtered habits
  const filteredHabits = useMemo(() => {
    return activeHabits.filter((h) => {
      const matchSearch =
        !searchQuery ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.category && h.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchPriority =
        filterPriority === 'ALL' ||
        (h.priority || 'Medium').toUpperCase() === filterPriority;

      return matchSearch && matchPriority;
    });
  }, [activeHabits, searchQuery, filterPriority]);

  const handleToggle = (habit) => {
    const isCurrentlyDone = habit.completions && habit.completions[todayDateKey];
    if (!isCurrentlyDone) {
      if (completedCount + 1 === totalHabits) {
        sounds.playVictory();
      } else {
        sounds.playCheck();
      }
    }
    onToggleHabit(habit._id, todayDayNum);
  };

  const toggleSound = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
  };

  const getSyncSourceIcon = (source) => {
    switch (source) {
      case 'google_tasks':
        return <CheckSquare size={13} className="text-[#FF7A00]" title="Auto-Synced with Google Tasks" />;
      case 'google_calendar':
        return <CalendarIcon size={13} className="text-[#C1C1C1]" title="Auto-Synced with Calendar" />;
      case 'google_fit':
        return <Activity size={13} className="text-[#FFA64D]" title="Auto-Synced with Google Fit" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-5 rounded-xl border-2 border-[#494848] bg-[#1E1D1C] shadow-[5px_5px_0px_#000000] relative overflow-hidden transition-all">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#494848]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-black uppercase text-white flex items-center gap-2 font-mono">
              <Sparkles size={18} className="text-[#FF7A00]" />
              TODAY'S HABIT CHECKLIST
            </span>
            <span className="brutal-badge bg-[#100E0C] text-[#C1C1C1] rounded font-mono">
              {todayFormatted}
            </span>
          </div>
          <p className="text-xs text-[#C1C1C1] mt-1 font-mono">
            Daily discipline agenda. Rollover updates automatically at midnight.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="brutal-btn brutal-btn-ghost px-2.5 py-1.5 text-xs hover:text-[#FF7A00]"
            title={muted ? 'Unmute check-in sounds' : 'Mute check-in sounds'}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-[#FF7A00]" />}
          </button>

          {/* Add Habit Quick Button */}
          <button
            onClick={onAddHabit}
            className="brutal-btn brutal-btn-primary px-3 py-1.5 rounded-lg text-xs"
          >
            <Plus size={13} strokeWidth={3} />
            ADD HABIT
          </button>
        </div>
      </div>

      {/* Progress Bar & Stats */}
      <div className="py-4">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="font-bold text-[#C1C1C1] uppercase">
            PROGRESS: <strong className="text-white font-black">{completedCount}/{totalHabits}</strong> DONE
          </span>
          <span className="font-black text-[#FF7A00] text-sm">{completionPercent}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-[#100E0C] overflow-hidden border-2 border-[#494848] shadow-[2px_2px_0px_#000000] brutal-progress-bar">
          <div
            className="h-full transition-all duration-500 bg-[#FF7A00]"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* 100% Celebration Banner */}
      {isAllDone && (
        <div className="mb-4 p-3 rounded-lg bg-[#FF7A00] border-2 border-black text-black flex items-center justify-between shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-black text-[#FF7A00] flex items-center justify-center font-black">
              <Award size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase font-mono">ALL HABITS COMPLETED FOR TODAY! 🎉</p>
              <p className="text-[11px] font-bold font-mono">Discipline intact. Rollover locks past days at 00:00.</p>
            </div>
          </div>
          <Flame size={20} className="text-black fill-black animate-bounce" />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4 p-2 bg-[#100E0C] border border-[#494848]">
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
          <Search size={14} className="text-[#C1C1C1] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search today's tasks..."
            className="w-full bg-transparent text-xs font-mono text-white placeholder-[#737373] outline-none"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
          <span className="text-[10px] font-mono font-bold text-[#C1C1C1] mr-1 hidden sm:inline">PRIORITY:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPriority(p)}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border transition-all ${
                filterPriority === p
                  ? 'border-[#FF7A00] bg-[#FF7A00] text-black font-black'
                  : 'border-[#494848] text-[#C1C1C1] hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Habit Items Grid / Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredHabits.map((habit) => {
          const isDone = Boolean(habit.completions && habit.completions[todayDateKey]);
          const colorHex = colorHexMap[habit.color] || '#FF7A00';
          const syncSource = habit.autoSync?.enabled ? habit.autoSync.source : 'none';
          const priority = habit.priority || 'Medium';

          const priorityStyle =
            priority === 'High' ? 'text-[#FF4444] border-[#FF4444]/60' :
            priority === 'Medium' ? 'text-[#FFB800] border-[#FFB800]/60' : 'text-[#8E8E93] border-[#8E8E93]/60';

          return (
            <div
              key={habit._id}
              className={`p-3 border-2 select-none transition-all duration-100 flex flex-col justify-between gap-2 group/item ${
                isDone
                  ? 'bg-[#100E0C] border-[#FF7A00] shadow-[3px_3px_0px_#FF7A00]'
                  : 'bg-[#100E0C] border-[#494848] shadow-[3px_3px_0px_#000000] hover:border-[#FF7A00] hover:-translate-y-px hover:shadow-[4px_4px_0px_#FF7A00]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex items-start gap-2.5 min-w-0 cursor-pointer flex-1"
                  onClick={() => handleToggle(habit)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggle(habit);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Mark ${habit.name} ${isDone ? 'incomplete' : 'complete'}`}
                    className="shrink-0 transition-transform active:scale-90 group-hover/item:scale-110 mt-0.5"
                  >
                    {isDone ? (
                      <div className="w-5 h-5 rounded bg-[#FF7A00] border-2 border-black flex items-center justify-center text-black font-black text-xs font-mono">
                        ✓
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded bg-[#1E1D1C] border-2 border-[#494848] hover:border-[#FF7A00]" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold font-mono truncate ${
                        isDone ? 'line-through text-[#737373]' : 'text-white'
                      }`}
                    >
                      {habit.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className="inline-block w-2 h-2 rounded-none shrink-0"
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="text-[9px] font-mono text-[#C1C1C1] uppercase truncate">
                        {habit.category}
                      </span>
                      <span className={`text-[8px] font-mono font-bold px-1 py-0 border ${priorityStyle}`}>
                        {priority.toUpperCase()}
                      </span>
                      {syncSource !== 'none' && (
                        <span className="inline-flex items-center ml-1">
                          {getSyncSourceIcon(syncSource)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                {isDone ? (
                  <span className="brutal-badge-orange rounded text-[9px] font-mono shrink-0">
                    DONE
                  </span>
                ) : (
                  <span className="brutal-badge bg-[#1E1D1C] text-[#C1C1C1] rounded text-[9px] font-mono shrink-0">
                    TO DO
                  </span>
                )}
              </div>

              {/* Action Toolbar: Pomodoro Focus + Subtasks toggle */}
              <div className="pt-2 border-t border-[#494848]/40 flex items-center justify-between text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => onOpenPomodoro?.(habit._id)}
                  title="Start 25-min Pomodoro Focus Session"
                  className="flex items-center gap-1 text-[#C1C1C1] hover:text-[#FF7A00] transition-colors"
                >
                  <Timer size={12} className="text-[#FF7A00]" />
                  <span>FOCUS</span>
                </button>

                <div className="flex-1 ml-3">
                  <SubtaskList habitId={habit._id} habitName={habit.name} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * PomodoroTimer — Focus timer linked to a specific task
 * 
 * Features:
 * - 25min work / 5min break (configurable)
 * - Links to a selected habit
 * - Tracks total time per task (persisted in localStorage)
 * - Browser notification on completion
 * - Animated circular progress
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Coffee, Zap } from 'lucide-react';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

/** Get tracked time per habit from localStorage */
function getTrackedTime() {
  try {
    const raw = localStorage.getItem('habit_tracker_pomodoro_time');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTrackedTime(data) {
  try {
    localStorage.setItem('habit_tracker_pomodoro_time', JSON.stringify(data));
  } catch {}
}

export default function PomodoroTimer({ habits = [], initialHabitId = '', onClose }) {
  const [selectedHabitId, setSelectedHabitId] = useState(initialHabitId || '');
  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [trackedTime, setTrackedTime] = useState(getTrackedTime);
  const intervalRef = useRef(null);

  const totalDuration = mode === 'work' ? WORK_DURATION : BREAK_DURATION;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const selectedHabit = habits.find((h) => h._id === selectedHabitId);

  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(WORK_DURATION);
  }, []);

  // Timer tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer completed
          setIsRunning(false);

          if (mode === 'work') {
            // Log work session
            setSessions((s) => s + 1);
            if (selectedHabitId) {
              setTrackedTime((prev) => {
                const next = { ...prev, [selectedHabitId]: (prev[selectedHabitId] || 0) + WORK_DURATION };
                saveTrackedTime(next);
                return next;
              });
            }
            // Notify
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Pomodoro Complete! 🍅', {
                body: `Great focus session${selectedHabit ? ` on "${selectedHabit.name}"` : ''}! Time for a break.`,
              });
            }
            // Switch to break
            setMode('break');
            return BREAK_DURATION;
          } else {
            // Break over → back to work
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Break Over! ⚡', { body: 'Ready for another focus session?' });
            }
            setMode('work');
            return WORK_DURATION;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, selectedHabitId, selectedHabit]);

  const getHabitTime = (habitId) => {
    const secs = trackedTime[habitId] || 0;
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="brutal-card rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[--color-borderSlate]">
        <div className="flex items-center gap-2">
          <Timer size={18} className="text-[--color-primary]" />
          <span className="text-base font-black uppercase text-[--color-text] tracking-wider">POMODORO TIMER</span>
          <span className="brutal-badge-orange rounded text-[10px]">{sessions} SESSIONS</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-[--color-silver] hover:text-[--color-primary] transition-colors" aria-label="Close pomodoro">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Task Selector */}
      <div className="mb-4">
        <label className="block text-[10px] font-black text-[--color-primary] uppercase tracking-widest mb-1.5 font-mono">
          // LINKED TASK
        </label>
        <select
          value={selectedHabitId}
          onChange={(e) => setSelectedHabitId(e.target.value)}
          className="w-full px-3 py-2 text-[--color-text] text-xs bg-[--color-background] border-2 border-[--color-borderSlate] outline-none focus:border-[--color-primary] font-mono"
          aria-label="Select task for pomodoro"
        >
          <option value="">No task linked</option>
          {habits.map((h) => (
            <option key={h._id} value={h._id}>
              {h.name} ({getHabitTime(h._id)} tracked)
            </option>
          ))}
        </select>
      </div>

      {/* Timer Display */}
      <div className="flex flex-col items-center py-6">
        {/* Circular progress */}
        <div className="relative w-40 h-40 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="var(--color-borderSlate)" strokeWidth="4" fill="none" />
            <circle
              cx="50" cy="50" r="45"
              stroke={mode === 'work' ? 'var(--color-primary)' : '#22c55e'}
              strokeWidth="4" fill="none"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[--color-text] font-mono tabular-nums">{formatTime(timeLeft)}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest font-mono mt-1 ${mode === 'work' ? 'text-[--color-primary]' : 'text-green-400'}`}>
              {mode === 'work' ? '⚡ FOCUS' : '☕ BREAK'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {isRunning ? (
            <button
              onClick={pauseTimer}
              className="brutal-btn brutal-btn-ghost px-4 py-2 text-xs rounded"
              aria-label="Pause timer"
            >
              <Pause size={14} />
              PAUSE
            </button>
          ) : (
            <button
              onClick={startTimer}
              className="brutal-btn brutal-btn-primary px-4 py-2 text-xs rounded"
              aria-label="Start timer"
            >
              <Play size={14} />
              {timeLeft < totalDuration ? 'RESUME' : 'START'}
            </button>
          )}
          <button
            onClick={resetTimer}
            className="brutal-btn brutal-btn-ghost px-3 py-2 text-xs rounded"
            aria-label="Reset timer"
          >
            <RotateCcw size={14} />
            RESET
          </button>
        </div>
      </div>

      {/* Time tracked per linked task */}
      {selectedHabitId && trackedTime[selectedHabitId] > 0 && (
        <div className="mt-3 pt-3 border-t-2 border-[--color-borderSlate] text-center">
          <span className="text-[10px] font-mono text-[--color-silver] uppercase">
            TOTAL TRACKED: <strong className="text-[--color-primary]">{getHabitTime(selectedHabitId)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

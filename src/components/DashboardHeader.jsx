import {
  CheckCircle2,
  TrendingUp,
  Calendar as CalendarIcon,
  LogOut,
  Plus,
  History,
  Timer,
  Keyboard,
  Sun,
  Moon,
  Bot,
  Headphones,
  Mic,
  Smile,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SyncStatusBadge from './SyncStatusBadge';

export default function DashboardHeader({
  currentMonth,
  completedHabits,
  totalHabits,
  progress,
  onAddHabit,
  onOpenHistory,
  onOpenPomodoro,
  onOpenShortcuts,
  onOpenAICoach,
  onOpenAmbience,
  onOpenVoice,
  onOpenMood,
  onOpenSettings,
  isOnline,
  syncStatus,
  lastSyncTime,
  onSyncNow,
  pendingCount = 0,
}) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-5 border-2 border-[#494848] bg-[#1E1D1C] shadow-[5px_5px_0px_#000000]">
      {/* Left: Title + User info + Sync Badge */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="p-3 border-2 border-black bg-[#FF7A00] shadow-[3px_3px_0px_#000000] shrink-0 transition-all hover:shadow-[5px_5px_0px_#000] hover:-translate-x-px hover:-translate-y-px">
          <CalendarIcon size={24} className="text-black" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-none font-mono">
              {currentMonth} TRACKER
            </h1>
            <span className="brutal-badge brutal-badge-orange font-mono">ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-[11px] font-mono text-[#C1C1C1]">
              USER: <span className="text-white font-bold">{user?.email?.split('@')[0] || 'User'}</span>
            </p>
            <SyncStatusBadge
              isOnline={isOnline}
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
              onSyncNow={onSyncNow}
              pendingCount={pendingCount}
            />
          </div>
        </div>
      </div>

      {/* Right: Stats + Quick Tool Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        {/* Completed stat */}
        <div className="brutal-stat-card flex items-center gap-2.5 px-3 py-2 border-2 border-[#494848] bg-[#100E0C] shadow-[2px_2px_0px_#000000]">
          <CheckCircle2 size={16} className="text-[#FF7A00] shrink-0" />
          <div>
            <p className="text-[9px] text-[#C1C1C1] font-mono font-bold uppercase tracking-wider leading-none">DONE</p>
            <p className="text-base font-black text-white leading-tight font-mono">
              {completedHabits}
              <span className="text-xs text-[#C1C1C1] font-normal ml-0.5">/{totalHabits}</span>
            </p>
          </div>
        </div>

        {/* Progress stat */}
        <div className="brutal-stat-card flex items-center gap-2.5 px-3 py-2 border-2 border-[#494848] bg-[#100E0C] shadow-[2px_2px_0px_#000000]">
          <TrendingUp size={16} className="text-[#FF7A00] shrink-0" />
          <div>
            <p className="text-[9px] text-[#C1C1C1] font-mono font-bold uppercase tracking-wider leading-none">RATE</p>
            <p className="text-base font-black text-[#FF7A00] leading-tight font-mono tabular-nums">
              {progress.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* History Modal Button */}
        <button
          onClick={onOpenHistory}
          className="brutal-btn brutal-btn-ghost px-3 py-2 text-xs font-mono"
          title="Browse locked past days history"
        >
          <History size={14} className="text-[#FF7A00]" />
          <span className="hidden sm:inline">HISTORY</span>
        </button>

        {/* Pomodoro Timer Button */}
        <button
          onClick={onOpenPomodoro}
          className="brutal-btn brutal-btn-ghost px-3 py-2 text-xs font-mono"
          title="Open Focus Pomodoro Timer"
        >
          <Timer size={14} className="text-[#FFA64D]" />
          <span className="hidden sm:inline">FOCUS</span>
        </button>

        {/* AI Habit Coach */}
        {onOpenAICoach && (
          <button
            onClick={onOpenAICoach}
            className="brutal-btn brutal-btn-ghost px-2.5 py-2 text-xs font-mono text-[#FF7A00]"
            title="Open AI Habit Coach & Predictive Analytics"
          >
            <Bot size={15} />
            <span className="hidden xl:inline">AI COACH</span>
          </button>
        )}

        {/* Focus Ambience Audio & Pomodoro */}
        {onOpenAmbience && (
          <button
            onClick={onOpenAmbience}
            className="brutal-btn brutal-btn-ghost px-2.5 py-2 text-xs font-mono"
            title="Focus Audio Ambience (Rain, Lo-Fi, Binaural)"
          >
            <Headphones size={15} className="text-amber-400" />
            <span className="hidden xl:inline">AUDIO</span>
          </button>
        )}

        {/* Voice Check-ins */}
        {onOpenVoice && (
          <button
            onClick={onOpenVoice}
            className="brutal-btn brutal-btn-ghost px-2.5 py-2 text-xs font-mono"
            title="Voice Check-in & Speech Assistant (V)"
          >
            <Mic size={15} className="text-rose-400" />
            <span className="hidden xl:inline">VOICE</span>
          </button>
        )}

        {/* Mood Tracker */}
        {onOpenMood && (
          <button
            onClick={onOpenMood}
            className="brutal-btn brutal-btn-ghost px-2.5 py-2 text-xs font-mono"
            title="Log Mood & Correlation Analytics (M)"
          >
            <Smile size={15} className="text-emerald-400" />
            <span className="hidden xl:inline">MOOD</span>
          </button>
        )}

        {/* Settings Modal Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="brutal-btn brutal-btn-ghost px-2.5 py-2 text-xs font-mono"
            title="Settings & Data Management"
          >
            <Settings size={15} className="text-stone-300" />
          </button>
        )}

        {/* Shortcuts Help Button */}
        <button
          onClick={onOpenShortcuts}
          className="brutal-btn brutal-btn-ghost px-2.5 py-2 text-xs font-mono"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={14} className="text-[#C1C1C1]" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="brutal-btn brutal-btn-ghost px-2.5 py-2 text-xs"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} className="text-[#FFA64D]" /> : <Moon size={14} className="text-white" />}
        </button>

        {/* Add Habit */}
        <button
          onClick={onAddHabit}
          className="brutal-btn brutal-btn-primary px-4 py-2 text-xs font-mono"
        >
          <Plus size={15} strokeWidth={3} />
          <span>ADD HABIT</span>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="brutal-btn brutal-btn-ghost px-3 py-2 text-xs hover:text-[#FF4444] hover:border-[#FF4444] hover:!shadow-[3px_3px_0px_#FF4444]"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

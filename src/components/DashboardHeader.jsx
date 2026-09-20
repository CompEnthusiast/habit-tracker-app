import { CheckCircle2, TrendingUp, Calendar as CalendarIcon, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardHeader({ currentMonth, completedHabits, totalHabits, progress, onAddHabit }) {
  const { logout, user } = useAuth();

  return (
    <div
      className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 p-6 rounded-3xl border border-white/5 shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
    >
      {/* Left: Month + user */}
      <div className="flex items-center gap-4">
        <div
          className="p-3.5 rounded-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))' }}
        >
          <CalendarIcon size={26} className="text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{currentMonth} Tracker</h1>
          <p className="text-sm text-gray-500">
            👋 Welcome back, <span className="text-gray-300 font-medium">{user?.email?.split('@')[0] || 'User'}</span>
          </p>
        </div>
      </div>

      {/* Right: Stats + buttons */}
      <div className="flex flex-wrap gap-3 w-full md:w-auto">
        {/* Completed */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/5 flex-1 md:flex-none"
          style={{ background: 'rgba(34,197,94,0.07)' }}
        >
          <CheckCircle2 size={18} className="text-success shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Done</p>
            <p className="text-lg font-bold text-white leading-none">
              {completedHabits}
              <span className="text-xs text-gray-600 font-normal ml-1">/ {totalHabits}</span>
            </p>
          </div>
        </div>

        {/* Progress */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/5 flex-1 md:flex-none"
          style={{ background: 'rgba(245,158,11,0.07)' }}
        >
          <TrendingUp size={18} className="text-accent3 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Progress</p>
            <p className="text-lg font-bold text-white leading-none">{progress.toFixed(1)}%</p>
          </div>
        </div>

        {/* Add habit */}
        <button
          onClick={onAddHabit}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            boxShadow: '0 6px 24px rgba(168,85,247,0.4)',
          }}
        >
          <Plus size={16} />
          Add Habit
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-danger text-sm border border-danger/20 hover:bg-danger/10 transition-all"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}

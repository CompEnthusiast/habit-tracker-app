import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { WifiOff, Database, RefreshCw, Undo2, Redo2 } from 'lucide-react';
import DashboardHeader from './components/DashboardHeader';
import HabitGrid from './components/HabitGrid';
import Analysis from './components/Analysis';
import MentalStateChart from './components/MentalStateChart';
import HabitPieChart from './components/HabitPieChart';
import StreakPanel from './components/StreakPanel';
import AddHabitModal from './components/AddHabitModal';
import ExportMenu from './components/ExportMenu';
import HealthTicker from './components/HealthTicker';
import Achievements from './components/Achievements';
import ReminderPanel from './components/ReminderPanel';
import GoogleSyncPanel from './components/GoogleSyncPanel';
import TodayTasksChecklist from './components/TodayTasksChecklist';
import BackupRestoreModal from './components/BackupRestoreModal';
import HistoryView from './components/HistoryView';
import PomodoroTimer from './components/PomodoroTimer';
import HeatmapChart from './components/HeatmapChart';
import WeeklyProgressChart from './components/WeeklyProgressChart';
import DailyNotes from './components/DailyNotes';
import DebugPanel from './components/DebugPanel';
import ShortcutsHelp from './components/ShortcutsHelp';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { fetchHabits, createHabit, updateHabit, deleteHabitApi, toggleHabitDay } from './api/habits';
import { getMonthDays } from './utils/streaks';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import {
  getCachedHabits,
  saveCachedHabits,
  enqueueAction,
  flushPendingQueue,
  getLastSyncTime,
  getPendingQueue,
  resolveHabitConflicts,
  createDebouncedSaver,
} from './utils/offlineSync';
import { useDayRollover, dateKey } from './hooks/useDayRollover';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function Dashboard() {
  const { user } = useAuth();
  const { toggleTheme } = useTheme();

  // Rollover simulation offset for testing midnight rollover
  const [debugDayOffset, setDebugDayOffset] = useState(0);

  // Day rollover handler
  const handleDayRollover = useCallback(({ previous, current, missedDays }) => {
    console.log(`[DayRollover] Midnight transition: ${previous} -> ${current}`);
    // Refresh habits and ensure yesterday's completions remain locked in history
    loadHabits();
  }, []);

  const { todayInfo, checkRollover } = useDayRollover(handleDayRollover, debugDayOffset);

  const [habits, setHabits] = useState(() => getCachedHabits() || []);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [pomodoroInitialHabitId, setPomodoroInitialHabitId] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date(todayInfo.year, todayInfo.month - 1, 1));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name' | 'priority' | 'streak'
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'synced' | 'syncing' | 'error' | 'idle'
  const [lastSyncTime, setLastSyncTime] = useState(getLastSyncTime);
  const [pendingCount, setPendingCount] = useState(() => getPendingQueue().length);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const searchInputRef = useRef(null);

  // Debounced cache saver (< 400ms)
  const debouncedSaveRef = useRef(createDebouncedSaver(saveCachedHabits, 350));

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const isCurrentMonth = selectedYear === todayInfo.year && selectedMonth === todayInfo.month;

  // Undo / Redo Hook
  const { record, undo, redo, canUndo, canRedo } = useUndoRedo();

  // Load habits from backend or cached fallback
  const loadHabits = useCallback(async () => {
    if (!user) return;
    try {
      setSyncStatus('syncing');
      const data = await fetchHabits();
      setHabits(data);
      saveCachedHabits(data);
      setLastSyncTime(Date.now());
      setSyncStatus('synced');
      setPendingCount(0);
    } catch (e) {
      const cached = getCachedHabits();
      if (cached && cached.length > 0) {
        setHabits(cached);
        setError('Working offline / using locally saved habits.');
      } else {
        setError(e.message || 'Failed to load habits.');
      }
      setSyncStatus(isOnline ? 'error' : 'idle');
    } finally {
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Periodic Auto-Sync (every 30s) as fallback
  useEffect(() => {
    const timer = setInterval(() => {
      if (navigator.onLine && user && syncStatus !== 'syncing') {
        loadHabits();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [user, syncStatus, loadHabits]);

  // Online / Offline Detection & Auto-Replay
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      const res = await flushPendingQueue(toggleHabitDay);
      setPendingCount(getPendingQueue().length);
      if (res.flushed > 0) {
        loadHabits();
      } else {
        setSyncStatus('synced');
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadHabits]);

  // Sync before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const cached = getCachedHabits();
      if (cached) saveCachedHabits(cached);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Optimistic Toggle Habit Check-in with Queueing & Locked Day Enforcement
  const toggleHabit = useCallback(
    async (habitId, day) => {
      const key = dateKey(selectedYear, selectedMonth, day);

      // Previous days locked rule
      const isPast =
        selectedYear < todayInfo.year ||
        (selectedYear === todayInfo.year && selectedMonth < todayInfo.month) ||
        (selectedYear === todayInfo.year && selectedMonth === todayInfo.month && day < todayInfo.day);

      if (isPast) {
        setError(`Day ${day} is in the past and permanently LOCKED.`);
        return;
      }

      // Record undo/redo action
      const habitObj = habits.find((h) => h._id === habitId);
      const prevDone = habitObj?.completions?.[key] || false;

      record({
        type: 'toggle',
        payload: { habitId, day, key, prevDone },
        undo: () => {
          setHabits((prev) => {
            const next = prev.map((h) =>
              h._id === habitId
                ? { ...h, completions: { ...h.completions, [key]: prevDone } }
                : h
            );
            debouncedSaveRef.current(next);
            return next;
          });
          if (navigator.onLine) toggleHabitDay(habitId, key).catch(() => {});
        },
        redo: () => {
          setHabits((prev) => {
            const next = prev.map((h) =>
              h._id === habitId
                ? { ...h, completions: { ...h.completions, [key]: !prevDone } }
                : h
            );
            debouncedSaveRef.current(next);
            return next;
          });
          if (navigator.onLine) toggleHabitDay(habitId, key).catch(() => {});
        },
      });

      // 1. Optimistic instant local update
      setHabits((prev) => {
        const updated = prev.map((h) =>
          h._id === habitId
            ? { ...h, completions: { ...h.completions, [key]: !h.completions?.[key] } }
            : h
        );
        debouncedSaveRef.current(updated);
        return updated;
      });

      // 2. Network sync or queue if offline
      if (!navigator.onLine) {
        enqueueAction({ type: 'toggle', habitId, key });
        setPendingCount(getPendingQueue().length);
        return;
      }

      try {
        setSyncStatus('syncing');
        const updated = await toggleHabitDay(habitId, key);
        setHabits((prev) => {
          const next = prev.map((h) =>
            h._id === habitId ? resolveHabitConflicts(h, updated) : h
          );
          debouncedSaveRef.current(next);
          return next;
        });
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } catch {
        enqueueAction({ type: 'toggle', habitId, key });
        setPendingCount(getPendingQueue().length);
        setSyncStatus('error');
        setError('Saved locally. Will auto-sync when network is ready.');
      }
    },
    [selectedYear, selectedMonth, todayInfo, habits, record]
  );

  const addHabit = useCallback(async (data) => {
    try {
      setSyncStatus('syncing');
      const newHabit = await createHabit(data);
      setHabits((prev) => {
        const updated = [...prev, newHabit];
        saveCachedHabits(updated);
        return updated;
      });
      setLastSyncTime(Date.now());
      setSyncStatus('synced');
    } catch (e) {
      setError(e.message);
      setSyncStatus('error');
    }
  }, []);

  const deleteHabit = useCallback(
    async (habitId) => {
      setHabits((prev) => {
        const updated = prev.filter((h) => h._id !== habitId);
        saveCachedHabits(updated);
        return updated;
      });
      try {
        setSyncStatus('syncing');
        await deleteHabitApi(habitId);
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } catch (e) {
        setError(e.message);
        loadHabits();
      }
    },
    [loadHabits]
  );

  const editHabit = useCallback(async (habitId, data) => {
    try {
      setSyncStatus('syncing');
      const updated = await updateHabit(habitId, data);
      setHabits((prev) => {
        const next = prev.map((h) => (h._id === habitId ? updated : h));
        saveCachedHabits(next);
        return next;
      });
      setLastSyncTime(Date.now());
      setSyncStatus('synced');
    } catch (e) {
      setError(e.message);
      setSyncStatus('error');
    }
  }, []);

  // Reorder habits via Drag and Drop
  const handleReorderHabits = useCallback((draggedId, targetId) => {
    setHabits((prev) => {
      const fromIdx = prev.findIndex((h) => h._id === draggedId);
      const toIdx = prev.findIndex((h) => h._id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      saveCachedHabits(copy);
      return copy;
    });
  }, []);

  const monthDaysMap = useMemo(() => {
    const map = {};
    for (const h of habits) {
      map[h._id] = getMonthDays(h.completions || {}, selectedYear, selectedMonth);
    }
    return map;
  }, [habits, selectedYear, selectedMonth]);

  // Search, filter, and sort habits
  const visibleHabits = useMemo(() => {
    return habits
      .filter((habit) => {
        const matchesSearch =
          !search ||
          habit.name.toLowerCase().includes(search.toLowerCase()) ||
          (habit.category && habit.category.toLowerCase().includes(search.toLowerCase()));

        const matchesCategory = categoryFilter === 'All' || habit.category === categoryFilter;
        const matchesPriority = priorityFilter === 'All' || (habit.priority || 'Medium') === priorityFilter;

        return matchesSearch && matchesCategory && matchesPriority;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'priority') {
          const rank = { High: 3, Medium: 2, Low: 1 };
          return (rank[b.priority || 'Medium'] || 2) - (rank[a.priority || 'Medium'] || 2);
        }
        return 0;
      });
  }, [habits, search, categoryFilter, priorityFilter, sortBy]);

  const elapsedDays = isCurrentMonth ? todayInfo.day : daysInSelectedMonth;
  const totalPossible = habits.length * elapsedDays;
  const completedCount = useMemo(
    () =>
      Object.values(monthDaysMap).reduce(
        (acc, days) => acc + Object.values(days).filter(Boolean).length,
        0
      ),
    [monthDaysMap]
  );
  const progress = totalPossible === 0 ? 0 : (completedCount / totalPossible) * 100;

  const chartData = useMemo(
    () =>
      Array.from({ length: daysInSelectedMonth }, (_, i) => {
        const day = i + 1;
        const doneToday = habits.filter((h) => (monthDaysMap[h._id] || {})[day]).length;
        const max = habits.length;
        const score = max > 0 ? 40 + Math.round((doneToday / max) * 60) : 50;
        return { day: day.toString(), score: Math.max(0, Math.min(100, score)) };
      }),
    [habits, monthDaysMap, daysInSelectedMonth]
  );

  // Global Keyboard Shortcuts
  const { showHelp: showShortcutsHelp, setShowHelp: setShowShortcutsHelp } = useKeyboardShortcuts({
    onNewTask: () => setShowModal(true),
    onToggleFocused: () => {
      // Toggle first pending habit for today
      const pendingHabit = habits.find((h) => !h.completions?.[todayInfo.dateKey]);
      if (pendingHabit) toggleHabit(pendingHabit._id, todayInfo.day);
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onUndo: () => undo(),
    onRedo: () => redo(),
    onToggleTheme: () => toggleTheme(),
    onEscape: () => {
      setShowModal(false);
      setShowBackupModal(false);
      setShowHistoryModal(false);
      setShowPomodoroModal(false);
      setShowShortcutsHelp(false);
    },
  });

  // Notifications
  useEffect(() => {
    if (!notificationsEnabled || typeof Notification === 'undefined') return undefined;
    const checkReminders = () => {
      const time = new Date().toTimeString().slice(0, 5);
      habits
        .filter((habit) => habit.reminderEnabled && habit.reminderTime === time)
        .forEach((habit) => {
          const key = `habit-reminder-${habit._id}-${new Date().toISOString().slice(0, 10)}`;
          if (!sessionStorage.getItem(key)) {
            new Notification(`Habit reminder: ${habit.name}`, {
              body: 'A small check-in keeps your streak moving.',
            });
            sessionStorage.setItem(key, 'shown');
          }
        });
    };
    checkReminders();
    const interval = window.setInterval(checkReminders, 60000);
    return () => window.clearInterval(interval);
  }, [habits, notificationsEnabled]);

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setError('This browser does not support notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (permission !== 'granted') setError('Notifications were not enabled.');
  };

  const currentMonth = selectedDate.toLocaleString('default', { month: 'long' });
  const categories = ['All', ...new Set(habits.map((habit) => habit.category))];
  const todayCompleted = habits.filter((habit) => habit.completions?.[todayInfo.dateKey]).length;

  if (loading && habits.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#100E0C]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-transparent border-t-[#FF7A00] animate-spin" />
          <p className="text-[#C1C1C1] text-sm font-mono">LOADING DISCIPLINE LOG…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{
        background:
          'radial-gradient(ellipse at 15% 0%, rgba(255,122,0,0.12) 0%, transparent 45%), radial-gradient(ellipse at 85% 100%, rgba(255,122,0,0.06) 0%, transparent 50%), #100E0C',
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <HealthTicker />

        {/* Status / Alert Banners */}
        {!isOnline && (
          <div className="flex items-center justify-between p-3 border-2 border-[#FFB800] bg-[#1E1D1C] text-[#FFB800] text-xs font-mono shadow-[3px_3px_0px_#000]">
            <div className="flex items-center gap-2">
              <WifiOff size={15} />
              <span>OFFLINE MODE: Changes saved locally and will auto-sync when reconnected.</span>
            </div>
            {pendingCount > 0 && <span className="font-bold">({pendingCount} queued)</span>}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between p-3 border-2 border-[#FF4444] bg-[#1E1D1C] text-[#FF4444] text-xs font-mono shadow-[3px_3px_0px_#000]"
          >
            <span>{error}</span>
            <button className="text-white underline text-xs ml-3 uppercase" onClick={() => setError('')}>
              DISMISS
            </button>
          </div>
        )}

        {/* Dashboard Header with Sync Badge & Action Controls */}
        <DashboardHeader
          currentMonth={currentMonth}
          completedHabits={completedCount}
          totalHabits={totalPossible}
          progress={progress}
          onAddHabit={() => setShowModal(true)}
          onOpenHistory={() => setShowHistoryModal(true)}
          onOpenPomodoro={() => {
            setPomodoroInitialHabitId(null);
            setShowPomodoroModal(true);
          }}
          onOpenShortcuts={() => setShowShortcutsHelp(true)}
          isOnline={isOnline}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          onSyncNow={loadHabits}
          pendingCount={pendingCount}
        />

        {/* Undo / Redo Bar */}
        {(canUndo || canRedo) && (
          <div className="flex items-center gap-2 p-2 bg-[#1E1D1C] border border-[#494848] text-xs font-mono">
            <span className="text-[#C1C1C1] mr-1">ACTION HISTORY:</span>
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-2.5 py-1 border border-[#494848] bg-[#100E0C] text-white hover:border-[#FF7A00] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo last action (Ctrl+Z)"
            >
              <Undo2 size={12} />
              <span>UNDO</span>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="flex items-center gap-1 px-2.5 py-1 border border-[#494848] bg-[#100E0C] text-white hover:border-[#FF7A00] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo action (Ctrl+Y)"
            >
              <Redo2 size={12} />
              <span>REDO</span>
            </button>
          </div>
        )}

        {/* Google 2-Way Sync & Auto-Assignment Panel */}
        <GoogleSyncPanel
          habits={habits}
          onHabitsUpdated={(updated) => {
            setHabits(updated);
            saveCachedHabits(updated);
          }}
        />

        {/* Today's Daily Habit Checklist */}
        {habits.length > 0 && (
          <TodayTasksChecklist
            habits={habits}
            todayDateKey={todayInfo.dateKey}
            todayDayNum={todayInfo.day}
            onToggleHabit={toggleHabit}
            onAddHabit={() => setShowModal(true)}
            onOpenPomodoro={(hId) => {
              setPomodoroInitialHabitId(hId);
              setShowPomodoroModal(true);
            }}
          />
        )}

        {/* Tools and Filter Bar */}
        <div className="dashboard-tools flex flex-wrap items-center justify-between gap-3 p-3 bg-[#1E1D1C] border-2 border-[#494848] shadow-[3px_3px_0px_#000]">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous month"
              className="month-nav w-7 h-7 flex items-center justify-center border-2 border-[#494848] bg-[#100E0C] text-white font-mono hover:border-[#FF7A00]"
              onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth - 2, 1))}
            >
              ‹
            </button>
            <span className="min-w-[140px] text-center text-xs font-black uppercase font-mono text-white">
              {currentMonth} {selectedYear}
            </span>
            <button
              aria-label="Next month"
              className="month-nav w-7 h-7 flex items-center justify-center border-2 border-[#494848] bg-[#100E0C] text-white font-mono hover:border-[#FF7A00]"
              onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth, 1))}
            >
              ›
            </button>
          </div>

          {/* Search, Category, Priority & Sort */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            <input
              ref={searchInputRef}
              aria-label="Search habits"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (press / to focus)"
              className="dashboard-input px-2.5 py-1.5 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none"
            />
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="dashboard-input px-2 py-1.5 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="dashboard-input px-2 py-1.5 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none"
            >
              <option value="All">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              aria-label="Sort habits"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="dashboard-input px-2 py-1.5 bg-[#100E0C] border-2 border-[#494848] text-white font-mono text-xs focus:border-[#FF7A00] outline-none"
            >
              <option value="default">Default Order</option>
              <option value="name">Sort by Name</option>
              <option value="priority">Sort by Priority</option>
            </select>

            {/* Backup & Restore Button */}
            <button
              onClick={() => setShowBackupModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-white bg-[#100E0C] border-2 border-[#494848] hover:border-[#FF7A00] transition-all"
              title="Backup & Restore Habit Data"
            >
              <Database size={13} className="text-[#FF7A00]" />
              BACKUP
            </button>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="summary-stat brutal-card p-3 rounded-lg">
            <span>Today Done</span>
            <strong className="font-mono text-[#FF7A00]">
              {todayCompleted}/{habits.length}
            </strong>
          </div>
          <div className="summary-stat brutal-card p-3 rounded-lg">
            <span>Visible Habits</span>
            <strong className="font-mono">{visibleHabits.length}</strong>
          </div>
          <div className="summary-stat brutal-card p-3 rounded-lg">
            <span>Month Check-ins</span>
            <strong className="font-mono">{completedCount}</strong>
          </div>
          <div className="summary-stat brutal-card p-3 rounded-lg">
            <span>Consistency</span>
            <strong className="font-mono text-[#FF7A00]">{progress.toFixed(0)}%</strong>
          </div>
        </div>

        {/* Habit Grid with Export button */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-3">
            <div className="flex justify-end">
              <ExportMenu
                habits={visibleHabits}
                monthDaysMap={monthDaysMap}
                daysInMonth={daysInSelectedMonth}
                monthName={currentMonth}
                year={selectedYear}
                currentDay={isCurrentMonth ? todayInfo.day : 1}
              />
            </div>
            <div className="overflow-x-auto">
              <HabitGrid
                habits={visibleHabits}
                monthDaysMap={monthDaysMap}
                toggleHabit={toggleHabit}
                deleteHabit={deleteHabit}
                editHabit={(habit) => {
                  setEditingHabit(habit);
                  setShowModal(true);
                }}
                onReorderHabits={handleReorderHabits}
                daysInMonth={daysInSelectedMonth}
                currentDay={todayInfo.day}
                currentYear={todayInfo.year}
                currentMonth={todayInfo.month}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            </div>
          </div>
          <div className="xl:col-span-1">
            <Analysis habits={visibleHabits} monthDaysMap={monthDaysMap} daysInMonth={daysInSelectedMonth} />
          </div>
        </div>

        {/* Weekly Progress Bar Chart & Heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <WeeklyProgressChart habits={habits} />
          <DailyNotes dateKey={todayInfo.dateKey} />
        </div>

        {/* GitHub-style Heatmap */}
        <HeatmapChart habits={habits} />

        {/* Streaks + Pie chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StreakPanel habits={visibleHabits} />
          <HabitPieChart habits={visibleHabits} monthDaysMap={monthDaysMap} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Achievements habits={habits} completedCount={completedCount} />
          <ReminderPanel
            habits={habits}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={enableNotifications}
          />
        </div>

        {/* Mental state line chart */}
        <MentalStateChart data={chartData} />
      </div>

      {/* Add / Edit Habit Modal */}
      {showModal && (
        <AddHabitModal
          editingHabit={editingHabit}
          onClose={() => {
            setShowModal(false);
            setEditingHabit(null);
          }}
          onAdd={addHabit}
          onUpdate={editHabit}
        />
      )}

      {/* History Browser Modal (Read-only past days) */}
      {showHistoryModal && (
        <HistoryView
          habits={habits}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Focus Pomodoro Timer Modal */}
      {showPomodoroModal && (
        <PomodoroTimer
          habits={habits}
          initialHabitId={pomodoroInitialHabitId}
          onClose={() => {
            setShowPomodoroModal(false);
            setPomodoroInitialHabitId(null);
          }}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )}

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        habits={habits}
        onHabitsReload={loadHabits}
      />

      {/* Developer Debug Panel for Midnight Rollover Testing */}
      <DebugPanel
        todayInfo={todayInfo}
        onSimulateNextDay={() => {
          setDebugDayOffset((prev) => prev + 1);
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

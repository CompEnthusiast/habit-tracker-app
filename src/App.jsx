import { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { fetchHabits, createHabit, updateHabit, deleteHabitApi, toggleHabitDay } from './api/habits';
import { getMonthDays } from './utils/streaks';
import { useAuth } from './context/AuthContext';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function Dashboard() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 1));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [error, setError] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const isCurrentMonth = selectedYear === CURRENT_YEAR && selectedMonth === CURRENT_MONTH;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchHabits()
      .then(data => setHabits(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const toggleHabit = useCallback(async (habitId, day) => {
    const key = dateKey(selectedYear, selectedMonth, day);
    setHabits(prev => prev.map(h =>
      h._id === habitId
        ? { ...h, completions: { ...h.completions, [key]: !h.completions[key] } }
        : h
    ));
    try {
      const updated = await toggleHabitDay(habitId, key);
      setHabits(prev => prev.map(h => h._id === habitId ? { ...h, completions: updated.completions } : h));
    } catch {
      setError('Could not save that check-in. Your view has been refreshed.');
      fetchHabits().then(setHabits).catch(() => {});
    }
  }, [selectedYear, selectedMonth]);

  const addHabit = useCallback(async (data) => {
    try {
      const newHabit = await createHabit(data);
      setHabits(prev => [...prev, newHabit]);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const deleteHabit = useCallback(async (habitId) => {
    setHabits(prev => prev.filter(h => h._id !== habitId));
    try {
      await deleteHabitApi(habitId);
    } catch (e) {
      setError(e.message);
      fetchHabits().then(setHabits).catch(() => {});
    }
  }, []);

  const editHabit = useCallback(async (habitId, data) => {
    try {
      const updated = await updateHabit(habitId, data);
      setHabits(prev => prev.map(h => h._id === habitId ? updated : h));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const monthDaysMap = useMemo(() => {
    const map = {};
    for (const h of habits) {
      map[h._id] = getMonthDays(h.completions || {}, selectedYear, selectedMonth);
    }
    return map;
  }, [habits, selectedYear, selectedMonth]);

  const visibleHabits = habits.filter((habit) => {
    const matchesSearch = habit.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || habit.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInSelectedMonth;
  const totalPossible = habits.length * elapsedDays;
  const completedCount = useMemo(() =>
    Object.values(monthDaysMap).reduce((acc, days) => acc + Object.values(days).filter(Boolean).length, 0),
  [monthDaysMap]);
  const progress = totalPossible === 0 ? 0 : (completedCount / totalPossible) * 100;

  const chartData = useMemo(() =>
    Array.from({ length: daysInSelectedMonth }, (_, i) => {
      const day = i + 1;
      const doneToday = habits.filter(h => (monthDaysMap[h._id] || {})[day]).length;
      const max = habits.length;
      const score = max > 0 ? 40 + Math.round((doneToday / max) * 60) : 50;
      return { day: day.toString(), score: Math.max(0, Math.min(100, score)) };
    }),
  [habits, monthDaysMap, daysInSelectedMonth]);

  useEffect(() => {
    if (!notificationsEnabled || typeof Notification === 'undefined') return undefined;
    const checkReminders = () => {
      const time = new Date().toTimeString().slice(0, 5);
      habits
        .filter((habit) => habit.reminderEnabled && habit.reminderTime === time)
        .forEach((habit) => {
          const key = `habit-reminder-${habit._id}-${new Date().toISOString().slice(0, 10)}`;
          if (!sessionStorage.getItem(key)) {
            new Notification(`Habit reminder: ${habit.name}`, { body: 'A small check-in keeps your streak moving.' });
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
  const todayCompleted = habits.filter((habit) => habit.completions?.[dateKey(CURRENT_YEAR, CURRENT_MONTH, now.getDate())]).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#12121c' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-secondary animate-spin" />
          <p className="text-gray-500 text-sm">Loading your habits…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{
        background: 'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.10) 0%, transparent 50%), #12121c',
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <HealthTicker />

        {error && (
          <div role="alert" className="flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            <span>{error}</span>
            <button className="text-red-100 underline" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        <DashboardHeader
          currentMonth={currentMonth}
          completedHabits={completedCount}
          totalHabits={totalPossible}
          progress={progress}
          onAddHabit={() => setShowModal(true)}
        />

        <div className="dashboard-tools">
          <div className="flex items-center gap-2">
            <button aria-label="Previous month" className="month-nav" onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth - 2, 1))}>‹</button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-gray-200">{currentMonth} {selectedYear}</span>
            <button aria-label="Next month" className="month-nav" onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth, 1))}>›</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input aria-label="Search habits" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search habits" className="dashboard-input" />
            <select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="dashboard-input">
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="summary-stat"><span>Today</span><strong>{todayCompleted}/{habits.length}</strong></div>
          <div className="summary-stat"><span>Visible habits</span><strong>{visibleHabits.length}</strong></div>
          <div className="summary-stat"><span>Month</span><strong>{completedCount}</strong></div>
          <div className="summary-stat"><span>Consistency</span><strong>{progress.toFixed(0)}%</strong></div>
        </div>

        {/* Habit Grid with Export button */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-3">
            {/* Export row */}
            <div className="flex justify-end">
              <ExportMenu
                habits={visibleHabits}
                monthDaysMap={monthDaysMap}
                daysInMonth={daysInSelectedMonth}
                monthName={currentMonth}
                year={selectedYear}
              />
            </div>
            <div className="overflow-x-auto">
              <HabitGrid
                habits={visibleHabits}
                monthDaysMap={monthDaysMap}
                toggleHabit={toggleHabit}
                deleteHabit={deleteHabit}
                editHabit={(habit) => { setEditingHabit(habit); setShowModal(true); }}
                daysInMonth={daysInSelectedMonth}
                currentDay={isCurrentMonth ? now.getDate() : 0}
                currentYear={selectedYear}
                currentMonth={selectedMonth}
              />
            </div>
          </div>
          <div className="xl:col-span-1">
            <Analysis habits={visibleHabits} monthDaysMap={monthDaysMap} daysInMonth={daysInSelectedMonth} />
          </div>
        </div>

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

      {showModal && (
        <AddHabitModal
          editingHabit={editingHabit}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
          onAdd={addHabit}
          onUpdate={editHabit}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

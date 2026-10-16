import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { WifiOff, Database, RefreshCw, Undo2, Redo2, Clock } from 'lucide-react';
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
import XPLevelBar from './components/XPLevelBar';
import StreakFreezeModal from './components/StreakFreezeModal';
import BadgeGalleryModal from './components/BadgeGalleryModal';
import RoutinesPanel from './components/RoutinesPanel';
import GuidedFlowModal from './components/GuidedFlowModal';
import AICoachModal from './components/AICoachModal';
import AmbienceMixerModal from './components/AmbienceMixerModal';
import VoiceCheckinModal from './components/VoiceCheckinModal';
import MoodTrackerModal from './components/MoodTrackerModal';
import Top3Priorities from './components/Top3Priorities';
import DailyQuestsPanel from './components/DailyQuestsPanel';
import EveningReviewModal from './components/EveningReviewModal';
import PWAInstallBanner from './components/PWAInstallBanner';
import SettingsModal from './components/SettingsModal';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { fetchHabits, createHabit, updateHabit, deleteHabitApi, toggleHabitDay } from './api/habits';
import { getMonthDays } from './utils/streaks';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import {
  getAllHabitsFromDB,
  saveHabitsToDB,
  saveSingleHabitToDB,
  softDeleteHabitInDB,
  getDayRecordFromDB,
  saveDayRecordToDB,
  getAllDayRecordsFromDB,
  getMeta,
  setMeta,
} from './utils/db';
import { updateAppBadge } from './utils/pwaManager';
import syncService from './utils/syncService';
import { useDayRollover, dateKey } from './hooks/useDayRollover';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  getUserGamificationState,
  handleHabitXpChange,
  calculateStreakWithFreezes,
  checkEligibleForFreezePrompt,
  evaluateAndUnlockBadges,
  getFreezeTokenStatus,
} from './utils/gamification';
import { calculateLevelFromXP } from './data/gamificationConfig';
import { sounds } from './utils/soundEffects';
import { triggerNeoConfetti } from './utils/confetti';

function Dashboard() {
  const { user } = useAuth();
  const { toggleTheme } = useTheme();

  // Rollover simulation offset for testing midnight rollover
  const [debugDayOffset, setDebugDayOffset] = useState(0);

  // Day rollover handler
  const handleDayRollover = useCallback(({ previous, current, missedDays, updatedHabits }) => {
    console.log(`[DayRollover] Midnight transition: ${previous} -> ${current}`);
    if (updatedHabits && updatedHabits.length > 0) {
      setHabits(updatedHabits);
      saveHabitsToDB(updatedHabits);
    }
    syncService.syncNow();
  }, []);

  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [pomodoroInitialHabitId, setPomodoroInitialHabitId] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name' | 'priority' | 'streak'
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'synced' | 'syncing' | 'error' | 'idle'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  // Gamification & RPG Leveling State
  const [gamificationState, setGamificationState] = useState({
    totalXP: 0,
    level: 1,
    currentLevelXP: 0,
    xpForNext: 100,
    progressPercent: 0,
    title: 'Novice',
    badgeColor: '#C1C1C1',
  });
  const [floatingXp, setFloatingXp] = useState(null);
  const [levelUpEvent, setLevelUpEvent] = useState(null);
  const [freezeTokensAvailable, setFreezeTokensAvailable] = useState(2);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezePromptDate, setFreezePromptDate] = useState(null);
  const [unlockedBadgeRecords, setUnlockedBadgeRecords] = useState([]);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [activeRoutineForFlow, setActiveRoutineForFlow] = useState(null);
  const [showGuidedFlowModal, setShowGuidedFlowModal] = useState(false);
  const [globalStreak, setGlobalStreak] = useState(0);
  const [globalBestStreak, setGlobalBestStreak] = useState(0);

  // Phase 3 Modal States
  const [showAICoachModal, setShowAICoachModal] = useState(false);
  const [showAmbienceModal, setShowAmbienceModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showEveningModal, setShowEveningModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [top3PriorityIds, setTop3PriorityIds] = useState([]);
  const [claimedQuestIds, setClaimedQuestIds] = useState([]);
  const [currentDayRecord, setCurrentDayRecord] = useState(null);
  const [allDayRecords, setAllDayRecords] = useState([]);

  const {
    todayInfo,
    checkRollover,
    simulateNextDay,
    clockWarning,
    isDateLocked,
  } = useDayRollover(handleDayRollover, debugDayOffset, habits);

  const [selectedDate, setSelectedDate] = useState(() => new Date(todayInfo.year, todayInfo.month - 1, 1));
  const searchInputRef = useRef(null);

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const isCurrentMonth = selectedYear === todayInfo.year && selectedMonth === todayInfo.month;

  // Undo / Redo Hook
  const { record, undo, redo, canUndo, canRedo } = useUndoRedo();

  // Initialize IndexedDB, Sync, Gamification, Streaks, and Day Records
  useEffect(() => {
    let unsubscribe = null;

    async function initStorageAndSync() {
      try {
        const local = await getAllHabitsFromDB();
        if (local && local.length > 0) {
          setHabits(local);
          setLoading(false);
        }

        // Load gamification state & level
        const gamState = await getUserGamificationState(local || []);
        setGamificationState(gamState);
        setUnlockedBadgeRecords(gamState.unlockedBadges || []);

        // Load streak with freeze immunity
        const streakInfo = await calculateStreakWithFreezes(local || [], todayInfo.dateKey);
        setGlobalStreak(streakInfo.currentStreak);
        setGlobalBestStreak(streakInfo.longestStreak);

        // Load streak freeze tokens
        const freezeStatus = await getFreezeTokenStatus();
        setFreezeTokensAvailable(freezeStatus.available);

        // Load Day Records for Mood & Correlations
        const dayRec = await getDayRecordFromDB(todayInfo.dateKey);
        setCurrentDayRecord(dayRec || { dateKey: todayInfo.dateKey, tasks: [], mood: null });
        const allDays = await getAllDayRecordsFromDB();
        setAllDayRecords(allDays || []);

        // Load Top 3 Priorities
        const savedTop3 = await getMeta('top3PriorityIds');
        if (savedTop3?.value) setTop3PriorityIds(savedTop3.value);

        // Load Daily Claimed Quests
        const savedClaimedQuests = await getMeta(`claimedQuests_${todayInfo.dateKey}`);
        if (savedClaimedQuests?.value) setClaimedQuestIds(savedClaimedQuests.value);

        // Check if yesterday was missed and eligible for freeze suggestion
        const freezeEligibility = await checkEligibleForFreezePrompt(local || []);
        if (freezeEligibility) {
          setFreezePromptDate(freezeEligibility.dateKey);
          setShowFreezeModal(true);
        }
      } catch (err) {
        console.warn('Initial IndexedDB/Gamification read error:', err);
      }

      unsubscribe = syncService.subscribe((state) => {
        setSyncStatus(state.status);
        setIsOnline(state.isOnline);
        setLastSyncTime(state.lastSyncTime);
        setPendingCount(state.pendingCount);
      });

      if (user) {
        await syncService.init((remoteHabits) => {
          setHabits(remoteHabits);
          setLoading(false);
          // Re-evaluate streaks
          calculateStreakWithFreezes(remoteHabits, todayInfo.dateKey).then((s) => {
            setGlobalStreak(s.currentStreak);
            setGlobalBestStreak(s.longestStreak);
          });
        });
      } else {
        setLoading(false);
      }
    }

    initStorageAndSync();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, todayInfo.dateKey]);

  // Optimistic Toggle Habit Check-in with Queueing & Locked Day Enforcement
  const toggleHabit = useCallback(
    async (habitId, day) => {
      const key = dateKey(selectedYear, selectedMonth, day);

      // Previous days locked rule
      if (isDateLocked(key)) {
        setError(`Date ${key} is locked. Past check-ins are read-only and cannot be unticked or edited.`);
        return;
      }

      const habitObj = habits.find((h) => h._id === habitId);
      const prevDone = habitObj?.completions?.[key] || false;

      // Record undo/redo action
      record({
        type: 'toggle',
        payload: { habitId, day, key, prevDone },
        undo: () => {
          setHabits((prev) => {
            const next = prev.map((h) =>
              h._id === habitId
                ? { ...h, completions: { ...h.completions, [key]: prevDone }, updatedAt: new Date().toISOString() }
                : h
            );
            syncService.debouncedSave(next);
            return next;
          });
          if (navigator.onLine) toggleHabitDay(habitId, key).catch(() => {});
        },
        redo: () => {
          setHabits((prev) => {
            const next = prev.map((h) =>
              h._id === habitId
                ? { ...h, completions: { ...h.completions, [key]: !prevDone }, updatedAt: new Date().toISOString() }
                : h
            );
            syncService.debouncedSave(next);
            return next;
          });
          if (navigator.onLine) toggleHabitDay(habitId, key).catch(() => {});
        },
      });

      // 1. Optimistic instant local update in state and IndexedDB
      const isNowCompleted = !prevDone;
      const updatedHabits = habits.map((h) =>
        h._id === habitId
          ? {
              ...h,
              completions: { ...h.completions, [key]: isNowCompleted },
              updatedAt: new Date().toISOString(),
            }
          : h
      );
      setHabits(updatedHabits);
      syncService.debouncedSave(updatedHabits);

      // 2. Award / retract XP with anti-cheat duplicate protection
      if (habitObj) {
        handleHabitXpChange(habitObj, key, isNowCompleted).then((xpRes) => {
          if (xpRes.delta !== 0) {
            setFloatingXp({ amount: xpRes.delta, id: Date.now() });
            setTimeout(() => setFloatingXp(null), 1800);
          }
          setGamificationState((prev) => ({
            ...prev,
            totalXP: xpRes.totalXP,
            ...calculateLevelFromXP(xpRes.totalXP),
          }));
          if (xpRes.leveledUp) {
            setLevelUpEvent({ level: xpRes.newLevel, title: xpRes.title });
          }
        });
      }

      // 3. Re-evaluate streaks with freeze protection and evaluate badges
      calculateStreakWithFreezes(updatedHabits, todayInfo.dateKey).then((s) => {
        setGlobalStreak(s.currentStreak);
        setGlobalBestStreak(s.longestStreak);

        const now = new Date();
        const totalDoneCount = updatedHabits.reduce(
          (acc, h) => acc + Object.values(h.completions || {}).filter(Boolean).length,
          0
        );

        evaluateAndUnlockBadges({
          totalCompletions: totalDoneCount,
          currentStreak: s.currentStreak,
          bestStreak: s.longestStreak,
          totalXP: gamificationState.totalXP,
          completedBefore7AM: now.getHours() < 7,
          completedAfter10PM: now.getHours() >= 22,
          completedWeekend: [0, 6].includes(now.getDay()),
        }).then((badgeRes) => {
          if (badgeRes.newlyUnlocked.length > 0) {
            setUnlockedBadgeRecords(badgeRes.allUnlocked);
            triggerNeoConfetti(2500);
            sounds.playBadgeUnlock();
          }
        });
      });

      // 4. Network sync or queue if offline
      if (!isOnline) {
        await syncService.queueAction('toggle', { habitId, key });
        return;
      }

      try {
        setSyncStatus('syncing');
        const updated = await toggleHabitDay(habitId, key);
        setHabits((prev) => {
          const next = prev.map((h) =>
            h._id === habitId
              ? { ...h, completions: updated.completions, updatedAt: updated.updatedAt }
              : h
          );
          syncService.debouncedSave(next);
          return next;
        });
        setSyncStatus('synced');
      } catch (err) {
        await syncService.queueAction('toggle', { habitId, key });
        setSyncStatus('error');
        setError('Saved locally in IndexedDB. Will auto-sync when online.');
      }
    },
    [selectedYear, selectedMonth, isDateLocked, habits, record, isOnline, todayInfo.dateKey, gamificationState.totalXP]
  );

  // Guided Flow step completion handler — auto-ticks matching habit
  const handleStepCompleteInFlow = useCallback(
    (step, habitKeyword) => {
      if (!habitKeyword) return;
      const kw = habitKeyword.toLowerCase();
      const match = habits.find(
        (h) =>
          h.name.toLowerCase().includes(kw) ||
          (h.category && h.category.toLowerCase().includes(kw))
      );
      if (match && !match.completions?.[todayInfo.dateKey]) {
        toggleHabit(match._id, todayInfo.day);
      }
    },
    [habits, todayInfo, toggleHabit]
  );

  // Guided Flow routine complete handler — awards +100 bonus XP!
  const handleRoutineCompleted = useCallback(
    async (completedRoutine) => {
      const currentXP = (await getMeta('user_total_xp')) || 0;
      const newXP = currentXP + 100;
      await setMeta('user_total_xp', newXP);
      const lvl = calculateLevelFromXP(newXP);
      setGamificationState((prev) => ({
        ...prev,
        totalXP: newXP,
        ...lvl,
      }));
      setFloatingXp({ amount: 100, id: Date.now() });
      setTimeout(() => setFloatingXp(null), 2500);

      // Check Routine Master badge
      const curRoutineCount = (await getMeta('routines_completed_count')) || 0;
      const nextCount = curRoutineCount + 1;
      await setMeta('routines_completed_count', nextCount);

      evaluateAndUnlockBadges({
        completedRoutinesCount: nextCount,
        totalXP: newXP,
        currentStreak: globalStreak,
        bestStreak: globalBestStreak,
      }).then((badgeRes) => {
        if (badgeRes.newlyUnlocked.length > 0) {
          setUnlockedBadgeRecords(badgeRes.allUnlocked);
          sounds.playBadgeUnlock();
        }
      });
    },
    [globalStreak, globalBestStreak]
  );

  const addHabit = useCallback(
    async (data) => {
      try {
        setSyncStatus('syncing');
        let newHabit;

        if (isOnline) {
          newHabit = await createHabit(data);
        } else {
          newHabit = {
            ...data,
            _id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            completions: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await syncService.queueAction('create', data);
        }

        await saveSingleHabitToDB(newHabit);
        setHabits((prev) => [...prev, newHabit]);
        setSyncStatus('synced');
      } catch (e) {
        setError(e.message || 'Failed to add habit.');
        setSyncStatus('error');
      }
    },
    [isOnline]
  );

  const deleteHabit = useCallback(
    async (habitId) => {
      setHabits((prev) => prev.filter((h) => h._id !== habitId));
      await softDeleteHabitInDB(habitId);

      if (isOnline) {
        try {
          await deleteHabitApi(habitId);
        } catch {
          await syncService.queueAction('delete', { habitId });
        }
      } else {
        await syncService.queueAction('delete', { habitId });
      }
    },
    [isOnline]
  );

  const editHabit = useCallback(
    async (habitId, data) => {
      try {
        const nextList = habits.map((h) =>
          h._id === habitId ? { ...h, ...data, updatedAt: new Date().toISOString() } : h
        );
        setHabits(nextList);
        const target = nextList.find((h) => h._id === habitId);
        if (target) await saveSingleHabitToDB(target);

        if (isOnline) {
          await updateHabit(habitId, data);
        } else {
          await syncService.queueAction('update', { habitId, data });
        }
      } catch (e) {
        setError(e.message || 'Failed to update habit.');
      }
    },
    [habits, isOnline]
  );

  // Reorder habits via Drag and Drop
  const handleReorderHabits = useCallback((draggedId, targetId) => {
    setHabits((prev) => {
      const fromIdx = prev.findIndex((h) => h._id === draggedId);
      const toIdx = prev.findIndex((h) => h._id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      syncService.debouncedSave(copy);
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

  // App Badge Update for pending tasks
  useEffect(() => {
    const pendingHabits = habits.filter((h) => !h.completions?.[todayInfo.dateKey]).length;
    updateAppBadge(pendingHabits);
  }, [habits, todayInfo.dateKey]);

  // Phase 3 Event Handlers
  const handleToggleTop3Priority = useCallback(async (habitId) => {
    setTop3PriorityIds((prev) => {
      let next;
      if (prev.includes(habitId)) {
        next = prev.filter((id) => id !== habitId);
      } else {
        if (prev.length >= 3) {
          next = [...prev.slice(1), habitId];
        } else {
          next = [...prev, habitId];
        }
      }
      setMeta('top3PriorityIds', next).catch(() => {});
      return next;
    });
  }, []);

  const handleSaveMood = useCallback(async (moodData) => {
    const updated = {
      ...(currentDayRecord || {}),
      dateKey: todayInfo.dateKey,
      mood: moodData,
      updatedAt: new Date().toISOString(),
    };
    setCurrentDayRecord(updated);
    await saveDayRecordToDB(updated);
    const all = await getAllDayRecordsFromDB();
    setAllDayRecords(all || []);
  }, [currentDayRecord, todayInfo.dateKey]);

  const handleSaveReflection = useCallback(async (reflectionData) => {
    const updated = {
      ...(currentDayRecord || {}),
      dateKey: todayInfo.dateKey,
      reflection: reflectionData,
      updatedAt: new Date().toISOString(),
    };
    setCurrentDayRecord(updated);
    await saveDayRecordToDB(updated);
    // Award 25 XP for evening reflection
    handleHabitXpChange(gamificationState.totalXP, 25).then((newState) => {
      setGamificationState(newState);
      setFloatingXp({ amount: 25, label: 'Reflection Done' });
    });
  }, [currentDayRecord, todayInfo.dateKey, gamificationState.totalXP]);

  const handleClaimQuestReward = useCallback(async (questId, xpReward) => {
    const nextClaimed = [...claimedQuestIds, questId];
    setClaimedQuestIds(nextClaimed);
    await setMeta(`claimedQuests_${todayInfo.dateKey}`, nextClaimed);
    const newState = await handleHabitXpChange(gamificationState.totalXP, xpReward);
    setGamificationState(newState);
    setFloatingXp({ amount: xpReward, label: 'Quest Reward' });
    triggerNeoConfetti();
  }, [claimedQuestIds, todayInfo.dateKey, gamificationState.totalXP]);

  const handleAcceptAIHabits = useCallback(async (newHabitsList) => {
    const createdHabits = [];
    for (const h of newHabitsList) {
      const habitDoc = {
        _id: 'habit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: h.title,
        title: h.title,
        description: h.description || '',
        category: h.category || 'General',
        priority: h.priority || 'Medium',
        frequency: h.frequency || 'Daily',
        routineStack: h.routineStack || '',
        completions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveSingleHabitToDB(habitDoc);
      createdHabits.push(habitDoc);
    }
    setHabits((prev) => [...prev, ...createdHabits]);
    syncService.syncNow();
    sounds.levelUp();
    triggerNeoConfetti();
  }, []);

  const handleResetAllData = useCallback(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const dbs = await window.indexedDB.databases?.();
    if (dbs) {
      for (const db of dbs) {
        window.indexedDB.deleteDatabase(db.name);
      }
    }
    window.location.reload();
  }, []);

  // Global Keyboard Shortcuts
  const { showHelp: showShortcutsHelp, setShowHelp: setShowShortcutsHelp } = useKeyboardShortcuts({
    onNewTask: () => setShowModal(true),
    onToggleFocused: () => {
      // Toggle first pending habit for today
      const pendingHabit = habits.find((h) => !h.completions?.[todayInfo.dateKey]);
      if (pendingHabit) toggleHabit(pendingHabit._id, todayInfo.day);
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onFlowMode: () => setShowGuidedFlowModal(true),
    onMoodTracker: () => setShowMoodModal(true),
    onVoiceCheckin: () => setShowVoiceModal(true),
    onAmbienceAudio: () => setShowAmbienceModal(true),
    onUndo: () => undo(),
    onRedo: () => redo(),
    onToggleTheme: () => toggleTheme(),
    onEscape: () => {
      setShowModal(false);
      setShowBackupModal(false);
      setShowHistoryModal(false);
      setShowPomodoroModal(false);
      setShowShortcutsHelp(false);
      setShowAICoachModal(false);
      setShowAmbienceModal(false);
      setShowVoiceModal(false);
      setShowMoodModal(false);
      setShowEveningModal(false);
      setShowSettingsModal(false);
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

        {/* RPG Level & XP Bar */}
        <XPLevelBar
          level={gamificationState.level}
          currentLevelXP={gamificationState.currentLevelXP}
          xpForNext={gamificationState.xpForNext}
          totalXP={gamificationState.totalXP}
          progressPercent={gamificationState.progressPercent}
          title={gamificationState.title}
          badgeColor={gamificationState.badgeColor}
          floatingXp={floatingXp}
          levelUpEvent={levelUpEvent}
          onDismissLevelUp={() => setLevelUpEvent(null)}
          onOpenBadges={() => setShowBadgesModal(true)}
        />

        {/* Status / Alert Banners */}
        {clockWarning && (
          <div
            role="alert"
            className="flex items-center justify-between p-3 border-2 border-[#FF4444] bg-[#1E1D1C] text-[#FF4444] text-xs font-mono shadow-[3px_3px_0px_#FF4444]"
          >
            <div className="flex items-center gap-2">
              <Clock size={15} />
              <span>
                <strong>CLOCK WARNING:</strong> {clockWarning}
              </span>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="flex items-center justify-between p-3 border-2 border-[#FFB800] bg-[#1E1D1C] text-[#FFB800] text-xs font-mono shadow-[3px_3px_0px_#000]">
            <div className="flex items-center gap-2">
              <WifiOff size={15} />
              <span>OFFLINE MODE: Changes saved locally in IndexedDB and will auto-sync when reconnected.</span>
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

        {/* PWA Install & iOS Home Screen Banner */}
        <PWAInstallBanner />

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
          onOpenAICoach={() => setShowAICoachModal(true)}
          onOpenAmbience={() => setShowAmbienceModal(true)}
          onOpenVoice={() => setShowVoiceModal(true)}
          onOpenMood={() => setShowMoodModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          isOnline={isOnline}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          onSyncNow={() => syncService.syncNow()}
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

        {/* Top 3 Priorities (Eisenhower Focus) */}
        {habits.length > 0 && (
          <Top3Priorities
            habits={habits}
            priorityIds={top3PriorityIds}
            onTogglePriority={handleToggleTop3Priority}
            onToggleComplete={(hId) => toggleHabit(hId, todayInfo.day)}
          />
        )}

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

        {/* RPG Daily Quests & Weekly Boss Raid Panel */}
        <DailyQuestsPanel
          dayTasks={habits.map((h) => ({
            id: h._id,
            completed: Boolean(h.completions?.[todayInfo.dateKey]),
            priority: (h.priority || 'medium').toLowerCase(),
          }))}
          dayRecord={currentDayRecord}
          claimedQuestIds={claimedQuestIds}
          onClaimQuestReward={handleClaimQuestReward}
        />

        {/* Habit Stacks & Routines Panel */}
        <RoutinesPanel
          onStartFlow={(routine) => {
            setActiveRoutineForFlow(routine);
            setShowGuidedFlowModal(true);
          }}
        />

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
                userXP={completedCount * 25}
                userLevel={Math.floor((completedCount * 25) / 250) + 1}
                moodStats={{ great: 10, good: 6, neutral: 3, tough: 1 }}
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
          <StreakPanel
            habits={visibleHabits}
            globalStreak={globalStreak}
            globalBestStreak={globalBestStreak}
            freezeTokensAvailable={freezeTokensAvailable}
            onOpenFreezeModal={() => setShowFreezeModal(true)}
          />
          <HabitPieChart habits={visibleHabits} monthDaysMap={monthDaysMap} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Achievements
            unlockedBadgeRecords={unlockedBadgeRecords}
            onOpenBadgeGallery={() => setShowBadgesModal(true)}
          />
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

      {/* Streak Freeze Shield Modal */}
      <StreakFreezeModal
        isOpen={showFreezeModal}
        onClose={() => {
          setShowFreezeModal(false);
          setFreezePromptDate(null);
        }}
        freezeTokensAvailable={freezeTokensAvailable}
        suggestedDateKey={freezePromptDate}
        onFreezeApplied={(dateKey, remaining) => {
          setFreezeTokensAvailable(remaining);
          calculateStreakWithFreezes(habits, todayInfo.dateKey).then((s) => {
            setGlobalStreak(s.currentStreak);
            setGlobalBestStreak(s.longestStreak);
          });
        }}
      />

      {/* Badges Gallery Modal */}
      <BadgeGalleryModal
        isOpen={showBadgesModal}
        onClose={() => setShowBadgesModal(false)}
        unlockedBadgeRecords={unlockedBadgeRecords}
        totalXP={gamificationState.totalXP}
        level={gamificationState.level}
        title={gamificationState.title}
      />

      {/* Full-Screen Guided Flow Mode Modal */}
      <GuidedFlowModal
        isOpen={showGuidedFlowModal}
        routine={activeRoutineForFlow}
        onClose={() => {
          setShowGuidedFlowModal(false);
          setActiveRoutineForFlow(null);
        }}
        onStepComplete={handleStepCompleteInFlow}
        onRoutineCompleted={handleRoutineCompleted}
      />

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        habits={habits}
        onHabitsReload={() => syncService.syncNow()}
      />

      {/* Phase 3: AI Habit Coach Modal */}
      <AICoachModal
        isOpen={showAICoachModal}
        onClose={() => setShowAICoachModal(false)}
        dayRecords={allDayRecords}
        habits={habits}
        onAcceptHabits={handleAcceptAIHabits}
      />

      {/* Phase 3: Focus Ambience Audio & Pomodoro Mixer */}
      <AmbienceMixerModal
        isOpen={showAmbienceModal}
        onClose={() => setShowAmbienceModal(false)}
        habits={habits}
        onPomodoroSessionComplete={(hId, duration) => {
          handleHabitXpChange(gamificationState.totalXP, 30).then((newState) => {
            setGamificationState(newState);
            setFloatingXp({ amount: 30, label: 'Pomodoro Focused' });
          });
        }}
      />

      {/* Phase 3: Voice Check-in & Speech Assistant Modal */}
      <VoiceCheckinModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        habits={habits}
        xp={gamificationState.totalXP}
        streak={globalStreak}
        onToggleHabit={(habitId) => toggleHabit(habitId, todayInfo.day)}
        onAddTask={(taskName) => {
          addHabit({
            name: taskName,
            title: taskName,
            category: 'General',
            priority: 'Medium',
            frequency: 'Daily',
          });
        }}
        onStartFocusTimer={() => {
          setShowVoiceModal(false);
          setShowAmbienceModal(true);
        }}
      />

      {/* Phase 3: Daily Mood Tracker & Correlation Engine Modal */}
      <MoodTrackerModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        currentDateKey={todayInfo.dateKey}
        currentDayRecord={currentDayRecord}
        allDayRecords={allDayRecords}
        habits={habits}
        onSaveMood={handleSaveMood}
      />

      {/* Phase 3: Evening Review Reflection Modal */}
      <EveningReviewModal
        isOpen={showEveningModal}
        onClose={() => setShowEveningModal(false)}
        currentDateKey={todayInfo.dateKey}
        currentDayRecord={currentDayRecord}
        onSaveReflection={handleSaveReflection}
      />

      {/* Phase 3: Settings & Data Management Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        habits={habits}
        dayRecords={allDayRecords}
        onImportData={(bundle) => {
          if (bundle.habits) {
            setHabits(bundle.habits);
            saveHabitsToDB(bundle.habits);
            syncService.syncNow();
          }
        }}
        onResetAllData={handleResetAllData}
        onSimulateNextDay={() => {
          setDebugDayOffset((prev) => prev + 1);
        }}
        onAddDebugXP={(amount) => {
          handleHabitXpChange(gamificationState.totalXP, amount).then((s) => {
            setGamificationState(s);
            setFloatingXp({ amount, label: 'Debug Bonus' });
          });
        }}
        onGrantDebugBadge={(badgeId) => {
          const badge = { badgeId, unlockedAt: new Date().toISOString() };
          setUnlockedBadgeRecords((prev) => [...prev, badge]);
          sounds.badgeUnlock();
          triggerNeoConfetti();
        }}
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

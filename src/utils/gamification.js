/**
 * Gamification, XP Engine, RPG Progression & Streak Freezes
 */

import { GAMIFICATION_CONFIG, calculateLevelFromXP, getXpNeededForLevel } from '../data/gamificationConfig';
import { BADGES_CONFIG } from '../data/badgesConfig';
import { getMeta, setMeta, getDayRecordFromDB, saveDayRecordToDB, getAllDayRecordsFromDB } from './db';
import { getLocalDateKey } from './rolloverEngine';

/**
 * Get current month key in format YYYY-MM
 */
export function getCurrentMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Get Streak Freeze Token status
 * Resets to 2 on the 1st of each month; max accumulated = 2
 */
export async function getFreezeTokenStatus() {
  const currentMonth = getCurrentMonthKey();
  let freezeState = await getMeta('streak_freezes');

  if (!freezeState || freezeState.month !== currentMonth) {
    // New month: reset available to 2 (unused ones do not stack beyond 2)
    freezeState = {
      month: currentMonth,
      available: GAMIFICATION_CONFIG.STREAK_FREEZE.MONTHLY_ALLOWANCE,
      usedDates: freezeState?.usedDates || [],
    };
    await setMeta('streak_freezes', freezeState);
  }

  return freezeState;
}

/**
 * Use a Streak Freeze token on a missed date
 * Rules:
 * - Must have available tokens (> 0)
 * - Must be within 48h of the target date
 * - Date cannot be in the future
 */
export async function applyStreakFreeze(targetDateKey) {
  const todayKey = getLocalDateKey();
  if (targetDateKey >= todayKey) {
    return { success: false, reason: 'Cannot freeze today or a future date.' };
  }

  // Check 48h limit
  const targetDate = new Date(`${targetDateKey}T00:00:00`);
  const diffHours = (Date.now() - targetDate.getTime()) / (1000 * 60 * 60);
  if (diffHours > GAMIFICATION_CONFIG.ANTI_CHEAT.MAX_FREEZE_AGE_HOURS) {
    return { success: false, reason: 'Freeze expired. Must be applied within 48 hours of the missed day.' };
  }

  const freezeState = await getFreezeTokenStatus();
  if (freezeState.available <= 0) {
    return { success: false, reason: 'No Streak Freeze tokens remaining this month (2 max).' };
  }

  // Check if already frozen
  const existingRecord = (await getDayRecordFromDB(targetDateKey)) || { dateKey: targetDateKey };
  if (existingRecord.isFrozen) {
    return { success: false, reason: 'This day is already protected by a streak freeze.' };
  }

  // Deduct token
  freezeState.available -= 1;
  freezeState.usedDates = [...new Set([...freezeState.usedDates, targetDateKey])];
  await setMeta('streak_freezes', freezeState);

  // Mark day record as frozen
  existingRecord.isFrozen = true;
  existingRecord.frozenAt = new Date().toISOString();
  existingRecord.locked = true;
  await saveDayRecordToDB(existingRecord);

  // Log freeze in history
  const freezeLog = (await getMeta('freeze_history_log')) || [];
  freezeLog.push({
    dateKey: targetDateKey,
    usedAt: new Date().toISOString(),
  });
  await setMeta('freeze_history_log', freezeLog);

  console.log(`[StreakFreeze] Protected day ${targetDateKey}. Tokens left: ${freezeState.available}`);
  return { success: true, remainingTokens: freezeState.available };
}

/**
 * Calculate streak with Streak Freeze immunity
 * A frozen day does not break the streak!
 */
export async function calculateStreakWithFreezes(habits = [], todayDateKey = getLocalDateKey()) {
  const dayRecords = await getAllDayRecordsFromDB();
  const frozenDateMap = new Map();
  dayRecords.forEach((r) => {
    if (r.isFrozen) frozenDateMap.set(r.dateKey, true);
  });

  // Calculate day-by-day active completion (at least 1 habit completed)
  let currentStreak = 0;
  let d = new Date(`${todayDateKey}T00:00:00`);

  // Check today first
  const todayCompleted = habits.some((h) => h.completions && h.completions[todayDateKey]);
  if (todayCompleted) {
    currentStreak++;
  }

  // Traverse backward starting from yesterday
  d.setDate(d.getDate() - 1);
  let streakActive = true;

  while (streakActive) {
    const key = getLocalDateKey(d);
    const hadCompletions = habits.some((h) => h.completions && h.completions[key]);
    const isFrozen = frozenDateMap.has(key);

    if (hadCompletions || isFrozen) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      streakActive = false;
    }
  }

  // Calculate all-time longest streak
  const allCompletedDates = new Set();
  habits.forEach((h) => {
    Object.entries(h.completions || {}).forEach(([k, done]) => {
      if (done) allCompletedDates.add(k);
    });
  });
  frozenDateMap.forEach((_, k) => allCompletedDates.add(k));

  const sortedDates = [...allCompletedDates].sort();
  let longestStreak = 0;
  let running = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      running = 1;
    } else {
      const prev = new Date(`${sortedDates[i - 1]}T00:00:00`);
      const curr = new Date(`${sortedDates[i]}T00:00:00`);
      const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        running++;
      } else {
        running = 1;
      }
    }
    longestStreak = Math.max(longestStreak, running);
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
  };
}

/**
 * Check if yesterday was missed and eligible for a streak freeze suggestion
 */
export async function checkEligibleForFreezePrompt(habits = []) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  const hadCompletion = habits.some((h) => h.completions && h.completions[yesterdayKey]);
  if (hadCompletion) return null; // Yesterday was done, no freeze needed

  const existingRecord = await getDayRecordFromDB(yesterdayKey);
  if (existingRecord?.isFrozen) return null; // Already frozen

  const freezeState = await getFreezeTokenStatus();
  if (freezeState.available <= 0) return null; // No tokens left

  return {
    dateKey: yesterdayKey,
    tokensAvailable: freezeState.available,
  };
}

/**
 * Calculate total XP and anti-cheat capped values
 */
export async function getUserGamificationState(habits = []) {
  const metaXP = (await getMeta('user_total_xp')) || 0;
  const levelInfo = calculateLevelFromXP(metaXP);
  const freezeStatus = await getFreezeTokenStatus();
  const unlockedBadges = (await getMeta('unlocked_badges')) || [];

  return {
    totalXP: metaXP,
    ...levelInfo,
    freezeTokensAvailable: freezeStatus.available,
    unlockedBadges,
  };
}

/**
 * Award or retract XP for a habit toggle with anti-cheat duplicate protection
 */
export async function handleHabitXpChange(habit, dateKey, isNowCompleted) {
  const currentTotalXP = (await getMeta('user_total_xp')) || 0;
  const baseReward = GAMIFICATION_CONFIG.XP_PER_PRIORITY[habit.priority] || 20;

  // Anti-cheat daily log tracking
  const dailyXpLogKey = `xp_log_${dateKey}`;
  const dailyLog = (await getMeta(dailyXpLogKey)) || { totalTaskXP: 0, items: {} };

  let delta = 0;
  const taskKey = `${habit._id}_${dateKey}`;

  if (isNowCompleted) {
    // Only award if not already claimed in this session
    if (!dailyLog.items[taskKey]) {
      // Check daily cap
      if (dailyLog.totalTaskXP + baseReward <= GAMIFICATION_CONFIG.ANTI_CHEAT.MAX_DAILY_TASK_XP) {
        delta = baseReward;
        dailyLog.totalTaskXP += baseReward;
        dailyLog.items[taskKey] = baseReward;
      } else {
        const partial = Math.max(0, GAMIFICATION_CONFIG.ANTI_CHEAT.MAX_DAILY_TASK_XP - dailyLog.totalTaskXP);
        delta = partial;
        dailyLog.totalTaskXP += partial;
        dailyLog.items[taskKey] = partial;
      }
    }
  } else {
    // Unticking: subtract previously awarded XP
    if (dailyLog.items[taskKey]) {
      const previouslyAwarded = dailyLog.items[taskKey];
      delta = -previouslyAwarded;
      dailyLog.totalTaskXP = Math.max(0, dailyLog.totalTaskXP - previouslyAwarded);
      delete dailyLog.items[taskKey];
    }
  }

  await setMeta(dailyXpLogKey, dailyLog);

  const prevLevel = calculateLevelFromXP(currentTotalXP).level;
  const newTotalXP = Math.max(0, currentTotalXP + delta);
  await setMeta('user_total_xp', newTotalXP);
  const newLevelInfo = calculateLevelFromXP(newTotalXP);

  const leveledUp = newLevelInfo.level > prevLevel;

  return {
    delta,
    totalXP: newTotalXP,
    leveledUp,
    newLevel: newLevelInfo.level,
    title: newLevelInfo.title,
  };
}

/**
 * Evaluate all badges and unlock newly achieved ones
 */
export async function evaluateAndUnlockBadges(context) {
  const currentlyUnlocked = (await getMeta('unlocked_badges')) || [];
  const unlockedIds = new Set(currentlyUnlocked.map((b) => b.id));
  const newlyUnlocked = [];

  for (const badge of BADGES_CONFIG) {
    if (!unlockedIds.has(badge.id)) {
      try {
        if (badge.check(context)) {
          const unlockedItem = {
            id: badge.id,
            unlockedAt: new Date().toISOString(),
          };
          currentlyUnlocked.push(unlockedItem);
          newlyUnlocked.push(badge);
        }
      } catch (err) {
        console.warn(`Error evaluating badge ${badge.id}:`, err);
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    await setMeta('unlocked_badges', currentlyUnlocked);
  }

  return {
    allUnlocked: currentlyUnlocked,
    newlyUnlocked,
  };
}

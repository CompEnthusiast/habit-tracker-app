/**
 * useDayRollover — Precise midnight rollover detection hook
 * 
 * Features:
 * - Exact midnight countdown timer scheduling (with safe ms buffer)
 * - visibilitychange + focus event triggers
 * - Clock tampering and backward time jump detection
 * - Multi-day gap detection (processes every missed day in order)
 * - Debug mode for simulating next day testing
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getLocalDateKey, verifyDeviceClock, processDayRollover, isDateLocked } from '../utils/rolloverEngine';
import { getMeta, setMeta } from '../utils/db';

/** Get today's info in local timezone */
export function getTodayInfo() {
  const n = new Date();
  return {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    dateKey: getLocalDateKey(n),
    timestamp: n.getTime(),
  };
}

/** Generate YYYY-MM-DD key */
export function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Calculate ms until next midnight in local timezone */
function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.max(1000, midnight.getTime() - now.getTime());
}

/**
 * @param {Function} onDayChange - Callback when day changes. Receives { previous, current, missedDays, daysBetween }
 * @param {number} debugDayOffset - For testing: offset days forward (0 = today)
 * @param {Array} habits - Current habits list to feed to rollover processing
 */
export function useDayRollover(onDayChange, debugDayOffset = 0, habits = []) {
  const [todayInfo, setTodayInfo] = useState(() => {
    if (debugDayOffset > 0) {
      const d = new Date();
      d.setDate(d.getDate() + debugDayOffset);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        dateKey: getLocalDateKey(d),
        timestamp: d.getTime(),
      };
    }
    return getTodayInfo();
  });

  const [clockWarning, setClockWarning] = useState(null);
  const lastKnownDateRef = useRef(todayInfo.dateKey);
  const midnightTimerRef = useRef(null);
  const onDayChangeRef = useRef(onDayChange);
  const habitsRef = useRef(habits);

  onDayChangeRef.current = onDayChange;
  habitsRef.current = habits;

  /** Check if the day has rolled over */
  const checkRollover = useCallback(async () => {
    // 1. Clock tampering and timezone verification
    const clockStatus = await verifyDeviceClock();
    if (clockStatus.clockTampered) {
      setClockWarning(clockStatus.reason);
      return;
    } else {
      setClockWarning(null);
    }

    // 2. Determine current day in local timezone
    let current;
    if (debugDayOffset > 0) {
      const d = new Date();
      d.setDate(d.getDate() + debugDayOffset);
      current = {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        dateKey: getLocalDateKey(d),
        timestamp: d.getTime(),
      };
    } else {
      current = getTodayInfo();
    }

    const previousKey = lastKnownDateRef.current;

    // Check against stored last known date key in DB if not set
    const storedLastKey = await getMeta('lastKnownDateKey');
    const effectivePrevKey = storedLastKey || previousKey;

    if (current.dateKey !== effectivePrevKey) {
      console.log(`[DayRollover] Midnight transition triggered: ${effectivePrevKey} → ${current.dateKey}`);

      // Process rollover across every missed day in order
      const { processedDays, habits: updatedHabits } = await processDayRollover(
        effectivePrevKey,
        current.dateKey,
        habitsRef.current
      );

      lastKnownDateRef.current = current.dateKey;
      await setMeta('lastKnownDateKey', current.dateKey);
      setTodayInfo(current);

      // Fire callback with updated rollover info
      if (onDayChangeRef.current) {
        onDayChangeRef.current({
          previous: effectivePrevKey,
          current: current.dateKey,
          missedDays: processedDays,
          daysBetween: processedDays.length + 1,
          updatedHabits,
        });
      }

      // Schedule next midnight timer
      scheduleMidnightTimer();
    }
  }, [debugDayOffset]);

  /** Schedule a timer for the exact next midnight */
  const scheduleMidnightTimer = useCallback(() => {
    if (midnightTimerRef.current) {
      clearTimeout(midnightTimerRef.current);
    }

    const ms = msUntilMidnight();
    console.log(`[DayRollover] Next midnight timer scheduled in ${Math.round(ms / 1000)}s`);

    midnightTimerRef.current = setTimeout(() => {
      checkRollover();
    }, ms + 800); // +800ms buffer to guarantee date has ticked past 00:00:00
  }, [checkRollover]);

  /** Debug: simulate advancing to next day */
  const simulateNextDay = useCallback(async () => {
    const prev = lastKnownDateRef.current;
    const d = new Date(`${prev}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const nextKey = getLocalDateKey(d);

    const next = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      dateKey: nextKey,
      timestamp: d.getTime(),
    };

    console.log(`[DayRollover][DEBUG] Simulating day change: ${prev} → ${next.dateKey}`);

    const { processedDays, habits: updatedHabits } = await processDayRollover(
      prev,
      next.dateKey,
      habitsRef.current
    );

    lastKnownDateRef.current = next.dateKey;
    await setMeta('lastKnownDateKey', next.dateKey);
    setTodayInfo(next);

    if (onDayChangeRef.current) {
      onDayChangeRef.current({
        previous: prev,
        current: next.dateKey,
        missedDays: processedDays,
        daysBetween: 1,
        updatedHabits,
      });
    }
  }, []);

  useEffect(() => {
    // Initial verification and timer setup
    checkRollover();
    scheduleMidnightTimer();

    // Check on visibility change (tab becomes visible)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkRollover();
      }
    };

    // Check on window focus
    const handleFocus = () => checkRollover();

    // Periodic heartbeat every 30 seconds
    const interval = setInterval(checkRollover, 30000);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [scheduleMidnightTimer, checkRollover]);

  return {
    todayInfo,
    checkRollover,
    simulateNextDay,
    clockWarning,
    isDateLocked: (dKey) => isDateLocked(dKey, todayInfo.dateKey),
  };
}

export default useDayRollover;

/**
 * useDayRollover — Precise midnight rollover detection hook
 * 
 * Handles:
 * - Exact midnight timer scheduling
 * - visibilitychange + focus events
 * - Multi-day gap detection (device slept for days)
 * - Timezone/clock change detection
 * - Debug mode for simulating next day
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/** Get today's info in local timezone */
export function getTodayInfo() {
  const n = new Date();
  return {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    dateKey: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`,
    timestamp: n.getTime(),
  };
}

/** Generate YYYY-MM-DD key */
export function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Get all date keys between two dates (inclusive) */
export function getDateRange(startKey, endKey) {
  const dates = [];
  const current = new Date(startKey + 'T00:00:00');
  const end = new Date(endKey + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Calculate ms until next midnight in local timezone */
function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * @param {Function} onDayChange - Callback when day changes. Receives { previous, current, missedDays }
 * @param {number} debugDayOffset - For testing: offset days forward (0 = today)
 */
export function useDayRollover(onDayChange, debugDayOffset = 0) {
  const [todayInfo, setTodayInfo] = useState(() => {
    if (debugDayOffset > 0) {
      const d = new Date();
      d.setDate(d.getDate() + debugDayOffset);
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        timestamp: d.getTime(),
      };
    }
    return getTodayInfo();
  });

  const lastKnownDateRef = useRef(todayInfo.dateKey);
  const midnightTimerRef = useRef(null);
  const onDayChangeRef = useRef(onDayChange);
  onDayChangeRef.current = onDayChange;

  /** Check if the day has rolled over */
  const checkRollover = useCallback(() => {
    const current = debugDayOffset > 0 ? todayInfo : getTodayInfo();
    const previousKey = lastKnownDateRef.current;

    if (current.dateKey !== previousKey) {
      // Calculate missed days
      const missedDays = [];
      const prev = new Date(previousKey + 'T00:00:00');
      const curr = new Date(current.dateKey + 'T00:00:00');
      const daysBetween = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (daysBetween > 1) {
        for (let i = 1; i < daysBetween; i++) {
          const d = new Date(prev);
          d.setDate(d.getDate() + i);
          missedDays.push(d.toISOString().slice(0, 10));
        }
      }

      console.log(`[DayRollover] Day changed: ${previousKey} → ${current.dateKey} (${daysBetween} day(s), ${missedDays.length} missed)`);

      lastKnownDateRef.current = current.dateKey;
      setTodayInfo(current);

      // Fire callback
      if (onDayChangeRef.current) {
        onDayChangeRef.current({
          previous: previousKey,
          current: current.dateKey,
          missedDays,
          daysBetween,
        });
      }

      // Reschedule midnight timer
      scheduleMidnightTimer();
    }
  }, [todayInfo, debugDayOffset]);

  /** Schedule a timer for the exact next midnight */
  const scheduleMidnightTimer = useCallback(() => {
    if (midnightTimerRef.current) {
      clearTimeout(midnightTimerRef.current);
    }

    const ms = msUntilMidnight();
    console.log(`[DayRollover] Next midnight timer scheduled in ${Math.round(ms / 1000)}s`);

    midnightTimerRef.current = setTimeout(() => {
      checkRollover();
    }, ms + 500); // +500ms buffer to ensure we're past midnight
  }, [checkRollover]);

  /** Debug: simulate advancing to next day */
  const simulateNextDay = useCallback(() => {
    const prev = lastKnownDateRef.current;
    const d = new Date(prev + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const next = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      dateKey: d.toISOString().slice(0, 10),
      timestamp: d.getTime(),
    };

    console.log(`[DayRollover][DEBUG] Simulating day change: ${prev} → ${next.dateKey}`);
    lastKnownDateRef.current = next.dateKey;
    setTodayInfo(next);

    if (onDayChangeRef.current) {
      onDayChangeRef.current({
        previous: prev,
        current: next.dateKey,
        missedDays: [],
        daysBetween: 1,
      });
    }
  }, []);

  useEffect(() => {
    // Schedule midnight timer
    scheduleMidnightTimer();

    // Check on visibility change (tab becomes visible)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkRollover();
      }
    };

    // Check on window focus
    const handleFocus = () => checkRollover();

    // Periodic fallback check every 30s
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

  return { todayInfo, simulateNextDay };
}

export default useDayRollover;

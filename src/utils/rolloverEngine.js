/**
 * Midnight Rollover & Anti-Tampering Engine
 * 
 * Rules:
 * - Data stored per date (YYYY-MM-DD in user's local timezone).
 * - At midnight, shows only the new day's tasks.
 * - Daily habits reset to unchecked for the new day.
 * - Unfinished tasks from yesterday are removed from today's list unless marked "carry over".
 * - Past days' ticks are strictly LOCKED (read-only, can never be edited or unticked).
 * - When app is opened after several days, processes EVERY missed day in order.
 * - Device clock tampering & timezone shift detection.
 */

import { getDayRecordFromDB, saveDayRecordToDB, getMeta, setMeta } from './db';

const BACKWARD_TOLERANCE_MS = 60 * 1000; // 60 seconds backward jump tolerance
const FORWARD_JUMP_SUSPICION_DAYS = 365; // Over a year ahead jump suspicion

/**
 * Returns formatted YYYY-MM-DD for a given date in local timezone
 */
export function getLocalDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get all date keys between startKey and endKey (inclusive)
 */
export function getDatesBetween(startKey, endKey) {
  const dates = [];
  const current = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);

  while (current <= end) {
    dates.push(getLocalDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Check if a date is in the past and therefore strictly locked
 */
export function isDateLocked(targetDateKey, todayDateKey = getLocalDateKey()) {
  return targetDateKey < todayDateKey;
}

/**
 * Detect clock tampering or device time backward jumps
 */
export async function verifyDeviceClock() {
  const now = Date.now();
  const lastSeen = await getMeta('lastSeenTimestamp');
  const lastTimezone = await getMeta('lastTimezone');
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let clockTampered = false;
  let reason = '';

  if (lastSeen && typeof lastSeen === 'number') {
    // If current time is earlier than last recorded timestamp (minus 60s tolerance)
    if (now < lastSeen - BACKWARD_TOLERANCE_MS) {
      clockTampered = true;
      reason = `Backward clock shift detected! Current time is ${Math.round((lastSeen - now) / 1000)}s behind previous session.`;
      console.warn(`[AntiTampering] ${reason}`);
    }
  }

  const timezoneChanged = lastTimezone && lastTimezone !== currentTimezone;
  if (timezoneChanged) {
    console.log(`[Timezone] Detected timezone change: ${lastTimezone} -> ${currentTimezone}`);
  }

  // Update last seen heartbeat
  if (!clockTampered) {
    await setMeta('lastSeenTimestamp', now);
  }
  await setMeta('lastTimezone', currentTimezone);

  return {
    valid: !clockTampered,
    clockTampered,
    timezoneChanged,
    currentTimezone,
    reason,
  };
}

/**
 * Process rollover between two dates, iterating through every missed day in order
 * @param {string} previousKey - Previous active date (YYYY-MM-DD)
 * @param {string} currentKey - Current new date (YYYY-MM-DD)
 * @param {Array} habits - Current list of habits/tasks
 * @returns {Object} result with processedDays, updatedHabits, and dayRecords
 */
export async function processDayRollover(previousKey, currentKey, habits = []) {
  if (previousKey >= currentKey) {
    return { processedDays: [], habits };
  }

  const allDays = getDatesBetween(previousKey, currentKey);
  // Days to lock: all days prior to currentKey
  const daysToLock = allDays.slice(0, -1);

  console.log(`[RolloverEngine] Processing rollover from ${previousKey} to ${currentKey}. Locking ${daysToLock.length} day(s):`, daysToLock);

  // 1. Process each missed day in chronological sequence
  for (const dayKey of daysToLock) {
    // Check if a day record already exists
    const existingRecord = await getDayRecordFromDB(dayKey);

    const completedHabitIds = habits
      .filter((h) => h.completions && h.completions[dayKey])
      .map((h) => h._id);

    const missedHabitIds = habits
      .filter((h) => !h.completions || !h.completions[dayKey])
      .map((h) => h._id);

    const updatedRecord = {
      dateKey: dayKey,
      completedHabitIds,
      missedHabitIds,
      locked: true, // Past day is permanently locked
      lockedAt: new Date().toISOString(),
      notes: existingRecord?.notes || '',
      mood: existingRecord?.mood || null,
      updatedAt: new Date().toISOString(),
    };

    await saveDayRecordToDB(updatedRecord);
  }

  // 2. Carry over logic for habits/tasks onto the new day
  // Daily habits: reset to unchecked (which is default since completions[currentKey] is undefined)
  // One-off tasks or tasks with carryOver:
  // If a task is unfinished on yesterday and carryOver === false, we flag it so it won't appear today
  const updatedHabits = habits.map((h) => {
    // If not recurring daily and marked non-carryOver, and unfinished yesterday
    const isCompletedYesterday = h.completions && h.completions[previousKey];
    const shouldDrop = h.recurring === 'none' && h.carryOver === false && !isCompletedYesterday;

    if (shouldDrop) {
      return {
        ...h,
        droppedFromToday: true,
      };
    }
    return h;
  });

  // 3. Ensure new current day has an initialized day record
  const currentRecord = await getDayRecordFromDB(currentKey);
  if (!currentRecord) {
    await saveDayRecordToDB({
      dateKey: currentKey,
      completedHabitIds: [],
      missedHabitIds: [],
      locked: false,
      notes: '',
      mood: null,
      updatedAt: new Date().toISOString(),
    });
  }

  // Update last seen timestamp
  await setMeta('lastKnownDateKey', currentKey);
  await setMeta('lastSeenTimestamp', Date.now());

  return {
    processedDays: daysToLock,
    habits: updatedHabits,
  };
}

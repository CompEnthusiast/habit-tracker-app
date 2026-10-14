// Offline resilience & optimistic sync engine with debounced saving, last-write-wins, and status callbacks

const CACHE_KEY = 'habit_tracker_cached_habits';
const QUEUE_KEY = 'habit_tracker_pending_queue';
const LAST_SYNC_KEY = 'habit_tracker_last_sync';

export function getCachedHabits() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedHabits(habits) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(habits));
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch (e) {
    console.warn('Failed to cache habits:', e);
  }
}

export function getLastSyncTime() {
  try {
    const ts = localStorage.getItem(LAST_SYNC_KEY);
    return ts ? Number(ts) : null;
  } catch {
    return null;
  }
}

export function getPendingQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueAction(action) {
  try {
    const queue = getPendingQueue();
    // Prevent duplicate consecutive toggles for same habit and key in offline queue
    const existingIdx = queue.findIndex(
      (item) => item.type === action.type && item.habitId === action.habitId && item.key === action.key
    );
    if (existingIdx !== -1) {
      // Toggle cancels itself out if queued offline multiple times
      queue.splice(existingIdx, 1);
    } else {
      queue.push({
        ...action,
        timestamp: Date.now(),
      });
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to enqueue action:', e);
  }
}

export function clearPendingQueue() {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {}
}

export async function flushPendingQueue(toggleHabitApi) {
  const queue = getPendingQueue();
  if (!queue || queue.length === 0) return { flushed: 0, errors: 0, remainingCount: 0 };

  let flushed = 0;
  let errors = 0;
  const remaining = [];

  for (const item of queue) {
    if (item.type === 'toggle') {
      try {
        await toggleHabitApi(item.habitId, item.key);
        flushed++;
      } catch (err) {
        console.error('Failed to flush item:', item, err);
        errors++;
        remaining.push(item);
      }
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { flushed, errors, remainingCount: remaining.length };
}

/**
 * Last-write-wins merge resolution for habit data
 * Compares client and server timestamps or completion keys
 */
export function resolveHabitConflicts(clientHabit, serverHabit) {
  if (!serverHabit) return clientHabit;
  if (!clientHabit) return serverHabit;

  const clientTime = new Date(clientHabit.updatedAt || 0).getTime();
  const serverTime = new Date(serverHabit.updatedAt || 0).getTime();

  // If client is newer, keep client's completions unioned with server
  const mergedCompletions = {
    ...(serverHabit.completions || {}),
    ...(clientHabit.completions || {}),
  };

  const base = clientTime >= serverTime ? clientHabit : serverHabit;
  return {
    ...base,
    completions: mergedCompletions,
  };
}

/**
 * Debounce helper for automatic state saves (< 500ms)
 */
export function createDebouncedSaver(saveFn, delay = 400) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveFn(...args);
      timer = null;
    }, delay);
  };
}

/**
 * IndexedDB Data Layer for Habit Tracker
 * Offline-first, fast, robust key-value and object store
 * 
 * Stores:
 * - 'habits': Full habit definitions and completions
 * - 'day_records': Per-date snapshots (YYYY-MM-DD), tasks, carry-over, notes, mood, xp
 * - 'sync_queue': Offline pending mutations
 * - 'metadata': Client state (lastSeenTimestamp, timezone, serverOffset)
 */

const DB_NAME = 'habit_tracker_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Habits store (keyed by _id)
      if (!db.objectStoreNames.contains('habits')) {
        const habitStore = db.createObjectStore('habits', { keyPath: '_id' });
        habitStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        habitStore.createIndex('category', 'category', { unique: false });
        habitStore.createIndex('deleted', 'deleted', { unique: false });
      }

      // 2. Day records store (keyed by dateKey: YYYY-MM-DD)
      if (!db.objectStoreNames.contains('day_records')) {
        const dayStore = db.createObjectStore('day_records', { keyPath: 'dateKey' });
        dayStore.createIndex('locked', 'locked', { unique: false });
        dayStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 3. Sync queue store (auto-increment id)
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 4. Metadata store (simple key-value: 'lastSeenTimestamp', 'timezone', etc.)
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open failed:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

// ─── HABITS CRUD ─────────────────────────────────────────────────────────────

export async function getAllHabitsFromDB() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('habits', 'readonly');
      const store = tx.objectStore('habits');
      const request = store.getAll();
      request.onsuccess = () => {
        // Filter out soft-deleted habits by default
        const habits = (request.result || []).filter((h) => !h.deleted);
        resolve(habits);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('getAllHabitsFromDB error:', err);
    return [];
  }
}

export async function saveHabitsToDB(habits) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('habits', 'readwrite');
      const store = tx.objectStore('habits');
      habits.forEach((habit) => {
        const doc = {
          ...habit,
          updatedAt: habit.updatedAt || new Date().toISOString(),
        };
        store.put(doc);
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveHabitsToDB error:', err);
    return false;
  }
}

export async function saveSingleHabitToDB(habit) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('habits', 'readwrite');
      const store = tx.objectStore('habits');
      const doc = {
        ...habit,
        updatedAt: habit.updatedAt || new Date().toISOString(),
      };
      const req = store.put(doc);
      req.onsuccess = () => resolve(doc);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveSingleHabitToDB error:', err);
    return null;
  }
}

export async function softDeleteHabitInDB(habitId) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('habits', 'readwrite');
      const store = tx.objectStore('habits');
      const getReq = store.get(habitId);
      getReq.onsuccess = () => {
        const habit = getReq.result;
        if (habit) {
          habit.deleted = true;
          habit.deletedAt = new Date().toISOString();
          habit.updatedAt = new Date().toISOString();
          store.put(habit);
        }
        resolve(true);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('softDeleteHabitInDB error:', err);
    return false;
  }
}

// ─── PER-DAY SNAPSHOTS (DAY RECORDS) ─────────────────────────────────────────

export async function getDayRecordFromDB(dateKey) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('day_records', 'readonly');
      const store = tx.objectStore('day_records');
      const req = store.get(dateKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getDayRecordFromDB error:', err);
    return null;
  }
}

export async function saveDayRecordToDB(dayRecord) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('day_records', 'readwrite');
      const store = tx.objectStore('day_records');
      const record = {
        ...dayRecord,
        updatedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveDayRecordToDB error:', err);
    return null;
  }
}

export async function getAllDayRecordsFromDB() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('day_records', 'readonly');
      const store = tx.objectStore('day_records');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getAllDayRecordsFromDB error:', err);
    return [];
  }
}

// ─── SYNC QUEUE ──────────────────────────────────────────────────────────────

export async function enqueueSyncAction(action) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const item = {
        ...action,
        timestamp: Date.now(),
        retryCount: 0,
      };
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('enqueueSyncAction error:', err);
    return null;
  }
}

export async function getSyncQueue() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getSyncQueue error:', err);
    return [];
  }
}

export async function removeSyncQueueItem(id) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('removeSyncQueueItem error:', err);
    return false;
  }
}

export async function clearSyncQueue() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('clearSyncQueue error:', err);
    return false;
  }
}

// ─── METADATA (Tampering detection, Last seen, Timezone) ───────────────────────

export async function getMeta(key) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getMeta error:', err);
    return null;
  }
}

export async function setMeta(key, value) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      const req = store.put({ key, value, updatedAt: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('setMeta error:', err);
    return false;
  }
}

// ─── MIGRATION FROM LEGACY LOCALSTORAGE ───────────────────────────────────────

export async function migrateLegacyLocalStorage() {
  try {
    const legacyKey = 'habit_tracker_cached_habits';
    const raw = localStorage.getItem(legacyKey);
    if (raw) {
      const existing = await getAllHabitsFromDB();
      if (existing.length === 0) {
        const habits = JSON.parse(raw);
        if (Array.isArray(habits) && habits.length > 0) {
          await saveHabitsToDB(habits);
          console.log('[IndexedDB] Successfully migrated legacy localStorage habits to IndexedDB');
        }
      }
    }
  } catch (e) {
    console.warn('[IndexedDB] Legacy migration skipped/failed:', e);
  }
}

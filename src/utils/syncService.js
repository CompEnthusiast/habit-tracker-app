/**
 * Reliable Auto Sync Service
 * 
 * Offline-first architecture:
 * - Uses IndexedDB as the local database and source of truth.
 * - Saves immediately on every change with debouncing (< 400ms).
 * - Automatic sync on: app load, tab focus (visibilitychange), reconnect (online event),
 *   periodic interval (every 30-60s), and Background Sync API when available.
 * - Conflict resolution: per-record updatedAt, Last-Write-Wins (LWW), tombstones for deletions.
 * - Persistent offline queue in IndexedDB replayed sequentially upon reconnect.
 * - Sync status state: 'synced' | 'syncing' | 'offline' | 'error'.
 */

import {
  getAllHabitsFromDB,
  saveHabitsToDB,
  saveSingleHabitToDB,
  softDeleteHabitInDB,
  enqueueSyncAction,
  getSyncQueue,
  removeSyncQueueItem,
  clearSyncQueue,
  getMeta,
  setMeta,
  migrateLegacyLocalStorage,
} from './db';
import { fetchHabits, createHabit, updateHabit, deleteHabitApi, toggleHabitDay } from '../api/habits';

const DEBOUNCE_MS = 350;
const PERIODIC_SYNC_INTERVAL_MS = 45 * 1000; // 45 seconds

class SyncService {
  constructor() {
    this.status = 'synced'; // 'synced' | 'syncing' | 'offline' | 'error'
    this.lastSyncTime = null;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.statusListeners = new Set();
    this.saveTimeout = null;
    this.syncInterval = null;
    this.pendingQueueCount = 0;
    this.isFlushing = false;
  }

  /** Initialize sync service and listeners */
  async init(onHabitsUpdated) {
    this.onHabitsUpdated = onHabitsUpdated;
    await migrateLegacyLocalStorage();

    const storedLastSync = await getMeta('lastSyncTime');
    this.lastSyncTime = storedLastSync || null;

    const queue = await getSyncQueue();
    this.pendingQueueCount = queue.length;

    // Browser online / offline listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.setStatus('syncing');
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.setStatus('offline');
    });

    // Window focus & tab visibility listener
    window.addEventListener('focus', () => {
      if (this.isOnline) this.syncNow();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.syncNow();
      }
    });

    // Periodic sync timer
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.status !== 'syncing') {
        this.syncNow();
      }
    }, PERIODIC_SYNC_INTERVAL_MS);

    // Register Background Sync if supported
    this.registerBackgroundSync();

    // Initial sync
    if (this.isOnline) {
      this.syncNow();
    } else {
      this.setStatus('offline');
    }
  }

  /** Register background sync via Service Worker */
  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-habits');
        console.log('[SyncService] Background Sync registered successfully');
      } catch (err) {
        console.log('[SyncService] Background Sync not supported or rejected:', err.message);
      }
    }
  }

  /** Subscribe to status updates */
  subscribe(callback) {
    this.statusListeners.add(callback);
    callback({
      status: this.status,
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      pendingCount: this.pendingQueueCount,
    });
    return () => this.statusListeners.delete(callback);
  }

  /** Set status and broadcast to subscribers */
  setStatus(newStatus) {
    this.status = newStatus;
    this.notifySubscribers();
  }

  notifySubscribers() {
    this.statusListeners.forEach((cb) =>
      cb({
        status: this.status,
        isOnline: this.isOnline,
        lastSyncTime: this.lastSyncTime,
        pendingCount: this.pendingQueueCount,
      })
    );
  }

  /**
   * Save habits locally immediately with debounce (< 400ms)
   * And trigger background sync if online
   */
  debouncedSave(habits) {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    return new Promise((resolve) => {
      this.saveTimeout = setTimeout(async () => {
        await saveHabitsToDB(habits);
        this.saveTimeout = null;
        resolve(true);

        if (this.isOnline && this.status !== 'syncing') {
          this.syncNow();
        }
      }, DEBOUNCE_MS);
    });
  }

  /**
   * Queue an action to the offline queue and attempt immediate flush if online
   */
  async queueAction(type, payload) {
    await enqueueSyncAction({ type, payload });
    const queue = await getSyncQueue();
    this.pendingQueueCount = queue.length;
    this.notifySubscribers();

    if (this.isOnline) {
      this.flushQueue();
    }
  }

  /**
   * Conflict resolution: Last-Write-Wins (LWW) with tombstone deletion support
   */
  resolveHabitConflicts(localHabits = [], remoteHabits = []) {
    const remoteMap = new Map(remoteHabits.map((h) => [h._id, h]));
    const localMap = new Map(localHabits.map((h) => [h._id, h]));
    const merged = [];

    // Union of all IDs
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

    for (const id of allIds) {
      const local = localMap.get(id);
      const remote = remoteMap.get(id);

      if (!remote) {
        // Only local exists: keep unless soft-deleted
        if (!local.deleted) merged.push(local);
        continue;
      }

      if (!local) {
        // Only remote exists: keep unless soft-deleted
        if (!remote.deleted) merged.push(remote);
        continue;
      }

      // Both exist: check tombstones
      if (local.deleted || remote.deleted) {
        const localDelTime = new Date(local.deletedAt || local.updatedAt || 0).getTime();
        const remoteDelTime = new Date(remote.deletedAt || remote.updatedAt || 0).getTime();
        // If deletion is newer than the other's update, omit it
        if (local.deleted && localDelTime >= new Date(remote.updatedAt || 0).getTime()) {
          continue;
        }
        if (remote.deleted && remoteDelTime >= new Date(local.updatedAt || 0).getTime()) {
          continue;
        }
      }

      // Compare updatedAt timestamps for Last-Write-Wins
      const localTime = new Date(local.updatedAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || 0).getTime();

      // Merge completions: union all completed dates
      const mergedCompletions = {
        ...(remote.completions || {}),
        ...(local.completions || {}),
      };

      const winner = localTime >= remoteTime ? local : remote;
      merged.push({
        ...winner,
        completions: mergedCompletions,
        updatedAt: new Date(Math.max(localTime, remoteTime)).toISOString(),
      });
    }

    return merged;
  }

  /**
   * Flush all pending offline mutations
   */
  async flushQueue() {
    if (this.isFlushing || !this.isOnline) return;
    this.isFlushing = true;

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        this.pendingQueueCount = 0;
        this.notifySubscribers();
        return;
      }

      for (const item of queue) {
        try {
          switch (item.type) {
            case 'toggle': {
              const { habitId, key } = item.payload;
              await toggleHabitDay(habitId, key);
              break;
            }
            case 'create': {
              await createHabit(item.payload);
              break;
            }
            case 'update': {
              const { habitId, data } = item.payload;
              await updateHabit(habitId, data);
              break;
            }
            case 'delete': {
              const { habitId } = item.payload;
              await deleteHabitApi(habitId);
              break;
            }
            default:
              console.warn('[SyncService] Unknown action type:', item.type);
          }
          // Remove processed item
          await removeSyncQueueItem(item.id);
        } catch (itemErr) {
          console.error('[SyncService] Failed to flush queue item:', item, itemErr);
          // If past date error or fatal validation, drop item to avoid blocking queue
          if (itemErr.message?.includes('locked') || itemErr.status === 400) {
            await removeSyncQueueItem(item.id);
          }
        }
      }

      const remaining = await getSyncQueue();
      this.pendingQueueCount = remaining.length;
      this.notifySubscribers();
    } catch (err) {
      console.error('[SyncService] Flush queue error:', err);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Full Sync: Flush queue + fetch remote + resolve LWW conflicts + update IndexedDB
   */
  async syncNow() {
    if (!this.isOnline) {
      this.setStatus('offline');
      return;
    }

    try {
      this.setStatus('syncing');

      // 1. Flush offline queue first
      await this.flushQueue();

      // 2. Fetch remote habits
      const remoteHabits = await fetchHabits();

      // 3. Read current local habits from IndexedDB
      const localHabits = await getAllHabitsFromDB();

      // 4. Resolve conflicts via Last-Write-Wins and tombstones
      const resolved = this.resolveHabitConflicts(localHabits, remoteHabits);

      // 5. Store resolved dataset in IndexedDB
      await saveHabitsToDB(resolved);

      this.lastSyncTime = Date.now();
      await setMeta('lastSyncTime', this.lastSyncTime);

      const queue = await getSyncQueue();
      this.pendingQueueCount = queue.length;

      this.setStatus('synced');

      // 6. Notify UI
      if (this.onHabitsUpdated) {
        this.onHabitsUpdated(resolved);
      }
    } catch (err) {
      console.warn('[SyncService] Sync failed (falling back to offline local state):', err.message);
      this.setStatus(this.isOnline ? 'error' : 'offline');
    }
  }

  destroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.statusListeners.clear();
  }
}

export const syncService = new SyncService();
export default syncService;

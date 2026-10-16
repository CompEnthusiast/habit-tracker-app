/**
 * Routines & Habit Stacking Engine
 * Handles sequence binding, step progress, Atomic Habits cues, and chain-breaker analytics.
 */

import { INITIAL_ROUTINES } from '../data/initialRoutines';
import { getMeta, setMeta } from './db';

const ROUTINES_STORAGE_KEY = 'user_routines';

/**
 * Get all routines from IndexedDB or seed defaults
 */
export async function getRoutines() {
  const saved = await getMeta(ROUTINES_STORAGE_KEY);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  // Initialize with defaults
  await setMeta(ROUTINES_STORAGE_KEY, INITIAL_ROUTINES);
  return INITIAL_ROUTINES;
}

/**
 * Save routines list to IndexedDB
 */
export async function saveRoutines(routines) {
  await setMeta(ROUTINES_STORAGE_KEY, routines);
  return routines;
}

/**
 * Add a new custom routine
 */
export async function addCustomRoutine(routineData) {
  const routines = await getRoutines();
  const newRoutine = {
    ...routineData,
    id: `routine_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'custom',
    completionsCount: 0,
    startedCount: 0,
    stepFailures: {},
    steps: routineData.steps || [],
  };
  const updated = [...routines, newRoutine];
  await saveRoutines(updated);
  return newRoutine;
}

/**
 * Update an existing routine
 */
export async function updateRoutine(routineId, updates) {
  const routines = await getRoutines();
  const next = routines.map((r) => (r.id === routineId ? { ...r, ...updates } : r));
  await saveRoutines(next);
  return next.find((r) => r.id === routineId);
}

/**
 * Delete a custom routine
 */
export async function deleteRoutine(routineId) {
  const routines = await getRoutines();
  const next = routines.filter((r) => r.id !== routineId);
  await saveRoutines(next);
  return next;
}

/**
 * Record a started routine session
 */
export async function recordRoutineStarted(routineId) {
  const routines = await getRoutines();
  const next = routines.map((r) =>
    r.id === routineId ? { ...r, startedCount: (r.startedCount || 0) + 1 } : r
  );
  await saveRoutines(next);
}

/**
 * Record step skipped or broken in a routine
 */
export async function recordStepFailure(routineId, stepId) {
  const routines = await getRoutines();
  const next = routines.map((r) => {
    if (r.id === routineId) {
      const failures = { ...(r.stepFailures || {}) };
      failures[stepId] = (failures[stepId] || 0) + 1;
      return { ...r, stepFailures: failures };
    }
    return r;
  });
  await saveRoutines(next);
}

/**
 * Record a completed routine run
 */
export async function recordRoutineCompleted(routineId) {
  const routines = await getRoutines();
  const next = routines.map((r) =>
    r.id === routineId ? { ...r, completionsCount: (r.completionsCount || 0) + 1 } : r
  );
  await saveRoutines(next);
}

/**
 * Compute routine analytics:
 * - completionRate: % of started routines that finished fully
 * - chainBreakerStep: the step most frequently skipped or broken
 */
export function getRoutineAnalytics(routine) {
  const started = routine.startedCount || 0;
  const completed = routine.completionsCount || 0;
  const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;

  let maxFailures = 0;
  let chainBreakerStepId = null;

  const failures = routine.stepFailures || {};
  Object.entries(failures).forEach(([stepId, count]) => {
    if (count > maxFailures) {
      maxFailures = count;
      chainBreakerStepId = stepId;
    }
  });

  const chainBreakerStep = routine.steps.find((s) => s.id === chainBreakerStepId) || null;

  return {
    started,
    completed,
    completionRate,
    maxFailures,
    chainBreakerStep,
  };
}

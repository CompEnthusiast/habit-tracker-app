/**
 * Standalone Automated Unit Test Suite
 * Covers:
 * 1. Midnight rollover & multi-day gap handling
 * 2. XP math, RPG level curve, titles & anti-cheat caps
 * 3. Streak calculation & streak freeze token mechanics
 * 4. Sync conflict resolution (Last-Write-Wins & Tombstone deletions)
 *
 * Can be run directly via: node src/tests/runTests.js
 */

import assert from 'node:assert';

console.log('====================================================');
console.log('⚡ STARTING HABIT RPG TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

// ======================================================================
// 1. MIDNIGHT ROLLOVER & MULTI-DAY GAPS
// ======================================================================
console.log('--- 1. Testing Midnight Rollover & Multi-Day Gaps ---');

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function processMultiDayGaps(lastDateKey, currentDateKey, habits) {
  const [ly, lm, ld] = lastDateKey.split('-').map(Number);
  const [cy, cm, cd] = currentDateKey.split('-').map(Number);
  const lastDate = new Date(ly, lm - 1, ld);
  const curDate = new Date(cy, cm - 1, cd);

  const diffTime = curDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const missedDateKeys = [];
  for (let i = 1; i < diffDays; i++) {
    const intermediate = new Date(lastDate);
    intermediate.setDate(lastDate.getDate() + i);
    missedDateKeys.push(getLocalDateKey(intermediate));
  }

  // Habits reset today: unchecked
  const resetHabits = habits.map(h => ({
    ...h,
    completedToday: false
  }));

  return { missedDaysCount: Math.max(0, diffDays - 1), missedDateKeys, resetHabits };
}

function isDateLocked(dateKey, todayDateKey) {
  return dateKey < todayDateKey;
}

test('Date key format produces local YYYY-MM-DD', () => {
  const d = new Date(2026, 4, 15); // May 15, 2026
  assert.strictEqual(getLocalDateKey(d), '2026-05-15');
});

test('Consecutive day transition detects 0 missed days', () => {
  const res = processMultiDayGaps('2026-05-14', '2026-05-15', [{ id: 'h1', completedToday: true }]);
  assert.strictEqual(res.missedDaysCount, 0);
  assert.strictEqual(res.missedDateKeys.length, 0);
  assert.strictEqual(res.resetHabits[0].completedToday, false);
});

test('Multi-day gap (3 days missed) generates sequential missed dates', () => {
  const res = processMultiDayGaps('2026-05-10', '2026-05-14', [{ id: 'h1' }]);
  assert.strictEqual(res.missedDaysCount, 3);
  assert.deepStrictEqual(res.missedDateKeys, ['2026-05-11', '2026-05-12', '2026-05-13']);
});

test('Locked past history prevents editing previous days', () => {
  const today = '2026-05-15';
  assert.strictEqual(isDateLocked('2026-05-14', today), true);
  assert.strictEqual(isDateLocked('2026-05-15', today), false);
  assert.strictEqual(isDateLocked('2026-05-16', today), false);
});

// ======================================================================
// 2. XP MATH & RPG LEVEL CURVE
// ======================================================================
console.log('\n--- 2. Testing XP Math & RPG Level Curve ---');

const XP_CONFIG = {
  high: 50,
  medium: 30,
  normal: 20,
  low: 10,
  routineBonus: 100,
  allDoneBonus: 75,
  dailyCap: 500
};

function calculateLevelFromXP(totalXP) {
  let level = 1;
  let xpRemaining = totalXP;
  while (true) {
    const needed = Math.round(100 * Math.pow(level, 1.5));
    if (xpRemaining >= needed) {
      xpRemaining -= needed;
      level++;
    } else {
      break;
    }
  }
  return { level, currentLevelXP: xpRemaining, xpForNext: Math.round(100 * Math.pow(level, 1.5)) };
}

function getTitleForLevel(level) {
  if (level >= 50) return 'Grandmaster';
  if (level >= 35) return 'Master';
  if (level >= 20) return 'Warrior';
  if (level >= 10) return 'Disciplined';
  if (level >= 5) return 'Apprentice';
  return 'Novice';
}

function applyDailyAntiCheatCap(earnedXP, alreadyEarnedToday) {
  const availableUnderCap = Math.max(0, XP_CONFIG.dailyCap - alreadyEarnedToday);
  return Math.min(earnedXP, availableUnderCap);
}

test('Level 1 requires 100 XP (100 * 1^1.5)', () => {
  const res = calculateLevelFromXP(50);
  assert.strictEqual(res.level, 1);
  assert.strictEqual(res.currentLevelXP, 50);
  assert.strictEqual(res.xpForNext, 100);
});

test('XP threshold advances to Level 2 at 100 XP', () => {
  const res = calculateLevelFromXP(100);
  assert.strictEqual(res.level, 2);
  assert.strictEqual(res.currentLevelXP, 0);
  assert.strictEqual(res.xpForNext, 283); // 100 * 2^1.5 = 282.84 -> 283
});

test('Level titles map accurately to rank brackets', () => {
  assert.strictEqual(getTitleForLevel(1), 'Novice');
  assert.strictEqual(getTitleForLevel(4), 'Novice');
  assert.strictEqual(getTitleForLevel(5), 'Apprentice');
  assert.strictEqual(getTitleForLevel(10), 'Disciplined');
  assert.strictEqual(getTitleForLevel(20), 'Warrior');
  assert.strictEqual(getTitleForLevel(35), 'Master');
  assert.strictEqual(getTitleForLevel(50), 'Grandmaster');
  assert.strictEqual(getTitleForLevel(75), 'Grandmaster');
});

test('Daily XP cap prevents farming beyond 500 XP in a single day', () => {
  assert.strictEqual(applyDailyAntiCheatCap(50, 400), 50);
  assert.strictEqual(applyDailyAntiCheatCap(100, 450), 50);
  assert.strictEqual(applyDailyAntiCheatCap(50, 500), 0);
});

// ======================================================================
// 3. STREAKS & FREEZE TOKENS
// ======================================================================
console.log('\n--- 3. Testing Streaks & Streak Freeze Logic ---');

function evaluateStreak(dailyCompletionMap, appliedFreezes, todayDateKey) {
  const sortedDates = Object.keys(dailyCompletionMap).sort().reverse();
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // Walk backwards from today or yesterday
  const [y, m, d] = todayDateKey.split('-').map(Number);
  let cursor = new Date(y, m - 1, d);

  while (true) {
    const key = getLocalDateKey(cursor);
    const wasDone = dailyCompletionMap[key] === true;
    const isFrozen = appliedFreezes.includes(key);

    if (wasDone || isFrozen) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // If today is not done yet, check if yesterday was done before breaking
      if (key === todayDateKey) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return currentStreak;
}

test('Consecutive completed days increment streak', () => {
  const map = {
    '2026-05-13': true,
    '2026-05-14': true,
    '2026-05-15': true
  };
  const streak = evaluateStreak(map, [], '2026-05-15');
  assert.strictEqual(streak, 3);
});

test('Missed day with Streak Freeze preserves the streak', () => {
  const map = {
    '2026-05-12': true,
    '2026-05-13': true,
    '2026-05-14': false, // missed day
    '2026-05-15': true
  };
  const freezes = ['2026-05-14']; // Freeze applied to missed day
  const streak = evaluateStreak(map, freezes, '2026-05-15');
  assert.strictEqual(streak, 4);
});

test('Missed day without Freeze resets the streak', () => {
  const map = {
    '2026-05-12': true,
    '2026-05-13': true,
    '2026-05-14': false, // missed day with NO freeze
    '2026-05-15': true
  };
  const streak = evaluateStreak(map, [], '2026-05-15');
  assert.strictEqual(streak, 1);
});

test('Streak Freeze monthly allotment capped at 2 tokens without stacking', () => {
  function getMonthlyTokens(lastResetMonth, currentMonth, existingUnused) {
    if (lastResetMonth !== currentMonth) {
      return 2; // resets to 2 on 1st of month
    }
    return Math.min(2, existingUnused);
  }
  assert.strictEqual(getMonthlyTokens('2026-04', '2026-05', 1), 2);
  assert.strictEqual(getMonthlyTokens('2026-05', '2026-05', 1), 1);
  assert.strictEqual(getMonthlyTokens('2026-04', '2026-05', 2), 2); // Does not stack to 4
});

// ======================================================================
// 4. SYNC CONFLICT RESOLUTION
// ======================================================================
console.log('\n--- 4. Testing Sync Conflict Resolution ---');

function resolveConflictLWW(localDoc, remoteDoc) {
  // 1. Tombstone check: deleted state wins if timestamp is at or after
  if (localDoc.deleted && new Date(localDoc.deletedAt || localDoc.updatedAt) >= new Date(remoteDoc.updatedAt)) {
    return { ...localDoc, isDeleted: true };
  }
  if (remoteDoc.deleted && new Date(remoteDoc.deletedAt || remoteDoc.updatedAt) >= new Date(localDoc.updatedAt)) {
    return { ...remoteDoc, isDeleted: true };
  }

  // 2. Last-Write-Wins comparison
  const localTime = new Date(localDoc.updatedAt).getTime();
  const remoteTime = new Date(remoteDoc.updatedAt).getTime();

  if (localTime >= remoteTime) {
    return localDoc;
  }
  return remoteDoc;
}

test('Last-Write-Wins selects local document when local is newer', () => {
  const local = { id: 'h1', name: 'Workout', updatedAt: '2026-05-15T10:30:00.000Z' };
  const remote = { id: 'h1', name: 'Old Workout', updatedAt: '2026-05-15T09:00:00.000Z' };
  const winner = resolveConflictLWW(local, remote);
  assert.strictEqual(winner.name, 'Workout');
});

test('Last-Write-Wins selects remote document when remote is newer', () => {
  const local = { id: 'h1', name: 'Workout', updatedAt: '2026-05-15T08:00:00.000Z' };
  const remote = { id: 'h1', name: 'Remote Updated Workout', updatedAt: '2026-05-15T11:00:00.000Z' };
  const winner = resolveConflictLWW(local, remote);
  assert.strictEqual(winner.name, 'Remote Updated Workout');
});

test('Tombstone deletion wins over older mutation', () => {
  const local = {
    id: 'h1',
    deleted: true,
    deletedAt: '2026-05-15T12:00:00.000Z',
    updatedAt: '2026-05-15T12:00:00.000Z'
  };
  const remote = {
    id: 'h1',
    name: 'Revived?',
    updatedAt: '2026-05-15T11:30:00.000Z'
  };
  const winner = resolveConflictLWW(local, remote);
  assert.strictEqual(winner.deleted, true);
});

console.log('\n====================================================');
console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
}

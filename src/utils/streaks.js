/**
 * Returns the current streak (consecutive days up to today) for a habit.
 * completions: { "2026-09-01": true, "2026-09-02": true, ... }
 */
export function getCurrentStreak(completions) {
  let streak = 0;
  const today = new Date();
  const d = new Date(today);

  while (true) {
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Returns the longest streak ever for a habit.
 */
export function getLongestStreak(completions) {
  const dates = Object.entries(completions)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort();

  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

/**
 * Get all day completions for the current month.
 * Returns { "1": true, "5": true } from completions map keys like "2026-09-05"
 */
export function getMonthDays(completions, year, month) {
  const result = {};
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  for (const [key, val] of Object.entries(completions)) {
    if (key.startsWith(prefix) && val) {
      const day = parseInt(key.slice(8), 10);
      result[day] = true;
    }
  }
  return result;
}

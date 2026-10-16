/**
 * Gamification & RPG Leveling Configuration
 * Configurable XP values, Level Curve formula, Titles, and Streak Freeze rules.
 */

export const GAMIFICATION_CONFIG = {
  // Base XP per completed task based on priority
  XP_PER_PRIORITY: {
    High: 50,
    Medium: 30,
    Normal: 20,
    Low: 10,
  },

  // Bonus XP
  BONUS_XP: {
    ROUTINE_COMPLETED: 100, // Full routine execution in Guided Flow or Checklist
    ALL_TASKS_DONE: 75,    // All scheduled tasks for today completed
    STREAK_MILESTONES: {
      7: 100,
      14: 150,
      30: 300,
      60: 600,
      100: 1000,
      365: 3650,
    },
  },

  // Anti-cheat protections
  ANTI_CHEAT: {
    MAX_DAILY_TASK_XP: 500, // Maximum task XP claimable in a single 24-hour cycle
    MAX_FREEZE_AGE_HOURS: 48, // Streak freeze can only be applied within 48h of missed date
  },

  // Streak Freeze Tokens
  STREAK_FREEZE: {
    MONTHLY_ALLOWANCE: 2, // Resets to 2 on the 1st of each month
    MAX_ACCUMULATED: 2,   // Does not stack beyond 2
  },

  // Level Titles
  LEVEL_TITLES: [
    { minLevel: 1, maxLevel: 4, title: 'Novice', badgeColor: '#C1C1C1' },
    { minLevel: 5, maxLevel: 9, title: 'Apprentice', badgeColor: '#FFA64D' },
    { minLevel: 10, maxLevel: 19, title: 'Disciplined', badgeColor: '#FF7A00' },
    { minLevel: 20, maxLevel: 34, title: 'Warrior', badgeColor: '#FF5500' },
    { minLevel: 35, maxLevel: 49, title: 'Master', badgeColor: '#FFB800' },
    { minLevel: 50, maxLevel: 999, title: 'Grandmaster', badgeColor: '#34D399' },
  ],
};

/**
 * Formula: xpNeeded = floor(100 * level^1.5)
 * Returns the XP required to advance from `level` to `level + 1`
 */
export function getXpNeededForLevel(level) {
  if (level < 1) return 100;
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculates current level, progress, and title given total lifetime XP
 */
export function calculateLevelFromXP(totalXP = 0) {
  let level = 1;
  let remainingXP = Math.max(0, totalXP);
  let xpForNext = getXpNeededForLevel(level);

  while (remainingXP >= xpForNext) {
    remainingXP -= xpForNext;
    level += 1;
    xpForNext = getXpNeededForLevel(level);
  }

  const currentLevelXP = remainingXP;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / xpForNext) * 100));

  const matchedTitle = GAMIFICATION_CONFIG.LEVEL_TITLES.find(
    (t) => level >= t.minLevel && level <= t.maxLevel
  ) || GAMIFICATION_CONFIG.LEVEL_TITLES[GAMIFICATION_CONFIG.LEVEL_TITLES.length - 1];

  return {
    level,
    currentLevelXP,
    xpForNext,
    totalXP,
    progressPercent,
    title: matchedTitle.title,
    badgeColor: matchedTitle.badgeColor,
  };
}

/**
 * Daily Quests & Weekly Boss Challenges Configuration
 * RPG quest system awarding bonus XP upon completion.
 */

export const DAILY_QUEST_TEMPLATES = [
  {
    id: 'quest_triple_threat',
    title: 'Triple Threat',
    description: 'Complete at least 3 habits today',
    target: 3,
    xpReward: 60,
    check: (dayTasks) => (dayTasks || []).filter(t => t.completed).length >= 3,
    getProgress: (dayTasks) => Math.min(3, (dayTasks || []).filter(t => t.completed).length)
  },
  {
    id: 'quest_high_priority',
    title: 'Titan Smasher',
    description: 'Complete 1 High-Priority habit',
    target: 1,
    xpReward: 50,
    check: (dayTasks) => (dayTasks || []).some(t => t.completed && t.priority === 'high'),
    getProgress: (dayTasks) => (dayTasks || []).some(t => t.completed && t.priority === 'high') ? 1 : 0
  },
  {
    id: 'quest_morning_victory',
    title: 'Early Bird Momentum',
    description: 'Complete any habit before 12:00 PM',
    target: 1,
    xpReward: 40,
    check: (dayTasks) => (dayTasks || []).some(t => t.completed), // or completed timestamp
    getProgress: (dayTasks) => (dayTasks || []).some(t => t.completed) ? 1 : 0
  },
  {
    id: 'quest_mind_check',
    title: 'Emotional Awareness',
    description: 'Log your daily mood and energy level',
    target: 1,
    xpReward: 35,
    check: (dayTasks, dayRecord) => Boolean(dayRecord && dayRecord.mood && dayRecord.mood.score),
    getProgress: (dayTasks, dayRecord) => (dayRecord && dayRecord.mood && dayRecord.mood.score) ? 1 : 0
  }
];

export const WEEKLY_BOSS_CHALLENGES = [
  {
    id: 'boss_iron_discipline',
    bossName: 'The Procrastination Behemoth',
    title: 'Iron Discipline Raid',
    description: 'Complete 20 total habits this week to defeat the Behemoth!',
    target: 20,
    xpReward: 300,
    bossHp: 20,
    check: (completedCount) => completedCount >= 20
  },
  {
    id: 'boss_routine_master',
    bossName: 'The Chaos Dragon',
    title: 'Order Over Chaos',
    description: 'Complete 5 routine sessions this week',
    target: 5,
    xpReward: 250,
    bossHp: 5,
    check: (completedCount) => completedCount >= 5
  }
];

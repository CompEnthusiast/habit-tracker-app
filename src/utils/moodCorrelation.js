/**
 * Mood Tracking & Correlation Engine
 * - Ratings 1-5 with emoji and energy level
 * - Correlation analysis between habit completion and daily mood
 * - Strictly enforces 14-day minimum sample threshold before showing correlation
 * - Clear disclaimer: "Correlation does not imply causation"
 * - Calendar heatmap generator and weekly trend calculations
 */

export const MOOD_LEVELS = [
  { score: 1, emoji: '😫', label: 'Terrible', color: '#ef4444' },
  { score: 2, emoji: '😕', label: 'Low', color: '#f97316' },
  { score: 3, emoji: '😐', label: 'Okay', color: '#eab308' },
  { score: 4, emoji: '🙂', label: 'Good', color: '#84cc16' },
  { score: 5, emoji: '⚡', label: 'Great', color: '#10b981' },
];

export const CORRELATION_DISCLAIMER =
  "Note: Correlation does not imply causation. These insights reflect observed patterns in your logged data over time and are intended for personal reflection only.";

/**
 * Compute Habit vs. Mood Correlation
 * @param {Array} dayRecords - Array of day_records objects
 * @param {Array} habits - Array of habit definitions
 */
export function computeHabitMoodCorrelations(dayRecords = [], habits = []) {
  // Filter days that have a logged mood
  const recordsWithMood = dayRecords.filter(
    (record) => record && record.mood && typeof record.mood.score === 'number' && record.mood.score >= 1
  );

  const totalLoggedDays = recordsWithMood.length;
  const MIN_DAYS_REQUIRED = 14;

  if (totalLoggedDays < MIN_DAYS_REQUIRED) {
    return {
      sufficientData: false,
      totalLoggedDays,
      threshold: MIN_DAYS_REQUIRED,
      message: `At least ${MIN_DAYS_REQUIRED} days of mood entries are required to calculate reliable correlations. You have currently logged ${totalLoggedDays} ${totalLoggedDays === 1 ? 'day' : 'days'}.`,
      disclaimer: CORRELATION_DISCLAIMER,
      correlations: [],
    };
  }

  const habitMap = {};
  habits.forEach((h) => {
    habitMap[h._id] = h.title || h.name || 'Unnamed Habit';
  });

  // Aggregate stats per habit
  const habitStats = {};

  recordsWithMood.forEach((record) => {
    const moodScore = record.mood.score;
    const completedIds = new Set(
      Array.isArray(record.tasks)
        ? record.tasks.filter((t) => t.completed).map((t) => t.id || t._id)
        : []
    );

    habits.forEach((h) => {
      const hId = h._id;
      if (!habitStats[hId]) {
        habitStats[hId] = {
          habitId: hId,
          habitName: h.title || h.name || 'Habit',
          category: h.category || 'General',
          doneScores: [],
          notDoneScores: [],
        };
      }

      if (completedIds.has(hId)) {
        habitStats[hId].doneScores.push(moodScore);
      } else {
        habitStats[hId].notDoneScores.push(moodScore);
      }
    });
  });

  // Calculate averages & differences
  const correlations = Object.values(habitStats)
    .map((stat) => {
      const avgDone =
        stat.doneScores.length > 0
          ? stat.doneScores.reduce((a, b) => a + b, 0) / stat.doneScores.length
          : null;
      const avgNotDone =
        stat.notDoneScores.length > 0
          ? stat.notDoneScores.reduce((a, b) => a + b, 0) / stat.notDoneScores.length
          : null;

      const difference = avgDone !== null && avgNotDone !== null ? avgDone - avgNotDone : null;

      return {
        habitId: stat.habitId,
        habitName: stat.habitName,
        category: stat.category,
        daysDone: stat.doneScores.length,
        daysNotDone: stat.notDoneScores.length,
        avgMoodDone: avgDone !== null ? Number(avgDone.toFixed(2)) : null,
        avgMoodNotDone: avgNotDone !== null ? Number(avgNotDone.toFixed(2)) : null,
        difference: difference !== null ? Number(difference.toFixed(2)) : 0,
        sampleSize: stat.doneScores.length + stat.notDoneScores.length,
      };
    })
    .filter((c) => c.daysDone >= 3 && c.daysNotDone >= 3) // Need sufficient variations
    .sort((a, b) => (b.difference || 0) - (a.difference || 0));

  return {
    sufficientData: true,
    totalLoggedDays,
    threshold: MIN_DAYS_REQUIRED,
    disclaimer: CORRELATION_DISCLAIMER,
    correlations,
  };
}

/**
 * Generate Heatmap Data for Calendar
 */
export function getMoodHeatmap(dayRecords = [], days = 35) {
  const map = {};
  dayRecords.forEach((record) => {
    if (record && record.dateKey && record.mood) {
      map[record.dateKey] = record.mood;
    }
  });

  const cells = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const mood = map[dateKey] || null;

    cells.push({
      dateKey,
      dayNumber: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      mood: mood ? mood.score : null,
      emoji: mood && mood.score ? MOOD_LEVELS[mood.score - 1]?.emoji : null,
      color: mood && mood.score ? MOOD_LEVELS[mood.score - 1]?.color : '#1E1D1C',
      energy: mood ? mood.energy : null,
      note: mood ? mood.note : '',
    });
  }

  return cells;
}

/**
 * Generate Weekly Mood Trend
 */
export function getWeeklyMoodTrend(dayRecords = []) {
  const map = {};
  dayRecords.forEach((record) => {
    if (record && record.dateKey && record.mood && record.mood.score) {
      map[record.dateKey] = {
        score: record.mood.score,
        energy: record.mood.energy || null,
      };
    }
  });

  const trend = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const item = map[dateKey];
    trend.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: dateKey,
      mood: item ? item.score : null,
      energy: item ? item.energy : null,
    });
  }

  return trend;
}

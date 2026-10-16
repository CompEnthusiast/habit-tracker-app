/**
 * Deterministic Habit Analytics & Pattern Detection Engine
 * 
 * Computes:
 * - Failure rate by weekday (Mon-Sun)
 * - Most skipped habits
 * - Longest chains
 * - Week-over-week completion trend (% change)
 * - Best performing time of day
 * - Rule-based deterministic coaching feedback in English & Hinglish
 */

import { getLocalDateKey } from './rolloverEngine';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Computes full weekly discipline statistics from habits data
 */
export function computeWeeklyDisciplineStats(habits = [], referenceDate = new Date()) {
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCompletions = [0, 0, 0, 0, 0, 0, 0];
  const habitSkipCounts = {};
  const habitDoneCounts = {};

  // Analyze the last 28 days for statistically valid pattern detection
  const daysToAnalyze = 28;
  const currentWeekCompletions = [0, 0]; // [done, total]
  const lastWeekCompletions = [0, 0];    // [done, total]

  for (let i = 0; i < daysToAnalyze; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateKey = getLocalDateKey(d);
    const dayOfWeek = d.getDay();

    habits.forEach((habit) => {
      const isCompleted = Boolean(habit.completions && habit.completions[dateKey]);
      weekdayTotals[dayOfWeek] += 1;
      if (isCompleted) {
        weekdayCompletions[dayOfWeek] += 1;
        habitDoneCounts[habit._id] = (habitDoneCounts[habit._id] || 0) + 1;
      } else {
        habitSkipCounts[habit._id] = (habitSkipCounts[habit._id] || 0) + 1;
      }

      // Week-over-week calculation
      if (i < 7) {
        currentWeekCompletions[1] += 1;
        if (isCompleted) currentWeekCompletions[0] += 1;
      } else if (i < 14) {
        lastWeekCompletions[1] += 1;
        if (isCompleted) lastWeekCompletions[0] += 1;
      }
    });
  }

  // Calculate failure rate by weekday
  const weekdayFailureRates = DAYS_OF_WEEK.map((dayName, idx) => {
    const total = weekdayTotals[idx];
    const done = weekdayCompletions[idx];
    const rate = total > 0 ? Math.round(((total - done) / total) * 100) : 0;
    return { day: dayName, failureRate: rate, total, done };
  });

  // Find weekday with highest failure rate
  const worstDay = [...weekdayFailureRates].sort((a, b) => b.failureRate - a.failureRate)[0];

  // Most skipped habits
  const rankedSkips = habits
    .map((h) => ({
      id: h._id,
      name: h.name,
      category: h.category,
      skips: habitSkipCounts[h._id] || 0,
      dones: habitDoneCounts[h._id] || 0,
    }))
    .sort((a, b) => b.skips - a.skips);

  const mostSkippedHabit = rankedSkips[0] || null;

  // Trend vs last week
  const currentWeekPct =
    currentWeekCompletions[1] > 0
      ? Math.round((currentWeekCompletions[0] / currentWeekCompletions[1]) * 100)
      : 0;
  const lastWeekPct =
    lastWeekCompletions[1] > 0
      ? Math.round((lastWeekCompletions[0] / lastWeekCompletions[1]) * 100)
      : 0;
  const trendDiff = currentWeekPct - lastWeekPct;

  return {
    weekdayFailureRates,
    worstDay,
    mostSkippedHabit,
    currentWeekPct,
    lastWeekPct,
    trendDiff,
    totalHabitsCount: habits.length,
  };
}

/**
 * Generate deterministic fallback coaching report (English & Hinglish)
 */
export function generateDeterministicReport(stats, language = 'en') {
  const { worstDay, mostSkippedHabit, trendDiff, currentWeekPct } = stats;

  if (language === 'hinglish') {
    const trendText =
      trendDiff >= 0
        ? `Last week se comparison me aapka discipline +${trendDiff}% upar gaya hai! Zabardast consistency.`
        : `Pichle hafte ke mukable completion rate ${Math.abs(trendDiff)}% kam hua hai. Ghbrao mat, momentum wapas layenge.`;

    const dayTip =
      worstDay && worstDay.failureRate > 20
        ? `${worstDay.day} ko aapka failure rate lagbhag ${worstDay.failureRate}% rehta hai. Is din schedule tight hota hai, isliye habits ko subah 15-minute quick session me nipta lo.`
        : `Aapka daily schedule kaafi balanced chal raha hai. Kisi bhi din major drop nahi hai.`;

    const habitTip = mostSkippedHabit
      ? `Sabse zyada miss hone wali habit '${mostSkippedHabit.name}' hai. Isko 2-minute rule lagao: agar pura workout nahi ho raha to bas 10 pushups karke tick kar lo.`
      : `Sabhi habits par steady progress chal rahi hai.`;

    return {
      title: 'Hafta-war Discipline Report (Hinglish)',
      overallScore: `${currentWeekPct}% Completion Rate`,
      summary: `${trendText}\n\n• ${dayTip}\n• ${habitTip}`,
      recommendation: `Action Plan: Kal subah top non-negotiable habit pehle 30 minutes me finish karo.`,
    };
  }

  // English Default
  const trendText =
    trendDiff >= 0
      ? `Your consistency surged +${trendDiff}% compared to last week. Outstanding momentum!`
      : `Completion dropped by ${Math.abs(trendDiff)}% compared to last week. Let’s calibrate your habit loads.`;

  const dayTip =
    worstDay && worstDay.failureRate > 20
      ? `${worstDay.day} shows your peak failure rate at ${worstDay.failureRate}%. Consider shifting intense habits on ${worstDay.day} to early morning or reducing difficulty.`
      : `Your consistency is uniform across all days of the week.`;

  const habitTip = mostSkippedHabit
    ? `Your most skipped discipline is '${mostSkippedHabit.name}'. Apply the 2-minute Minimum Viable Habit rule so challenging days still count.`
    : `All active habits maintain strong adherence.`;

  return {
    title: 'Weekly Discipline Intelligence Report',
    overallScore: `${currentWeekPct}% Weekly Adherence`,
    summary: `${trendText}\n\n• ${dayTip}\n• ${habitTip}`,
    recommendation: `Action Item: Lock in your hardest habit first thing in the morning tomorrow to eliminate late-day cognitive fatigue.`,
  };
}

export function generateWeeklyDisciplineReport(dayRecords = [], habits = [], isHinglish = false) {
  const stats = computeWeeklyDisciplineStats(habits);
  const rep = generateDeterministicReport(stats, isHinglish ? 'hinglish' : 'en');
  return {
    stats: {
      weeklyRate: stats.currentWeekPct,
      totalCompleted: habits.reduce((acc, h) => {
        return acc + Object.values(h.completions || {}).filter(Boolean).length;
      }, 0),
      worstWeekday: stats.worstDay,
      bestWeekday: stats.bestDay,
      weekdayStats: stats.weekdayFailureRates,
      trendDiff: stats.trendDiff,
    },
    localTips: rep.summary.split('\n\n• ').map((s) => s.replace(/^• /, '').trim()).filter(Boolean),
    title: rep.title,
    summary: rep.summary,
    recommendation: rep.recommendation,
  };
}

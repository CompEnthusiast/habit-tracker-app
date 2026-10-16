/**
 * Initial Routines Data (Atomic Habits Stacking Model)
 * 
 * Each routine contains an ordered sequence of habit steps with:
 * - name: Action name
 * - cue: Habit stacking prompt ("After I [X], I will [Y]")
 * - durationSeconds: Target timer for guided flow
 * - icon: Lucide icon name or emoji
 * - linkedHabitKeyword: Auto-ticks any matching habit upon completion
 */

export const INITIAL_ROUTINES = [
  {
    id: 'morning_stack',
    title: 'Morning Discipline Stack',
    type: 'morning',
    description: 'Prime energy, mental clarity, and focus for high performance.',
    steps: [
      {
        id: 'm1',
        title: 'Hydrate 500ml Cold Water',
        cue: 'After I get out of bed, I will drink 500ml cold water.',
        durationSeconds: 120, // 2 mins
        icon: 'Droplets',
        linkedHabitKeyword: 'water',
        skipped: false,
      },
      {
        id: 'm2',
        title: 'Morning Sunlight & Stretch',
        cue: 'After I finish my water, I will get 5 minutes of direct sunlight.',
        durationSeconds: 300, // 5 mins
        icon: 'Sun',
        linkedHabitKeyword: 'walk',
        skipped: false,
      },
      {
        id: 'm3',
        title: '10 Min Breathwork & Meditation',
        cue: 'After stretching, I will sit for 10 minutes of box breathing.',
        durationSeconds: 600, // 10 mins
        icon: 'Wind',
        linkedHabitKeyword: 'meditation',
        skipped: false,
      },
      {
        id: 'm4',
        title: 'Top 3 Priority Planning',
        cue: 'After meditation, I will write today’s top 3 non-negotiables.',
        durationSeconds: 300, // 5 mins
        icon: 'CheckSquare',
        linkedHabitKeyword: 'plan',
        skipped: false,
      },
    ],
    completionsCount: 0,
    startedCount: 0,
    stepFailures: {}, // { "m3": 4 } tracks which step breaks the chain
  },
  {
    id: 'evening_stack',
    title: 'Evening Shutdown & Wind-down',
    type: 'evening',
    description: 'Disconnect from screens, review progress, and prepare deep sleep.',
    steps: [
      {
        id: 'e1',
        title: 'Digital Work Shutdown',
        cue: 'After 8:00 PM, I will close work tabs and log off slack/email.',
        durationSeconds: 300,
        icon: 'MonitorOff',
        linkedHabitKeyword: 'shutdown',
        skipped: false,
      },
      {
        id: 'e2',
        title: 'Daily Reflection & Habit Review',
        cue: 'After closing my laptop, I will review today’s habit checklist.',
        durationSeconds: 300,
        icon: 'BookOpen',
        linkedHabitKeyword: 'journal',
        skipped: false,
      },
      {
        id: 'e3',
        title: '20 Pages Reading',
        cue: 'After journaling, I will read 20 pages of a physical book.',
        durationSeconds: 900, // 15 mins
        icon: 'Book',
        linkedHabitKeyword: 'read',
        skipped: false,
      },
      {
        id: 'e4',
        title: 'Stretching & Lights Out',
        cue: 'After reading, I will turn off screens and stretch for 5 minutes.',
        durationSeconds: 300,
        icon: 'Moon',
        linkedHabitKeyword: 'sleep',
        skipped: false,
      },
    ],
    completionsCount: 0,
    startedCount: 0,
    stepFailures: {},
  },
];

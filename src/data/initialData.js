export const defaultHabits = [
  { id: 'h1', name: 'Meditate', category: 'Self care', color: 'accent1', days: {} },
  { id: 'h2', name: 'Read 20 pages', category: 'Self care', color: 'accent1', days: {} },
  { id: 'h3', name: 'Drink water', category: 'Health', color: 'accent2', days: {} },
  { id: 'h4', name: 'Workout', category: 'Health', color: 'accent2', days: {} },
  { id: 'h5', name: 'Sleep 8 hours', category: 'Health', color: 'accent2', days: {} },
  { id: 'h6', name: 'Deep work', category: 'Work', color: 'secondary', days: {} },
  { id: 'h7', name: 'Plan tomorrow', category: 'Productivity', color: 'primary', days: {} },
];

// Helper to generate empty days for current month (assume 31 days for UI sake)
export const getDaysInMonth = () => 31;

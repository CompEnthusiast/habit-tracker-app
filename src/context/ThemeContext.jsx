/**
 * ThemeContext — Dark/Light mode toggle with persistence
 * 
 * Default: dark (matches the existing app design)
 * Persists to localStorage and applies CSS class to <html>
 */
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('habit_tracker_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('habit_tracker_theme', next);
      } catch {}
      return next;
    });
  };

  // Apply theme class to <html> element for CSS variable overrides
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

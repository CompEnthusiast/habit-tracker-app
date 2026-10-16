/**
 * useKeyboardShortcuts — Global keyboard shortcut handler
 * 
 * Shortcuts:
 *   N = New task
 *   Space = Toggle focused task
 *   / = Focus search
 *   Ctrl+Z = Undo
 *   Ctrl+Shift+Z / Ctrl+Y = Redo
 *   D = Toggle dark mode
 *   ? = Show shortcut help
 *   Esc = Close modals
 */
import { useEffect, useCallback, useState } from 'react';

export function useKeyboardShortcuts({
  onNewTask,
  onToggleFocused,
  onFocusSearch,
  onUndo,
  onRedo,
  onToggleTheme,
  onEscape,
  onFlowMode,
  onMoodTracker,
  onVoiceCheckin,
  onAmbienceAudio,
  enabled = true,
}) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Don't intercept when typing in inputs/textareas
      const tag = e.target.tagName.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

      // Ctrl/Cmd shortcuts work even in inputs
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          onUndo?.();
          return;
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          onRedo?.();
          return;
        }
      }

      // Escape always works
      if (e.key === 'Escape') {
        onEscape?.();
        setShowHelp(false);
        return;
      }

      // Skip other shortcuts if editing
      if (isEditing) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewTask?.();
          break;
        case ' ':
          e.preventDefault();
          onToggleFocused?.();
          break;
        case '/':
          e.preventDefault();
          onFocusSearch?.();
          break;
        case 'f':
          e.preventDefault();
          onFlowMode?.();
          break;
        case 'm':
          e.preventDefault();
          onMoodTracker?.();
          break;
        case 'v':
          e.preventDefault();
          onVoiceCheckin?.();
          break;
        case 'a':
          e.preventDefault();
          onAmbienceAudio?.();
          break;
        case 'd':
          e.preventDefault();
          onToggleTheme?.();
          break;
        case '?':
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
        default:
          break;
      }
    },
    [
      enabled,
      onNewTask,
      onToggleFocused,
      onFocusSearch,
      onUndo,
      onRedo,
      onToggleTheme,
      onEscape,
      onFlowMode,
      onMoodTracker,
      onVoiceCheckin,
      onAmbienceAudio
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}

/** Shortcut definitions for the help modal */
export const SHORTCUTS = [
  { key: 'N', label: 'New Task / Habit' },
  { key: 'Space', label: 'Toggle Focused Task' },
  { key: '/', label: 'Focus Search' },
  { key: 'F', label: 'Launch Guided Flow Mode' },
  { key: 'M', label: 'Open Mood Tracker' },
  { key: 'V', label: 'Open Voice Check-in' },
  { key: 'A', label: 'Open Focus Ambience Mixer' },
  { key: 'D', label: 'Toggle Dark/Light Mode' },
  { key: 'Ctrl+Z', label: 'Undo' },
  { key: 'Ctrl+Shift+Z', label: 'Redo' },
  { key: '?', label: 'Show/Hide Shortcuts' },
  { key: 'Esc', label: 'Close Modals' },
];

export default useKeyboardShortcuts;

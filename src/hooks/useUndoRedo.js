/**
 * useUndoRedo — Simple undo/redo stack for habit actions
 * Stores action descriptors, not full state snapshots (memory efficient)
 */
import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const listenersRef = useRef([]);

  /** Record an action. action = { type, payload, undo() , redo() } */
  const record = useCallback((action) => {
    setUndoStack((prev) => {
      const next = [...prev, action];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    // Clear redo stack on new action
    setRedoStack([]);
  }, []);

  /** Undo the last action */
  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const next = prev.slice(0, -1);

      // Execute undo
      if (action.undo) {
        try {
          action.undo();
        } catch (e) {
          console.error('[UndoRedo] Undo failed:', e);
        }
      }

      // Push to redo stack
      setRedoStack((rPrev) => [...rPrev, action]);

      // Notify listeners
      listenersRef.current.forEach((fn) => fn('undo', action));

      return next;
    });
  }, []);

  /** Redo the last undone action */
  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const next = prev.slice(0, -1);

      // Execute redo
      if (action.redo) {
        try {
          action.redo();
        } catch (e) {
          console.error('[UndoRedo] Redo failed:', e);
        }
      }

      // Push back to undo stack
      setUndoStack((uPrev) => [...uPrev, action]);

      // Notify listeners
      listenersRef.current.forEach((fn) => fn('redo', action));

      return next;
    });
  }, []);

  /** Subscribe to undo/redo events */
  const onAction = useCallback((fn) => {
    listenersRef.current.push(fn);
    return () => {
      listenersRef.current = listenersRef.current.filter((f) => f !== fn);
    };
  }, []);

  return {
    record,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    lastAction: undoStack[undoStack.length - 1] || null,
    onAction,
  };
}

export default useUndoRedo;

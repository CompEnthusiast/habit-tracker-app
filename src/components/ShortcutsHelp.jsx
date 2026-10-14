/**
 * ShortcutsHelp — Modal displaying all keyboard shortcuts
 */
import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export default function ShortcutsHelp({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,14,12,0.92)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[--color-surface] border-2 border-[--color-primary] overflow-hidden"
        style={{ boxShadow: '6px 6px 0px var(--color-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[--color-primary]/40 bg-[--color-background]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[--color-primary] border-2 border-[--color-primary]" style={{ boxShadow: '2px 2px 0px #000' }}>
              <Keyboard size={16} className="text-[--color-background]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[--color-text] uppercase tracking-widest font-mono">SHORTCUTS</h2>
              <p className="text-[10px] text-[--color-primary] font-mono uppercase">// PRESS ? TO TOGGLE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[--color-borderSlate] text-[--color-silver] hover:border-[--color-primary] hover:text-[--color-primary] transition-all"
            style={{ boxShadow: '2px 2px 0px #000' }}
            aria-label="Close shortcuts"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-2">
          {SHORTCUTS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between p-2.5 border-2 border-[--color-borderSlate] bg-[--color-background]"
              style={{ boxShadow: '2px 2px 0px #000' }}
            >
              <span className="text-xs font-bold text-[--color-text]">{label}</span>
              <kbd className="px-2 py-0.5 text-[10px] font-black font-mono text-black bg-[--color-primary] border border-black">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t-2 border-[--color-borderSlate] bg-[--color-background] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border-2 border-[--color-borderSlate] hover:border-[--color-primary] text-[--color-text] text-xs font-black uppercase tracking-widest transition-all font-mono"
            style={{ boxShadow: '2px 2px 0px #000' }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

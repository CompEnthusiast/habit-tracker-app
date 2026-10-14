/**
 * DebugPanel — Developer tools for testing midnight rollover
 * 
 * Only visible in dev mode. Allows simulating day changes.
 */
import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, FastForward, RotateCcw } from 'lucide-react';

export default function DebugPanel({ todayInfo, onSimulateNextDay }) {
  const [expanded, setExpanded] = useState(false);

  // Only show in development
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <div className="brutal-card rounded-lg overflow-hidden" style={{ width: expanded ? '280px' : 'auto' }}>
        {/* Toggle button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-3 py-2 text-[10px] font-black font-mono uppercase tracking-wider text-[--color-silver] hover:text-[--color-primary] transition-colors w-full"
        >
          <Bug size={12} className="text-[--color-primary]" />
          DEBUG
          {expanded ? <ChevronDown size={10} className="ml-auto" /> : <ChevronUp size={10} className="ml-auto" />}
        </button>

        {expanded && (
          <div className="p-3 border-t-2 border-[--color-borderSlate] space-y-2">
            {/* Current date info */}
            <div className="text-[10px] font-mono text-[--color-silver] space-y-0.5">
              <p>DATE: <strong className="text-[--color-text]">{todayInfo.dateKey}</strong></p>
              <p>DAY: <strong className="text-[--color-text]">{todayInfo.day}</strong></p>
              <p>MONTH: <strong className="text-[--color-text]">{todayInfo.month}</strong></p>
              <p>YEAR: <strong className="text-[--color-text]">{todayInfo.year}</strong></p>
            </div>

            {/* Simulate Next Day */}
            <button
              onClick={onSimulateNextDay}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black text-black bg-[--color-primary] border-2 border-[--color-primary] uppercase tracking-wider transition-all active:translate-x-[1px] active:translate-y-[1px] font-mono"
              style={{ boxShadow: '2px 2px 0px #000' }}
            >
              <FastForward size={11} />
              SIMULATE NEXT DAY
            </button>

            <p className="text-[8px] font-mono text-[--color-silver]/60 text-center">
              Test midnight rollover by advancing the day
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

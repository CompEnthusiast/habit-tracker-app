import { useState, useEffect } from 'react';
import {
  Compass,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  Droplets,
  Sun,
  Wind,
  CheckSquare,
  MonitorOff,
  BookOpen,
  Book,
  Moon,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { getRoutines, getRoutineAnalytics } from '../utils/routinesEngine';

const STEP_ICONS = {
  Droplets,
  Sun,
  Wind,
  CheckSquare,
  MonitorOff,
  BookOpen,
  Book,
  Moon,
  Compass,
};

export default function RoutinesPanel({
  onStartFlow = (routine) => {},
}) {
  const [routines, setRoutines] = useState([]);
  const [expandedRoutineId, setExpandedRoutineId] = useState('morning_stack');

  useEffect(() => {
    getRoutines().then((data) => setRoutines(data));
  }, []);

  return (
    <div className="rounded-xl border-2 border-[#494848] bg-[#1E1D1C] p-6 shadow-[5px_5px_0px_#000000]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#494848] mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FF7A00] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Compass size={17} className="text-black" />
          </div>
          <div>
            <h2 className="text-base font-black font-mono uppercase text-white tracking-wider">
              HABIT STACKS & ROUTINES
            </h2>
            <p className="text-[10px] font-mono text-[#FF7A00] uppercase tracking-wider">
              // ATOMIC HABITS SEQUENCING & GUIDED FLOW
            </p>
          </div>
        </div>

        <span className="brutal-badge-orange rounded font-mono text-xs">
          {routines.length} ACTIVE STACKS
        </span>
      </div>

      {/* Routines List */}
      <div className="space-y-4">
        {routines.map((routine) => {
          const isExpanded = expandedRoutineId === routine.id;
          const analytics = getRoutineAnalytics(routine);

          return (
            <div
              key={routine.id}
              className="border-2 border-[#494848] bg-[#100E0C] shadow-[3px_3px_0px_#000000] overflow-hidden transition-all hover:border-[#FF7A00]"
            >
              {/* Routine Card Header */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181614] border-b border-[#494848]">
                <div
                  className="flex items-start gap-3 cursor-pointer flex-1"
                  onClick={() => setExpandedRoutineId(isExpanded ? null : routine.id)}
                >
                  <div className="p-2 border border-[#494848] bg-[#100E0C] text-[#FF7A00]">
                    {routine.type === 'morning' ? <Sun size={18} /> : <Moon size={18} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black font-mono uppercase text-white">
                        {routine.title}
                      </h3>
                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 border border-[#494848] bg-[#100E0C] text-[#C1C1C1]">
                        {routine.steps.length} STEPS
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[#C1C1C1] mt-0.5">
                      {routine.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    onClick={() => onStartFlow(routine)}
                    className="px-3.5 py-1.5 bg-[#FF7A00] text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-[#FFA64D] active:translate-x-px active:translate-y-px transition-all"
                  >
                    <Play size={12} fill="black" />
                    <span>START GUIDED FLOW</span>
                  </button>

                  <button
                    onClick={() => setExpandedRoutineId(isExpanded ? null : routine.id)}
                    className="p-1.5 border border-[#494848] text-[#C1C1C1] hover:text-white"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Analytics strip */}
              <div className="px-4 py-2 bg-[#100E0C] border-b border-[#494848] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#C1C1C1]">
                <div className="flex items-center gap-4">
                  <span>
                    COMPLETION RATE: <strong className="text-white">{analytics.completionRate}%</strong> ({analytics.completed}/{analytics.started} RUNS)
                  </span>
                  <span>
                    TOTAL TIME: <strong className="text-[#FF7A00]">
                      {Math.round(routine.steps.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60)} MINS
                    </strong>
                  </span>
                </div>

                {analytics.chainBreakerStep && (
                  <div className="flex items-center gap-1 text-[#FFB800] bg-[#FFB800]/10 px-2 py-0.5 border border-[#FFB800]/40">
                    <AlertTriangle size={11} />
                    <span>CHAIN BREAKER: {analytics.chainBreakerStep.title} ({analytics.maxFailures} skips)</span>
                  </div>
                )}
              </div>

              {/* Steps Sequence Breakdown */}
              {isExpanded && (
                <div className="p-4 space-y-2.5 bg-[#141210]">
                  <p className="text-[10px] font-mono font-black uppercase text-[#8E8E93] mb-2 tracking-wider">
                    // ATOMIC STACKING SEQUENCE:
                  </p>

                  <div className="space-y-2">
                    {routine.steps.map((step, idx) => {
                      const StepIcon = STEP_ICONS[step.icon] || Compass;
                      const durationMin = Math.round((step.durationSeconds || 60) / 60);

                      return (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 p-2.5 bg-[#1E1D1C] border border-[#494848] text-xs font-mono"
                        >
                          <div className="w-6 h-6 bg-[#100E0C] border border-[#494848] flex items-center justify-center font-bold text-[10px] text-[#FF7A00]">
                            {idx + 1}
                          </div>

                          <div className="p-1.5 border border-[#494848] bg-[#100E0C] text-[#C1C1C1]">
                            <StepIcon size={14} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate">{step.title}</span>
                              <span className="text-[10px] text-[#8E8E93]">({durationMin} min)</span>
                            </div>
                            {step.cue && (
                              <p className="text-[10px] text-[#FFA64D] truncate mt-0.5">
                                {step.cue}
                              </p>
                            )}
                          </div>

                          <span className="text-[9px] text-[#8E8E93] border border-[#494848] px-1.5 py-0.5 uppercase hidden sm:inline">
                            AUTO-TICKS {step.linkedHabitKeyword || 'HABIT'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

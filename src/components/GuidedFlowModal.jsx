import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Check,
  SkipForward,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Droplets,
  Sun,
  Wind,
  CheckSquare,
  MonitorOff,
  BookOpen,
  Book,
  Moon,
  Compass,
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import { triggerNeoConfetti } from '../utils/confetti';
import { recordStepFailure, recordRoutineCompleted } from '../utils/routinesEngine';

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

export default function GuidedFlowModal({
  isOpen,
  onClose,
  routine = null,
  onStepComplete = () => {}, // (step, habitKeyword) => {}
  onRoutineCompleted = () => {}, // (routine) => {}
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [muted, setMuted] = useState(sounds.isMuted());
  const wakeLockRef = useRef(null);

  const steps = routine?.steps || [];
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const initialDuration = currentStep?.durationSeconds || 60;

  // Request screen wake lock so display doesn't sleep
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.log('[GuidedFlow] Wake Lock unavailable:', err.message);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // Initialize step duration
  useEffect(() => {
    if (currentStep) {
      setSecondsLeft(currentStep.durationSeconds || 60);
      setIsRunning(true);
    }
  }, [currentStepIndex, currentStep]);

  // Wake lock lifecycle
  useEffect(() => {
    if (isOpen) {
      requestWakeLock();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isOpen) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseWakeLock();
      };
    } else {
      releaseWakeLock();
    }
  }, [isOpen, requestWakeLock, releaseWakeLock]);

  // Step countdown timer
  useEffect(() => {
    if (!isOpen || !isRunning || isCompleted) return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          sounds.playCheck();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isRunning, isCompleted]);

  // Advance to next step
  const handleAdvance = useCallback(
    async (skipped = false) => {
      sounds.playCheck();

      if (skipped) {
        if (routine?.id && currentStep?.id) {
          await recordStepFailure(routine.id, currentStep.id);
        }
      } else {
        // Complete current step and auto-tick linked habit
        onStepComplete(currentStep, currentStep?.linkedHabitKeyword);
      }

      if (currentStepIndex + 1 < totalSteps) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        // Full routine complete
        setIsCompleted(true);
        setIsRunning(false);
        triggerNeoConfetti(3500);
        sounds.playVictory();
        if (routine?.id) {
          await recordRoutineCompleted(routine.id);
        }
        onRoutineCompleted(routine);
      }
    },
    [currentStepIndex, totalSteps, routine, currentStep, onStepComplete, onRoutineCompleted]
  );

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      // Avoid interference if typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (isCompleted) {
          onClose();
        } else {
          handleAdvance(false);
        }
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        if (!isCompleted) handleAdvance(true);
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        setIsRunning((r) => !r);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setSecondsLeft((s) => s + 60);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCompleted, handleAdvance, onClose]);

  if (!isOpen || !routine) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPct =
    initialDuration > 0
      ? Math.max(0, Math.min(100, Math.round(((initialDuration - secondsLeft) / initialDuration) * 100)))
      : 100;

  const StepIcon = currentStep ? STEP_ICONS[currentStep.icon] || Compass : Compass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#100E0C] text-white overflow-hidden select-none animate-in fade-in">
      {/* Neo-Brutalist Frame */}
      <div className="w-full max-w-2xl bg-[#1E1D1C] border-4 border-[#FF7A00] p-6 sm:p-8 flex flex-col justify-between shadow-[8px_8px_0px_#000000] relative min-h-[580px]">
        {/* Top Controls Bar */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#494848]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-black bg-[#FF7A00] px-2 py-0.5 border border-black uppercase tracking-wider">
              GUIDED FLOW
            </span>
            <span className="text-xs font-mono text-[#C1C1C1] uppercase tracking-wider hidden sm:inline">
              // {routine.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const isMuted = sounds.toggleMute();
                setMuted(isMuted);
              }}
              className="p-1.5 border border-[#494848] text-[#C1C1C1] hover:text-[#FF7A00] hover:border-[#FF7A00] transition-all"
              title="Toggle audio"
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 border border-[#494848] text-[#C1C1C1] hover:text-[#FF4444] hover:border-[#FF4444] transition-all"
              title="Exit Guided Flow (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!isCompleted ? (
          <div className="my-auto py-6 flex flex-col items-center text-center">
            {/* Step Counter Badge */}
            <div className="inline-block px-3 py-1 bg-[#100E0C] border-2 border-[#494848] text-[#FF7A00] font-mono font-black text-xs uppercase mb-5 shadow-[2px_2px_0px_#000]">
              STEP {currentStepIndex + 1} OF {totalSteps}
            </div>

            {/* Circular Timer Progress Ring */}
            <div className="relative w-44 h-44 mb-6 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#100E0C"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#FF7A00"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progressPct) / 100}
                  strokeLinecap="square"
                  className="transition-all duration-300 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-black tracking-tight text-white tabular-nums">
                  {timeFormatted}
                </span>
                <span className="text-[10px] font-mono text-[#C1C1C1] uppercase mt-0.5">
                  {isRunning ? 'FLOWING' : 'PAUSED'}
                </span>
              </div>
            </div>

            {/* Step Title & Icon */}
            <div className="flex items-center gap-2.5 justify-center mb-2">
              <div className="p-2 bg-[#FF7A00] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
                <StepIcon size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-mono uppercase text-white tracking-wide">
                {currentStep?.title}
              </h3>
            </div>

            {/* Atomic Habits Cue */}
            {currentStep?.cue && (
              <div className="max-w-md bg-[#100E0C] border-2 border-[#494848] p-3 shadow-[3px_3px_0px_#000] text-xs font-mono text-[#FFA64D] mt-3">
                <span className="text-white font-bold">// CUE: </span>
                {currentStep.cue}
              </div>
            )}
          </div>
        ) : (
          /* Completion State */
          <div className="my-auto py-8 text-center flex flex-col items-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#FF7A00] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_#000] mb-4">
              <Sparkles size={32} className="text-black" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black font-mono uppercase text-white tracking-wide mb-2">
              ROUTINE COMPLETE!
            </h3>
            <p className="text-xs font-mono text-[#FFA64D] font-bold uppercase mb-4">
              +100 BONUS XP AWARDED · DISCIPLINE CHAIN PRESERVED
            </p>
            <p className="text-xs font-mono text-[#C1C1C1] max-w-sm mb-6">
              All linked habits have been checked off in your daily checklist. Your compound progress continues.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#FF7A00] text-black font-mono font-black text-xs uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_#000] hover:bg-[#FFA64D] transition-all"
            >
              FINISH & RETURN (SPACE / ENTER)
            </button>
          </div>
        )}

        {/* Bottom Control Buttons */}
        {!isCompleted && (
          <div className="pt-4 border-t-2 border-[#494848] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning((r) => !r)}
                className="px-3.5 py-2 bg-[#100E0C] border-2 border-[#494848] hover:border-white text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
                title="Pause / Resume (P)"
              >
                {isRunning ? <Pause size={13} /> : <Play size={13} />}
                <span>{isRunning ? 'PAUSE' : 'RESUME'}</span>
              </button>

              <button
                onClick={() => setSecondsLeft((s) => s + 60)}
                className="px-3 py-2 bg-[#100E0C] border-2 border-[#494848] hover:border-white text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 shadow-[2px_2px_0px_#000]"
                title="Add 1 Minute (+)"
              >
                <Plus size={13} />
                <span>+1 MIN</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => handleAdvance(true)}
                className="px-3.5 py-2 bg-[#100E0C] border-2 border-[#494848] hover:border-[#FF4444] text-[#C1C1C1] hover:text-[#FF4444] text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
                title="Skip step (S)"
              >
                <SkipForward size={13} />
                <span>SKIP</span>
              </button>

              <button
                onClick={() => handleAdvance(false)}
                className="px-5 py-2 bg-[#FF7A00] hover:bg-[#FFA64D] text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-black flex items-center gap-2 shadow-[3px_3px_0px_#000] active:translate-x-px active:translate-y-px transition-all"
                title="Mark Done (Space / Enter)"
              >
                <Check size={15} strokeWidth={3} />
                <span>DONE</span>
              </button>
            </div>
          </div>
        )}

        {/* Keyboard hints footer */}
        <div className="mt-2 text-center text-[9px] font-mono text-[#8E8E93]">
          [SPACE/ENTER] DONE · [S] SKIP · [P] PAUSE · [+] +1 MIN · [ESC] EXIT · WAKE LOCK: ACTIVE
        </div>
      </div>
    </div>
  );
}

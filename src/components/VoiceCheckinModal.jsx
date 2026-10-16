import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, RotateCcw, Check, AlertCircle, Play } from 'lucide-react';
import {
  isSpeechRecognitionSupported,
  parseVoiceCommand,
  speakDailyBriefing,
  stopSpeaking
} from '../utils/voiceRecognition';
import { soundEffects } from '../utils/soundEffects';

export default function VoiceCheckinModal({
  isOpen,
  onClose,
  habits = [],
  xp = 0,
  streak = 0,
  onToggleHabit,
  onAddTask,
  onStartFocusTimer
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('hi-IN'); // 'hi-IN' or 'en-US'
  const [recognizedAction, setRecognizedAction] = useState(null);
  const [undoTimer, setUndoTimer] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSpeakingPlan, setIsSpeakingPlan] = useState(false);

  const recognitionRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      stopSpeaking();
    };
  }, []);

  const handleStartListening = () => {
    if (!supported) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setStatusMessage('Listening... Speak a command');
    };

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);

      const parsed = parseVoiceCommand(speechResult, habits);
      setRecognizedAction(parsed);

      if (parsed.type === 'UNKNOWN') {
        setStatusMessage(`Could not recognize command from: "${speechResult}"`);
      } else {
        // Start 5 second countdown before auto-applying
        startUndoCountdown(parsed);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      setStatusMessage(`Error: ${event.error}. Please try again.`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const startUndoCountdown = (action) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setUndoTimer(5);

    countdownIntervalRef.current = setInterval(() => {
      setUndoTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          executeAction(action);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeAction = (action) => {
    if (!action) return;
    if (action.type === 'MARK_COMPLETED' && action.habit) {
      onToggleHabit(action.habit._id, true);
      soundEffects.playHabitCheck();
      setStatusMessage(`Marked "${action.habit.title || action.habit.name}" completed!`);
    } else if (action.type === 'ADD_TASK' && action.taskName) {
      onAddTask(action.taskName);
      soundEffects.playVictoryFanfare();
      setStatusMessage(`Added new task "${action.taskName}"!`);
    } else if (action.type === 'START_TIMER') {
      if (onStartFocusTimer) onStartFocusTimer();
      setStatusMessage('Focus timer started!');
    }
    setRecognizedAction(null);
  };

  const handleCancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setUndoTimer(0);
    setRecognizedAction(null);
    setStatusMessage('Action canceled.');
  };

  const handleReadPlan = () => {
    setIsSpeakingPlan(true);
    speakDailyBriefing(habits, xp, streak, language === 'hi-IN');
    setTimeout(() => setIsSpeakingPlan(false), 8000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#100E0C] border-2 border-[#494848] shadow-[6px_6px_0px_#000000] text-stone-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#494848] bg-[#1E1D1C]">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-[#FF7A00] bg-[#FF7A00]/20 text-[#FF7A00]">
              <Mic size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Voice Check-in & Audio Briefing</h2>
              <p className="text-xs text-stone-400">Web Speech API • English & Hindi / Hinglish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-stone-600 bg-stone-800 hover:bg-stone-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!supported ? (
            <div className="p-4 bg-rose-950/40 border-2 border-rose-600 text-xs text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-200">
                <AlertCircle size={16} /> Web Speech API Not Supported
              </div>
              <p>
                Your current browser does not support the SpeechRecognition API. For voice check-ins, please use Google Chrome or Microsoft Edge.
              </p>
            </div>
          ) : (
            <>
              {/* Language Selector */}
              <div className="flex items-center justify-between p-3 bg-[#1E1D1C] border-2 border-[#494848]">
                <span className="text-xs font-bold uppercase text-stone-400">Language:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage('hi-IN')}
                    className={`px-3 py-1 text-xs font-black uppercase border transition ${
                      language === 'hi-IN'
                        ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                        : 'border-stone-700 bg-stone-900 text-stone-300'
                    }`}
                  >
                    Hindi / Hinglish
                  </button>
                  <button
                    onClick={() => setLanguage('en-US')}
                    className={`px-3 py-1 text-xs font-black uppercase border transition ${
                      language === 'en-US'
                        ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                        : 'border-stone-700 bg-stone-900 text-stone-300'
                    }`}
                  >
                    English (US)
                  </button>
                </div>
              </div>

              {/* Main Mic Trigger */}
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <button
                  onClick={isListening ? handleStopListening : handleStartListening}
                  className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-transform active:scale-95 shadow-[4px_4px_0px_#000] ${
                    isListening
                      ? 'bg-rose-500 border-white text-white animate-pulse'
                      : 'bg-[#FF7A00] border-black text-black hover:bg-[#ff8f26]'
                  }`}
                >
                  {isListening ? <MicOff size={36} /> : <Mic size={36} />}
                </button>
                <div className="text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                    {isListening ? 'Listening... Tap to stop' : 'Tap Mic and Speak'}
                  </span>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Try: &quot;Gym ho gaya&quot; • &quot;Mark deep work as completed&quot; • &quot;Add task Buy milk&quot;
                  </p>
                </div>
              </div>

              {/* Transcript & Status */}
              {transcript && (
                <div className="p-3 bg-stone-900 border-2 border-stone-700 text-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                    Spoken Transcript:
                  </span>
                  <p className="font-mono text-white italic">&quot;{transcript}&quot;</p>
                </div>
              )}

              {/* Action Confirmation with 5s Undo Countdown */}
              {recognizedAction && undoTimer > 0 && (
                <div className="p-4 bg-amber-950/40 border-2 border-[#FF7A00] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-black text-[#FF7A00]">
                        Action Confirmed ({undoTimer}s)
                      </span>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {recognizedAction.message}
                      </p>
                    </div>
                    <button
                      onClick={handleCancelCountdown}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs uppercase border border-black hover:bg-rose-500 flex items-center gap-1 shadow-[2px_2px_0px_#000]"
                    >
                      <RotateCcw size={12} /> Undo
                    </button>
                  </div>
                  <div className="w-full bg-stone-900 h-1.5 overflow-hidden">
                    <div
                      style={{ width: `${(undoTimer / 5) * 100}%` }}
                      className="h-full bg-[#FF7A00] transition-all duration-1000 ease-linear"
                    />
                  </div>
                </div>
              )}

              {statusMessage && !undoTimer && (
                <p className="text-xs text-center text-stone-300 font-mono">
                  {statusMessage}
                </p>
              )}
            </>
          )}

          {/* Text-To-Speech Daily Briefing */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                <Volume2 size={16} className="text-[#FF7A00]" /> Read Day&apos;s Plan (TTS)
              </h4>
              <p className="text-[11px] text-stone-400">
                Spoken audio briefing of your remaining habits and streak
              </p>
            </div>
            <button
              onClick={handleReadPlan}
              disabled={isSpeakingPlan}
              className="px-3 py-1.5 bg-stone-800 border-2 border-stone-600 hover:border-[#FF7A00] text-stone-200 text-xs font-bold uppercase transition flex items-center gap-1.5"
            >
              <Play size={12} /> {isSpeakingPlan ? 'Playing...' : 'Play Audio'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t-2 border-[#494848] bg-[#1E1D1C] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-stone-600 bg-stone-800 hover:bg-stone-700 text-xs font-bold uppercase transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

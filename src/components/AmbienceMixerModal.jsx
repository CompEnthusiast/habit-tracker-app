import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Volume2, Headphones, AlertTriangle, Clock, Timer, RotateCcw } from 'lucide-react';
import { ambienceEngine } from '../utils/ambienceAudio';
import { soundEffects } from '../utils/soundEffects';

export default function AmbienceMixerModal({
  isOpen,
  onClose,
  habits = [],
  onPomodoroSessionComplete
}) {
  const [isPlaying, setIsPlaying] = useState(ambienceEngine.isPlaying);
  const [volumes, setVolumes] = useState({ ...ambienceEngine.volumes });
  const [binauralMode, setBinauralMode] = useState(ambienceEngine.binauralMode);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);

  // Pomodoro State
  const [pomoWorkDuration, setPomoWorkDuration] = useState(25); // mins
  const [pomoBreakDuration, setPomoBreakDuration] = useState(5); // mins
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoMode, setPomoMode] = useState('work'); // 'work' | 'break'
  const [selectedHabitId, setSelectedHabitId] = useState('');

  // Keep volumes synchronized
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(ambienceEngine.isPlaying);
      setVolumes({ ...ambienceEngine.volumes });
      setBinauralMode(ambienceEngine.binauralMode);
    }
  }, [isOpen]);

  // Pomodoro timer ticker
  useEffect(() => {
    let interval = null;
    if (pomoRunning && pomoSecondsLeft > 0) {
      interval = setInterval(() => {
        setPomoSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (pomoRunning && pomoSecondsLeft === 0) {
      // Completed session
      soundEffects.playVictoryFanfare();
      if (pomoMode === 'work') {
        if (onPomodoroSessionComplete && selectedHabitId) {
          onPomodoroSessionComplete(selectedHabitId, pomoWorkDuration);
        }
        setPomoMode('break');
        setPomoSecondsLeft(pomoBreakDuration * 60);
      } else {
        setPomoMode('work');
        setPomoSecondsLeft(pomoWorkDuration * 60);
      }
      setPomoRunning(false);
    }
    return () => clearInterval(interval);
  }, [pomoRunning, pomoSecondsLeft, pomoMode, pomoWorkDuration, pomoBreakDuration, selectedHabitId, onPomodoroSessionComplete]);

  // Sleep timer subscription
  const handleSetSleepTimer = (mins) => {
    setSleepMinutes(mins);
    ambienceEngine.setSleepTimer(mins, (remaining) => {
      setSleepRemaining(remaining);
      if (remaining <= 0) {
        setIsPlaying(false);
      }
    });
  };

  const handleTogglePlay = () => {
    const nextState = ambienceEngine.togglePlay();
    setIsPlaying(nextState);
  };

  const handleVolumeChange = (trackId, val) => {
    const num = parseFloat(val);
    ambienceEngine.setVolume(trackId, num);
    setVolumes({ ...ambienceEngine.volumes, [trackId]: num });
  };

  const handleBinauralModeChange = (mode) => {
    setBinauralMode(mode);
    ambienceEngine.setBinauralMode(mode);
  };

  const handleResetPomodoro = () => {
    setPomoRunning(false);
    setPomoSecondsLeft((pomoMode === 'work' ? pomoWorkDuration : pomoBreakDuration) * 60);
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#100E0C] border-2 border-[#494848] shadow-[6px_6px_0px_#000000] text-stone-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#494848] bg-[#1E1D1C]">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-[#FF7A00] bg-[#FF7A00]/20 text-[#FF7A00]">
              <Headphones size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Focus Ambience & Pomodoro</h2>
              <p className="text-xs text-stone-400">Pure Web Audio Synthesizer • No Copyrighted Media</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Control Bar: Master Play/Pause & Sleep Timer */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={handleTogglePlay}
              className={`px-5 py-2.5 font-black uppercase tracking-wider border-2 border-black flex items-center gap-2 text-sm shadow-[3px_3px_0px_#000] transition ${
                isPlaying
                  ? 'bg-amber-400 text-black hover:bg-amber-300'
                  : 'bg-[#FF7A00] text-black hover:bg-[#ff8f26]'
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? 'Pause All Audio' : 'Start Focus Sound'}
            </button>

            {/* Sleep Timer */}
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-stone-400" />
              <span className="text-xs text-stone-400 font-bold uppercase">Sleep Timer:</span>
              {[0, 15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleSetSleepTimer(mins)}
                  className={`px-2 py-1 text-xs font-bold border transition ${
                    sleepMinutes === mins
                      ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                      : 'border-stone-700 bg-stone-900 text-stone-300'
                  }`}
                >
                  {mins === 0 ? 'Off' : `${mins}m`}
                </button>
              ))}
              {sleepRemaining > 0 && (
                <span className="text-xs font-mono text-[#FF7A00]">
                  ({formatTimer(sleepRemaining)})
                </span>
              )}
            </div>
          </div>

          {/* Pomodoro Timer linked to Habit */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-[#FF7A00] tracking-wider flex items-center gap-2">
                <Timer size={16} /> Pomodoro Focus Session ({pomoMode.toUpperCase()})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPomoMode('work');
                    setPomoRunning(false);
                    setPomoSecondsLeft(pomoWorkDuration * 60);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                    pomoMode === 'work' ? 'border-[#FF7A00] bg-[#FF7A00] text-black' : 'border-stone-700 text-stone-400'
                  }`}
                >
                  Work (25m)
                </button>
                <button
                  onClick={() => {
                    setPomoMode('break');
                    setPomoRunning(false);
                    setPomoSecondsLeft(pomoBreakDuration * 60);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                    pomoMode === 'break' ? 'border-[#FF7A00] bg-[#FF7A00] text-black' : 'border-stone-700 text-stone-400'
                  }`}
                >
                  Break (5m)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-[11px] uppercase font-bold text-stone-400 mb-1">
                  Track time for habit:
                </label>
                <select
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border-2 border-stone-700 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                >
                  <option value="">-- General Focus (No specific habit) --</option>
                  {habits.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.title || h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-3xl font-black font-mono tracking-wider text-white">
                  {formatTimer(pomoSecondsLeft)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPomoRunning(!pomoRunning)}
                    className={`px-4 py-2 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000] transition ${
                      pomoRunning
                        ? 'bg-rose-500 text-black hover:bg-rose-400'
                        : 'bg-emerald-500 text-black hover:bg-emerald-400'
                    }`}
                  >
                    {pomoRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={handleResetPomodoro}
                    className="p-2 border-2 border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-400"
                    title="Reset Timer"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sound Mixer Channels */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Volume2 size={16} className="text-[#FF7A00]" /> Multi-Channel Ambience Mixer
            </h3>

            <div className="space-y-4">
              {/* Rain */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-300">🌧️ Heavy Rain & Droplets</span>
                  <span className="font-mono text-[#FF7A00]">{Math.round((volumes.rain || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumes.rain || 0}
                  onChange={(e) => handleVolumeChange('rain', e.target.value)}
                  className="w-full accent-[#FF7A00] cursor-pointer"
                />
              </div>

              {/* Brown Noise */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-300">🌊 Deep Brown Noise (Low Rumble)</span>
                  <span className="font-mono text-[#FF7A00]">{Math.round((volumes.brownNoise || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumes.brownNoise || 0}
                  onChange={(e) => handleVolumeChange('brownNoise', e.target.value)}
                  className="w-full accent-[#FF7A00] cursor-pointer"
                />
              </div>

              {/* White Noise */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-300">📻 Pure White Noise</span>
                  <span className="font-mono text-[#FF7A00]">{Math.round((volumes.whiteNoise || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumes.whiteNoise || 0}
                  onChange={(e) => handleVolumeChange('whiteNoise', e.target.value)}
                  className="w-full accent-[#FF7A00] cursor-pointer"
                />
              </div>

              {/* Lo-Fi Chill */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-300">☕ Warm Lo-Fi Chords & Vinyl Drift</span>
                  <span className="font-mono text-[#FF7A00]">{Math.round((volumes.lofi || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumes.lofi || 0}
                  onChange={(e) => handleVolumeChange('lofi', e.target.value)}
                  className="w-full accent-[#FF7A00] cursor-pointer"
                />
              </div>

              {/* Binaural Beats */}
              <div className="space-y-2 pt-2 border-t border-stone-800">
                <div className="flex justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-300">🧠 Binaural Beats</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 bg-stone-800 border border-stone-700 text-[#FF7A00]">
                      Stereo Panned
                    </span>
                  </div>
                  <span className="font-mono text-[#FF7A00]">{Math.round((volumes.binaural || 0) * 100)}%</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleBinauralModeChange('alpha')}
                    className={`px-3 py-1 text-xs font-bold border transition ${
                      binauralMode === 'alpha'
                        ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                        : 'border-stone-700 bg-stone-900 text-stone-300'
                    }`}
                  >
                    Alpha (10Hz Calm Focus)
                  </button>
                  <button
                    onClick={() => handleBinauralModeChange('theta')}
                    className={`px-3 py-1 text-xs font-bold border transition ${
                      binauralMode === 'theta'
                        ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                        : 'border-stone-700 bg-stone-900 text-stone-300'
                    }`}
                  >
                    Theta (6Hz Deep Flow)
                  </button>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volumes.binaural || 0}
                  onChange={(e) => handleVolumeChange('binaural', e.target.value)}
                  className="w-full accent-[#FF7A00] cursor-pointer"
                />

                {/* Binaural Beats Safety Advisory */}
                <div className="p-2.5 bg-amber-950/30 border border-amber-800/80 text-[11px] text-amber-200/90 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong>Headphones Advisory:</strong> Stereo separation is required for binaural wave interference. If you have a history of seizures or epilepsy, consult a medical professional before using auditory frequency entrainment.
                  </div>
                </div>
              </div>
            </div>
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

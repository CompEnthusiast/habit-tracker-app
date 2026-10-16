import React, { useState, useEffect } from 'react';
import { X, Smile, Zap, Calendar, TrendingUp, AlertCircle, Save, Check } from 'lucide-react';
import {
  MOOD_LEVELS,
  computeHabitMoodCorrelations,
  getMoodHeatmap,
  getWeeklyMoodTrend,
  CORRELATION_DISCLAIMER
} from '../utils/moodCorrelation';
import { soundEffects } from '../utils/soundEffects';

export default function MoodTrackerModal({
  isOpen,
  onClose,
  currentDateKey,
  currentDayRecord,
  allDayRecords = [],
  habits = [],
  onSaveMood
}) {
  const [selectedScore, setSelectedScore] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [note, setNote] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [correlationData, setCorrelationData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (currentDayRecord && currentDayRecord.mood) {
        setSelectedScore(currentDayRecord.mood.score || 3);
        setEnergyLevel(currentDayRecord.mood.energy || 3);
        setNote(currentDayRecord.mood.note || '');
      } else {
        setSelectedScore(3);
        setEnergyLevel(3);
        setNote('');
      }
      setSavedSuccess(false);

      // Compute correlation with all day records
      const correlations = computeHabitMoodCorrelations(allDayRecords, habits);
      setCorrelationData(correlations);
    }
  }, [isOpen, currentDayRecord, allDayRecords, habits]);

  if (!isOpen) return null;

  const handleSave = () => {
    const moodPayload = {
      score: selectedScore,
      energy: energyLevel,
      note: note.trim(),
      updatedAt: new Date().toISOString()
    };
    if (onSaveMood) {
      onSaveMood(moodPayload);
      soundEffects.playVictoryFanfare();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const heatmap = getMoodHeatmap(allDayRecords, 28);
  const weeklyTrend = getWeeklyMoodTrend(allDayRecords);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#100E0C] border-2 border-[#494848] shadow-[6px_6px_0px_#000000] text-stone-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#494848] bg-[#1E1D1C]">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-[#FF7A00] bg-[#FF7A00]/20 text-[#FF7A00]">
              <Smile size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Mood Tracker & Correlation Engine</h2>
              <p className="text-xs text-stone-400">Date: {currentDateKey} • Energy & Behavioral Analytics</p>
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
          {/* Daily Entry Form */}
          <div className="p-5 bg-[#1E1D1C] border-2 border-[#494848] space-y-4">
            <h3 className="text-xs font-black uppercase text-stone-300 tracking-wider">
              How are you feeling today?
            </h3>

            {/* 1-5 Mood Emojis */}
            <div className="grid grid-cols-5 gap-2">
              {MOOD_LEVELS.map((lvl) => {
                const isSelected = selectedScore === lvl.score;
                return (
                  <button
                    key={lvl.score}
                    type="button"
                    onClick={() => setSelectedScore(lvl.score)}
                    className={`p-3 border-2 flex flex-col items-center justify-center gap-1 transition ${
                      isSelected
                        ? 'border-[#FF7A00] bg-[#FF7A00]/20 shadow-[3px_3px_0px_#000] scale-105'
                        : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                    }`}
                  >
                    <span className="text-2xl">{lvl.emoji}</span>
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-[#FF7A00]' : 'text-stone-400'}`}>
                      {lvl.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Energy Slider */}
            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-stone-400 flex items-center gap-1">
                  <Zap size={14} className="text-amber-400" /> Energy Level:
                </span>
                <span className="text-white font-mono">{energyLevel} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(parseInt(e.target.value, 10))}
                className="w-full accent-[#FF7A00] cursor-pointer"
              />
            </div>

            {/* Optional Reflection Note */}
            <div>
              <label className="block text-xs font-bold text-stone-400 mb-1">
                Reflection Note (Optional):
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What factors influenced your energy and discipline today?"
                rows={2}
                className="w-full px-3 py-2 bg-stone-900 border-2 border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-[#FF7A00]"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              {savedSuccess ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Check size={14} /> Mood logged successfully!
                </span>
              ) : <div />}
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#FF7A00] text-black font-black text-xs uppercase tracking-wider border-2 border-black hover:bg-[#ff8f26] transition flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
              >
                <Save size={14} /> Save Today&apos;s Mood
              </button>
            </div>
          </div>

          {/* 28-Day Mood Heatmap */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Calendar size={15} className="text-[#FF7A00]" /> 28-Day Mood Calendar
            </h3>
            <div className="grid grid-cols-7 gap-1.5">
              {heatmap.map((cell) => (
                <div
                  key={cell.dateKey}
                  title={`${cell.dateKey}: ${cell.emoji || 'No entry'}`}
                  className={`h-11 border flex flex-col items-center justify-center p-1 transition ${
                    cell.dateKey === currentDateKey
                      ? 'border-[#FF7A00] bg-stone-800'
                      : 'border-stone-800 bg-stone-900/80'
                  }`}
                >
                  <span className="text-[9px] text-stone-500">{cell.dayNumber}</span>
                  <span className="text-sm">{cell.emoji || '·'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Trend Line Preview */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-2">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <TrendingUp size={15} className="text-[#FF7A00]" /> 7-Day Trend (Mood & Energy)
            </h3>
            <div className="grid grid-cols-7 gap-2 text-center pt-2">
              {weeklyTrend.map((t) => (
                <div key={t.date} className="p-2 bg-stone-900 border border-stone-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">{t.day}</span>
                  <span className="text-xs font-black text-[#FF7A00] block">
                    {t.mood ? `${t.mood}/5` : '—'}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    ⚡ {t.energy ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Habit vs Mood Correlation Section */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-white tracking-wider">
                Habit Correlation Analysis
              </h3>
              <span className="text-[10px] font-mono text-stone-400">
                Sample: {correlationData?.totalLoggedDays ?? 0} days
              </span>
            </div>

            {!correlationData?.sufficientData ? (
              <div className="p-4 bg-stone-900 border border-stone-700 text-xs text-stone-400 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <AlertCircle size={16} /> Minimum 14 Days Sample Required
                </div>
                <p>
                  {correlationData?.message ||
                    'At least 14 days of logged mood entries are required to calculate statistically meaningful habit correlations.'}
                </p>
                <div className="w-full bg-stone-800 h-2 mt-2">
                  <div
                    style={{
                      width: `${Math.min(100, ((correlationData?.totalLoggedDays || 0) / 14) * 100)}%`
                    }}
                    className="h-full bg-[#FF7A00]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {correlationData.correlations.slice(0, 5).map((c) => (
                    <div
                      key={c.habitId}
                      className="p-3 bg-stone-900 border border-stone-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{c.habitName}</span>
                        <span className="text-[10px] text-stone-400">
                          Avg Done: <strong className="text-emerald-400">{c.avgMoodDone}</strong> ({c.daysDone}d) vs Not Done: <strong className="text-rose-400">{c.avgMoodNotDone}</strong> ({c.daysNotDone}d)
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-black font-mono text-sm ${
                            c.difference > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {c.difference > 0 ? `+${c.difference}` : c.difference} pts
                        </span>
                        <span className="text-[10px] block text-stone-500">avg mood diff</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mandatory Causation Disclaimer */}
            <div className="p-2.5 bg-stone-950 border border-stone-800 text-[11px] text-stone-500 leading-relaxed italic">
              {CORRELATION_DISCLAIMER}
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

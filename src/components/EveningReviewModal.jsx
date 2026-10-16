import React, { useState, useEffect } from 'react';
import { X, Moon, Sparkles, Check, Save } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export default function EveningReviewModal({
  isOpen,
  onClose,
  currentDateKey,
  currentDayRecord = null,
  onSaveReflection
}) {
  const [wentWell, setWentWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen && currentDayRecord?.reflection) {
      setWentWell(currentDayRecord.reflection.wentWell || '');
      setToImprove(currentDayRecord.reflection.toImprove || '');
    } else if (isOpen) {
      setWentWell('');
      setToImprove('');
    }
    setSaved(false);
  }, [isOpen, currentDayRecord]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSaveReflection) {
      onSaveReflection({
        wentWell: wentWell.trim(),
        toImprove: toImprove.trim(),
        savedAt: new Date().toISOString()
      });
      soundEffects.playVictoryFanfare();
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#100E0C] border-2 border-[#494848] shadow-[6px_6px_0px_#000000] text-stone-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#494848] bg-[#1E1D1C]">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-indigo-400 bg-indigo-500/20 text-indigo-400">
              <Moon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Evening Reflection</h2>
              <p className="text-xs text-stone-400">Date: {currentDateKey} • Close Out the Day (+25 XP)</p>
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
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-stone-300 mb-1">
              1. What went well today? (Celebrate your wins)
            </label>
            <textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="e.g. Stuck to my morning workout, finished deep work block without distractions..."
              rows={3}
              className="w-full px-3 py-2 bg-stone-900 border-2 border-stone-700 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-stone-300 mb-1">
              2. What can you improve tomorrow?
            </label>
            <textarea
              value={toImprove}
              onChange={(e) => setToImprove(e.target.value)}
              placeholder="e.g. Prepare workout clothes tonight, reduce phone screen time after 10 PM..."
              rows={3}
              className="w-full px-3 py-2 bg-stone-900 border-2 border-stone-700 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
            />
          </div>

          {saved && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-600 text-xs text-emerald-300 flex items-center gap-2">
              <Check size={16} /> Reflection saved! +25 XP awarded.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t-2 border-[#494848] bg-[#1E1D1C] flex items-center justify-between">
          <span className="text-[11px] text-stone-400 flex items-center gap-1">
            <Sparkles size={12} className="text-[#FF7A00]" /> Daily reflection builds lasting metacognition
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 border-2 border-stone-700 bg-stone-900 text-xs font-bold uppercase"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#FF7A00] text-black font-black text-xs uppercase border-2 border-black hover:bg-[#ff8f26] flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
            >
              <Save size={14} /> Save Reflection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

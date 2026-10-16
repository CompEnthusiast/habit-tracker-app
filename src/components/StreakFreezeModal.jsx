import { useState } from 'react';
import { Shield, AlertCircle, X, Check, Clock, Calendar } from 'lucide-react';
import { applyStreakFreeze } from '../utils/gamification';
import { sounds } from '../utils/soundEffects';

export default function StreakFreezeModal({
  isOpen,
  onClose,
  freezeTokensAvailable = 2,
  suggestedDateKey = null, // e.g. "2026-10-15"
  onFreezeApplied = () => {},
  freezeLog = [],
}) {
  const [selectedDateKey, setSelectedDateKey] = useState(
    suggestedDateKey ||
      new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  );
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleApply = async () => {
    setError('');
    setSuccessMsg('');
    setIsApplying(true);

    try {
      const res = await applyStreakFreeze(selectedDateKey);
      if (res.success) {
        sounds.playShield();
        setSuccessMsg(`Day ${selectedDateKey} successfully protected with Streak Freeze!`);
        onFreezeApplied(selectedDateKey, res.remainingTokens);
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        setError(res.reason || 'Failed to apply streak freeze.');
      }
    } catch (err) {
      setError(err.message || 'Error applying streak freeze.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1E1D1C] border-2 border-[#FF7A00] p-6 text-white shadow-[6px_6px_0px_#FF7A00] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#494848] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF7A00] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Shield size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-base font-black font-mono uppercase tracking-widest text-white">
                STREAK FREEZE SHIELD
              </h2>
              <p className="text-[10px] font-mono text-[#FF7A00] uppercase tracking-wider">
                // ANTI-ABUSE MOMENTUM PROTECTION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#494848] hover:border-[#FF7A00] hover:text-[#FF7A00] text-[#C1C1C1] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tokens Status Card */}
        <div className="p-4 bg-[#100E0C] border-2 border-[#494848] shadow-[3px_3px_0px_#000000] mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-[#C1C1C1] uppercase">AVAILABLE TOKENS</p>
            <p className="text-xl font-mono font-black text-white mt-0.5">
              <span className="text-[#FF7A00]">{freezeTokensAvailable}</span> / 2 TOKENS
            </p>
            <p className="text-[9px] font-mono text-[#8E8E93] mt-1">
              Resets to 2 on the 1st of each month. (Does not stack)
            </p>
          </div>
          <div className="flex gap-1.5">
            {[1, 2].map((tokenIdx) => (
              <div
                key={tokenIdx}
                className={`w-9 h-11 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] ${
                  tokenIdx <= freezeTokensAvailable
                    ? 'bg-[#FF7A00] text-black'
                    : 'bg-[#1E1D1C] text-[#494848] border-[#494848]'
                }`}
              >
                <Shield size={16} />
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Freeze Alert */}
        {suggestedDateKey && (
          <div className="p-3 bg-[#FFB800]/10 border-2 border-[#FFB800] text-[#FFB800] text-xs font-mono mb-4 flex items-start gap-2 shadow-[2px_2px_0px_#000]">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-black uppercase">STREAK IN DANGER!</p>
              <p className="text-[11px] text-white mt-0.5">
                No check-ins logged for <strong className="text-[#FFB800]">{suggestedDateKey}</strong>. Use 1 Freeze token to protect your active streak.
              </p>
            </div>
          </div>
        )}

        {/* Date Selector */}
        <div className="space-y-2 mb-5">
          <label className="block text-xs font-mono font-bold text-[#C1C1C1] uppercase">
            TARGET MISSED DAY (WITHIN 48 HOURS)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDateKey}
              onChange={(e) => setSelectedDateKey(e.target.value)}
              className="flex-1 bg-[#100E0C] border-2 border-[#494848] text-white p-2 text-xs font-mono focus:border-[#FF7A00] outline-none shadow-[2px_2px_0px_#000]"
            />
          </div>
          <p className="text-[9px] font-mono text-[#8E8E93]">
            Rule: Freezes must be applied within 48h. Frozen days maintain streak continuity but do not award XP.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-[#FF4444]/15 border border-[#FF4444] text-[#FF4444] text-xs font-mono mb-4">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-[#34D399]/15 border border-[#34D399] text-[#34D399] text-xs font-mono mb-4 flex items-center gap-2">
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleApply}
          disabled={freezeTokensAvailable <= 0 || isApplying}
          className="w-full py-2.5 bg-[#FF7A00] text-black font-mono font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-[#FFA64D] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isApplying ? 'SHIELDING STREAK…' : 'ACTIVATE STREAK FREEZE'}
        </button>
      </div>
    </div>
  );
}

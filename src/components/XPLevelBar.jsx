import { useState, useEffect } from 'react';
import { Zap, Crown, Award, Sparkles, X, ChevronRight } from 'lucide-react';
import { triggerNeoConfetti } from '../utils/confetti';
import { sounds } from '../utils/soundEffects';

export default function XPLevelBar({
  level = 1,
  currentLevelXP = 0,
  xpForNext = 100,
  totalXP = 0,
  progressPercent = 0,
  title = 'Novice',
  badgeColor = '#C1C1C1',
  floatingXp = null, // { amount: 50, id: 1234 }
  levelUpEvent = null, // { level: 2, title: 'Novice' }
  onDismissLevelUp = () => {},
  onOpenBadges = () => {},
}) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (levelUpEvent) {
      setShowCelebration(true);
      triggerNeoConfetti(3000);
      sounds.playLevelUp();
    }
  }, [levelUpEvent]);

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    onDismissLevelUp();
  };

  return (
    <div className="relative">
      {/* Floating XP indicator animation */}
      {floatingXp && (
        <div
          key={floatingXp.id}
          className={`absolute -top-7 right-6 z-30 font-mono font-black text-xs px-2.5 py-1 border-2 border-black animate-bounce shadow-[2px_2px_0px_#000] select-none pointer-events-none ${
            floatingXp.amount > 0 ? 'bg-[#FF7A00] text-black' : 'bg-[#FF4444] text-white'
          }`}
        >
          {floatingXp.amount > 0 ? `+${floatingXp.amount} XP` : `${floatingXp.amount} XP`}
        </div>
      )}

      {/* Main XP Card */}
      <div className="p-3.5 border-2 border-[#494848] bg-[#1E1D1C] shadow-[4px_4px_0px_#000000] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Level & Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 border-2 border-black flex flex-col items-center justify-center font-mono shrink-0 shadow-[2px_2px_0px_#000]"
            style={{ backgroundColor: badgeColor }}
          >
            <span className="text-[9px] font-black text-black leading-none uppercase">LVL</span>
            <span className="text-base font-black text-black leading-none">{level}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Crown size={13} style={{ color: badgeColor }} />
                {title}
              </span>
              <span className="text-[10px] font-mono text-[#C1C1C1]">
                ({totalXP.toLocaleString()} TOTAL XP)
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#C1C1C1] mt-0.5">
              {currentLevelXP} / {xpForNext} XP to Level {level + 1}
            </p>
          </div>
        </div>

        {/* Center: Progress Bar */}
        <div className="flex-1 max-w-md mx-0 md:mx-4">
          <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-[#C1C1C1]">
            <span>LEVEL PROGRESS</span>
            <span className="font-bold text-[#FF7A00]">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-[#100E0C] border-2 border-[#494848] overflow-hidden shadow-[2px_2px_0px_#000]">
            <div
              className="h-full bg-[#FF7A00] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Badges quick access */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenBadges}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#494848] bg-[#100E0C] text-[#C1C1C1] hover:text-[#FF7A00] hover:border-[#FF7A00] text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0px_#000] active:translate-x-px active:translate-y-px"
          >
            <Award size={13} className="text-[#FF7A00]" />
            <span>BADGES</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Level-Up Celebration Modal */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={handleCloseCelebration}
        >
          <div
            className="w-full max-w-md bg-[#1E1D1C] border-4 border-[#FF7A00] p-6 text-center shadow-[8px_8px_0px_#000000] relative animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FF7A00] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_#000]">
              <Sparkles size={32} className="text-black animate-spin" />
            </div>

            <p className="text-xs font-mono font-black uppercase text-[#FF7A00] tracking-widest mb-1">
              // LEVEL UP ACHIEVED //
            </p>
            <h2 className="text-3xl font-black font-mono text-white uppercase tracking-tight mb-2">
              LEVEL {levelUpEvent?.level || level}
            </h2>
            <div className="inline-block px-3 py-1 bg-[#100E0C] border-2 border-[#494848] text-white font-mono font-black text-xs uppercase mb-4 shadow-[2px_2px_0px_#000]">
              RANK: {levelUpEvent?.title || title}
            </div>

            <p className="text-xs font-mono text-[#C1C1C1] mb-6">
              Your discipline is compounding. New RPG rank unlocks, stamina boosts, and badge privileges unlocked.
            </p>

            <button
              onClick={handleCloseCelebration}
              className="w-full py-2.5 bg-[#FF7A00] text-black font-mono font-black text-xs uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_#000] hover:bg-[#FFA64D] transition-all"
            >
              CONTINUE DISCIPLINE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

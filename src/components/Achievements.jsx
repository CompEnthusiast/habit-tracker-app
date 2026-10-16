import { Award, Flame, Target, Trophy, Sun, Moon, Zap, Shield, ChevronRight } from 'lucide-react';
import { BADGES_CONFIG } from '../data/badgesConfig';

const ICON_MAP = {
  Target,
  Sun,
  Moon,
  Flame,
  Shield,
  Trophy,
  Zap,
  Award,
};

export default function Achievements({
  unlockedBadgeRecords = [],
  onOpenBadgeGallery = () => {},
}) {
  const unlockedIds = new Set(unlockedBadgeRecords.map((b) => b.id));
  const previewBadges = BADGES_CONFIG.slice(0, 6);

  return (
    <section className="rounded-xl border-2 border-[#494848] bg-[#1E1D1C] p-6 shadow-[5px_5px_0px_#000000]">
      <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-[#494848]">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-[#FF7A00]" />
          <h2 className="text-base font-black uppercase text-white tracking-wider font-mono">
            ACHIEVEMENTS
          </h2>
        </div>
        <button
          onClick={onOpenBadgeGallery}
          className="flex items-center gap-1 brutal-badge-orange rounded font-mono text-xs hover:bg-[#FFA64D] transition-all cursor-pointer"
        >
          <span>{unlockedBadgeRecords.length}/{BADGES_CONFIG.length} UNLOCKED</span>
          <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {previewBadges.map((badge) => {
          const unlocked = unlockedIds.has(badge.id);
          const Icon = ICON_MAP[badge.icon] || Award;

          return (
            <div
              key={badge.id}
              onClick={onOpenBadgeGallery}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all cursor-pointer select-none ${
                unlocked
                  ? 'bg-[#FF7A00] text-black border-black shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5'
                  : 'bg-[#100E0C] border-[#494848] text-[#737373] shadow-[2px_2px_0px_#000000] opacity-60 hover:opacity-80'
              }`}
              title={badge.title + ': ' + badge.description}
            >
              <Icon size={18} strokeWidth={2.5} className="mb-1.5" />
              <span className="text-[10px] font-mono font-black uppercase leading-tight truncate w-full">
                {badge.title}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onOpenBadgeGallery}
        className="w-full mt-4 py-2 border-2 border-[#494848] bg-[#100E0C] text-[#C1C1C1] hover:text-[#FF7A00] hover:border-[#FF7A00] text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5"
      >
        <span>OPEN BADGE GALLERY</span>
        <ChevronRight size={13} />
      </button>
    </section>
  );
}

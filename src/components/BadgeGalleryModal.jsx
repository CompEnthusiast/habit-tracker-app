import { useState, useRef } from 'react';
import {
  X,
  Award,
  Download,
  Share2,
  Lock,
  Target,
  Sun,
  Moon,
  Flame,
  Shield,
  CheckCheck,
  Trophy,
  RefreshCw,
  Zap,
  Crown,
  Compass,
  Timer,
  Heart,
  Check,
} from 'lucide-react';
import { BADGES_CONFIG } from '../data/badgesConfig';

const ICON_COMPONENTS = {
  Target,
  Sun,
  Moon,
  Flame,
  Shield,
  CheckCheck,
  Trophy,
  RefreshCw,
  Zap,
  Crown,
  Compass,
  Timer,
  Heart,
  Award,
};

export default function BadgeGalleryModal({
  isOpen,
  onClose,
  unlockedBadgeRecords = [], // [ { id: 'first_blood', unlockedAt: '2026-10-15...' } ]
  totalXP = 0,
  level = 1,
  title = 'Novice',
}) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNLOCKED' | 'LOCKED'
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  const unlockedMap = new Map(unlockedBadgeRecords.map((b) => [b.id, b.unlockedAt]));

  const filteredBadges = BADGES_CONFIG.filter((b) => {
    const isUnlocked = unlockedMap.has(b.id);
    if (filter === 'UNLOCKED') return isUnlocked;
    if (filter === 'LOCKED') return !isUnlocked;
    return true;
  });

  const unlockedCount = unlockedBadgeRecords.length;

  // Generate shareable Neo-Brutalist badge card image on canvas
  const handleShareBadge = (badge) => {
    setIsExportingImage(true);
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // 1. Dark canvas background
    ctx.fillStyle = '#100E0C';
    ctx.fillRect(0, 0, 600, 600);

    // 2. Main card with drop shadow
    ctx.fillStyle = '#000000';
    ctx.fillRect(50, 50, 508, 508);

    ctx.fillStyle = '#1E1D1C';
    ctx.strokeStyle = badge.color || '#FF7A00';
    ctx.lineWidth = 4;
    ctx.fillRect(40, 40, 500, 500);
    ctx.strokeRect(40, 40, 500, 500);

    // 3. Top accent bar
    ctx.fillStyle = badge.color || '#FF7A00';
    ctx.fillRect(40, 40, 500, 16);

    // 4. Header branding
    ctx.fillStyle = '#C1C1C1';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HABIT TRACKER // DISCIPLINE UNLOCKED', 65, 85);

    // 5. Badge Icon box
    ctx.fillStyle = '#000000';
    ctx.fillRect(235, 125, 138, 138);

    ctx.fillStyle = badge.color || '#FF7A00';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.fillRect(230, 120, 140, 140);
    ctx.strokeRect(230, 120, 140, 140);

    // Icon glyph
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★', 300, 210);

    // 6. Badge Title & Rarity
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 30px monospace';
    ctx.fillText(badge.title.toUpperCase(), 300, 310);

    ctx.fillStyle = badge.color || '#FF7A00';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`[ ${badge.rarity.toUpperCase()} · ${badge.category.toUpperCase()} ]`, 300, 345);

    // 7. Description
    ctx.fillStyle = '#C1C1C1';
    ctx.font = '16px monospace';
    ctx.fillText(badge.description, 300, 400);

    // 8. User metadata footer
    const unlockedAt = unlockedMap.get(badge.id) || new Date().toISOString();
    ctx.fillStyle = '#100E0C';
    ctx.fillRect(65, 450, 470, 60);
    ctx.strokeStyle = '#494848';
    ctx.lineWidth = 2;
    ctx.strokeRect(65, 450, 470, 60);

    ctx.fillStyle = '#FF7A00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`OPERATOR: LVL ${level} ${title.toUpperCase()}`, 85, 485);

    ctx.fillStyle = '#C1C1C1';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`DATE: ${unlockedAt.slice(0, 10)}`, 515, 485);

    // Convert to PNG and download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Discipline_Badge_${badge.id}.png`;
    a.click();
    setIsExportingImage(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-[#1E1D1C] border-2 border-[#FF7A00] p-6 text-white shadow-[6px_6px_0px_#FF7A00] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#494848] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF7A00] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Award size={22} className="text-black" />
            </div>
            <div>
              <h2 className="text-lg font-black font-mono uppercase tracking-widest text-white">
                DISCIPLINE BADGES GALLERY
              </h2>
              <p className="text-[10px] font-mono text-[#FF7A00] uppercase tracking-wider">
                // UNLOCKABLE NEO-BRUTALIST HONORS ({unlockedCount} / {BADGES_CONFIG.length} UNLOCKED)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex border-2 border-[#494848] bg-[#100E0C]">
              {['ALL', 'UNLOCKED', 'LOCKED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 text-[10px] font-mono font-black uppercase transition-all ${
                    filter === tab
                      ? 'bg-[#FF7A00] text-black'
                      : 'text-[#C1C1C1] hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 border border-[#494848] hover:border-[#FF7A00] text-[#C1C1C1] hover:text-[#FF7A00] transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="flex-1 overflow-y-auto py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBadges.map((badge) => {
            const isUnlocked = unlockedMap.has(badge.id);
            const unlockedDate = unlockedMap.get(badge.id);
            const IconComponent = ICON_COMPONENTS[badge.icon] || Award;

            return (
              <div
                key={badge.id}
                className={`p-4 border-2 transition-all flex flex-col justify-between relative ${
                  isUnlocked
                    ? 'bg-[#100E0C] border-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5'
                    : 'bg-[#100E0C]/40 border-[#494848] opacity-50 shadow-[2px_2px_0px_#000]'
                }`}
                style={isUnlocked ? { borderColor: badge.color || '#FF7A00' } : {}}
              >
                {/* Rarity & Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[9px] font-mono font-black uppercase px-2 py-0.5 border border-black"
                    style={{
                      backgroundColor: isUnlocked ? badge.color || '#FF7A00' : '#494848',
                      color: '#000000',
                    }}
                  >
                    {badge.rarity}
                  </span>

                  {isUnlocked ? (
                    <span className="text-[9px] font-mono text-[#34D399] font-bold flex items-center gap-1">
                      <Check size={11} strokeWidth={3} /> UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-[#8E8E93] flex items-center gap-1">
                      <Lock size={10} /> LOCKED
                    </span>
                  )}
                </div>

                {/* Badge Icon & Details */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-12 h-12 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] ${
                      isUnlocked ? 'bg-[#FF7A00] text-black' : 'bg-[#1E1D1C] text-[#494848]'
                    }`}
                    style={isUnlocked ? { backgroundColor: badge.color } : {}}
                  >
                    <IconComponent size={22} strokeWidth={2.5} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-mono font-black uppercase text-white truncate">
                      {badge.title}
                    </h3>
                    <p className="text-[10px] font-mono text-[#C1C1C1] mt-1 line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Footer / Share Button */}
                <div className="pt-2.5 border-t border-[#494848] flex items-center justify-between text-[9px] font-mono text-[#8E8E93]">
                  <span>
                    {isUnlocked
                      ? `Achieved: ${unlockedDate ? unlockedDate.slice(0, 10) : 'Recent'}`
                      : badge.category}
                  </span>

                  {isUnlocked && (
                    <button
                      onClick={() => handleShareBadge(badge)}
                      disabled={isExportingImage}
                      className="flex items-center gap-1 px-2 py-1 bg-[#1E1D1C] border border-[#494848] hover:border-[#FF7A00] text-white hover:text-[#FF7A00] transition-all shadow-[1.5px_1.5px_0px_#000] active:translate-x-px active:translate-y-px"
                      title="Share badge as neo-brutalist image"
                    >
                      <Download size={10} />
                      <span>SHARE</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

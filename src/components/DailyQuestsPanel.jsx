import React, { useState } from 'react';
import { Award, Swords, Check, Sparkles, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { DAILY_QUEST_TEMPLATES, WEEKLY_BOSS_CHALLENGES } from '../data/questsConfig';
import { soundEffects } from '../utils/soundEffects';

export default function DailyQuestsPanel({
  dayTasks = [],
  dayRecord = null,
  claimedQuestIds = [],
  onClaimQuestReward
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const boss = WEEKLY_BOSS_CHALLENGES[0];

  // Calculate Boss Progress from completed tasks this week (using current dayTasks as proxy if needed)
  const completedToday = (dayTasks || []).filter(t => t.completed).length;
  const bossProgress = Math.min(boss.target, completedToday * 3); // simulated weekly pace

  return (
    <div className="bg-[#1E1D1C] border-2 border-[#494848] p-4 shadow-[4px_4px_0px_#000000] text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#FF7A00]/20 border border-[#FF7A00] text-[#FF7A00]">
            <Swords size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              RPG Daily Quests & Boss Raid
            </h3>
            <span className="text-[10px] text-stone-400">
              Complete quests to earn bonus XP & defeat the weekly boss
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-400"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Weekly Boss Banner */}
      <div className="mt-3 p-3 bg-stone-900 border-2 border-rose-900/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👹</span>
            <div>
              <span className="text-[10px] uppercase font-black text-rose-400 block">
                Weekly Boss: {boss.bossName}
              </span>
              <span className="text-xs font-bold text-white">{boss.title}</span>
            </div>
          </div>
          <span className="text-xs font-black font-mono text-[#FF7A00]">
            +{boss.xpReward} XP
          </span>
        </div>

        {/* Boss HP Bar */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-0.5">
            <span>Boss HP: {Math.max(0, boss.bossHp - bossProgress)} / {boss.bossHp}</span>
            <span>{Math.round((bossProgress / boss.bossHp) * 100)}% Damaged</span>
          </div>
          <div className="w-full bg-black h-2.5 border border-stone-800 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (bossProgress / boss.bossHp) * 100)}%` }}
              className="h-full bg-gradient-to-r from-rose-500 to-[#FF7A00] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Daily Quests List (Collapsible) */}
      <div className={`mt-3 space-y-2 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DAILY_QUEST_TEMPLATES.map((quest) => {
            const isCompleted = quest.check(dayTasks, dayRecord);
            const isClaimed = claimedQuestIds.includes(quest.id);
            const progress = quest.getProgress(dayTasks, dayRecord);

            return (
              <div
                key={quest.id}
                className={`p-2.5 border-2 flex items-center justify-between gap-2 transition ${
                  isClaimed
                    ? 'border-stone-800 bg-stone-950/60 opacity-60'
                    : isCompleted
                    ? 'border-[#FF7A00] bg-[#FF7A00]/10 shadow-[2px_2px_0px_#000]'
                    : 'border-stone-800 bg-stone-900/90'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white truncate">
                      {quest.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#FF7A00]">
                      +{quest.xpReward} XP
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 truncate">
                    {quest.description} ({progress}/{quest.target})
                  </p>
                </div>

                {isClaimed ? (
                  <span className="text-[10px] font-black uppercase text-stone-500 px-2 py-1 bg-stone-900 border border-stone-800">
                    Claimed
                  </span>
                ) : isCompleted ? (
                  <button
                    onClick={() => {
                      if (onClaimQuestReward) onClaimQuestReward(quest.id, quest.xpReward);
                      soundEffects.playVictoryFanfare();
                    }}
                    className="px-2.5 py-1 bg-[#FF7A00] text-black font-black text-[10px] uppercase border border-black hover:bg-[#ff8f26] flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                  >
                    <Sparkles size={11} /> Claim
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-stone-500">
                    {progress}/{quest.target}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

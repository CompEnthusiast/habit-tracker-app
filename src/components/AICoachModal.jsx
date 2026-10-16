import React, { useState, useEffect } from 'react';
import { X, Bot, Sparkles, Brain, ShieldCheck, ArrowRight, Check, AlertCircle, RefreshCw, Send, Plus } from 'lucide-react';
import { generateWeeklyDisciplineReport } from '../utils/habitAnalytics';

export default function AICoachModal({
  isOpen,
  onClose,
  dayRecords = [],
  habits = [],
  onAcceptHabits
}) {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'goal'
  const [language, setLanguage] = useState('hinglish'); // 'english' | 'hinglish'
  const [aiOptOut, setAiOptOut] = useState(false);
  const [deterministicReport, setDeterministicReport] = useState(null);
  
  // AI report state
  const [aiReportText, setAiReportText] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Goal -> Habits state
  const [goalInput, setGoalInput] = useState('');
  const [goalTimeframe, setGoalTimeframe] = useState('3 months');
  const [suggestedPlan, setSuggestedPlan] = useState(null);
  const [loadingGoal, setLoadingGoal] = useState(false);
  const [goalError, setGoalError] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      const report = generateWeeklyDisciplineReport(dayRecords, habits, language === 'hinglish');
      setDeterministicReport(report);
      setAiReportText(null);
      setAiError(null);
    }
  }, [isOpen, dayRecords, habits, language]);

  if (!isOpen) return null;

function getAuthToken() {
  const directToken = localStorage.getItem('token');
  if (directToken) return directToken;
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.token || null;
    }
  } catch {}
  return null;
}

  const handleFetchAICoaching = async () => {
    if (aiOptOut) return;
    setLoadingAi(true);
    setAiError(null);

    try {
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          stats: deterministicReport?.stats,
          isHinglish: language === 'hinglish'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'AI service temporarily unavailable');
      }

      setAiReportText(data.report || `${data.summary || ''}\n\n• ${data.recommendation || ''}`);
    } catch (err) {
      setAiError(err.message || 'Failed to connect to AI proxy. Showing local rule-based coaching.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateHabitsFromGoal = async (e) => {
    e.preventDefault();
    if (!goalInput.trim()) return;

    setLoadingGoal(true);
    setGoalError(null);
    setSuggestedPlan(null);
    setAcceptedIds(new Set());

    try {
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/ai/goal-to-habits', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: goalInput,
          timeframe: goalTimeframe,
          isHinglish: language === 'hinglish'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to generate habits plan');
      }

      setSuggestedPlan(data.plan);
    } catch (err) {
      setGoalError(err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setLoadingGoal(false);
    }
  };

  const handleAcceptSingleHabit = (habit) => {
    if (onAcceptHabits) {
      onAcceptHabits([habit]);
      setAcceptedIds(prev => new Set(prev).add(habit.title));
    }
  };

  const handleAcceptAllHabits = () => {
    if (suggestedPlan?.habits && onAcceptHabits) {
      onAcceptHabits(suggestedPlan.habits);
      setAcceptedIds(new Set(suggestedPlan.habits.map(h => h.title)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#100E0C] border-2 border-[#494848] shadow-[6px_6px_0px_#000000] text-stone-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#494848] bg-[#1E1D1C]">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-[#FF7A00] bg-[#FF7A00]/20 text-[#FF7A00]">
              <Brain size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">AI Habit Coach & Analytics</h2>
              <p className="text-xs text-stone-400">Deterministic Analytics & Privacy-Preserving Proxy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-stone-600 bg-stone-800 hover:bg-stone-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-Header Tabs & Settings */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b-2 border-[#494848] bg-[#161514] gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 transition ${
                activeTab === 'report'
                  ? 'border-[#FF7A00] bg-[#FF7A00] text-black shadow-[2px_2px_0px_#000]'
                  : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
              }`}
            >
              📊 Weekly Discipline Report
            </button>
            <button
              onClick={() => setActiveTab('goal')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 transition ${
                activeTab === 'goal'
                  ? 'border-[#FF7A00] bg-[#FF7A00] text-black shadow-[2px_2px_0px_#000]'
                  : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
              }`}
            >
              🎯 Goal → Habits Generator
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center border-2 border-stone-700 bg-stone-900 text-xs">
              <button
                onClick={() => setLanguage('english')}
                className={`px-2.5 py-1 font-bold ${language === 'english' ? 'bg-[#FF7A00] text-black' : 'text-stone-400'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hinglish')}
                className={`px-2.5 py-1 font-bold ${language === 'hinglish' ? 'bg-[#FF7A00] text-black' : 'text-stone-400'}`}
              >
                Hinglish
              </button>
            </div>

            {/* Privacy Opt-out Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-stone-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiOptOut}
                onChange={(e) => setAiOptOut(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#FF7A00]"
              />
              <span>Local Only (Opt out)</span>
            </label>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'report' ? (
            <div className="space-y-6">
              {/* Pattern Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#1E1D1C] border-2 border-[#494848]">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Weekly Rate</span>
                  <p className="text-2xl font-black text-[#FF7A00]">
                    {deterministicReport?.stats?.weeklyRate ?? 0}%
                  </p>
                </div>
                <div className="p-3 bg-[#1E1D1C] border-2 border-[#494848]">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Total Done</span>
                  <p className="text-2xl font-black text-emerald-400">
                    {deterministicReport?.stats?.totalCompleted ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-[#1E1D1C] border-2 border-[#494848]">
                  <span className="text-[10px] uppercase font-bold text-stone-400">High Risk Day</span>
                  <p className="text-base font-black text-rose-400 truncate">
                    {deterministicReport?.stats?.worstWeekday
                      ? `${deterministicReport.stats.worstWeekday.day} (${deterministicReport.stats.worstWeekday.failureRate}%)`
                      : 'None'}
                  </p>
                </div>
                <div className="p-3 bg-[#1E1D1C] border-2 border-[#494848]">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Best Momentum</span>
                  <p className="text-base font-black text-amber-300 truncate">
                    {deterministicReport?.stats?.bestWeekday?.day || 'All solid'}
                  </p>
                </div>
              </div>

              {/* Weekday Failure Rate Bar Visualization */}
              {deterministicReport?.stats?.weekdayStats && (
                <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848]">
                  <h4 className="text-xs uppercase font-black text-stone-300 mb-3 tracking-wider">
                    Weekday Failure Rates (% Skipped)
                  </h4>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {deterministicReport.stats.weekdayStats.map((item) => (
                      <div key={item.day} className="flex flex-col items-center gap-1">
                        <div className="w-full bg-stone-900 h-20 flex items-end justify-center p-1 border border-stone-700">
                          <div
                            style={{ height: `${Math.min(100, item.failureRate)}%` }}
                            className={`w-full transition-all ${
                              item.failureRate > 40
                                ? 'bg-rose-500'
                                : item.failureRate > 20
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-stone-400">{item.day}</span>
                        <span className="text-[10px] font-mono text-stone-300">{item.failureRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deterministic Insights */}
              <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-2">
                <h4 className="text-xs uppercase font-black text-[#FF7A00] tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} /> Rule-Based Pattern Insights
                </h4>
                <div className="space-y-1.5 text-xs text-stone-300">
                  {deterministicReport?.localTips?.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-stone-900/60 p-2 border border-stone-800">
                      <span className="text-[#FF7A00] font-black">▸</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Coaching Section */}
              <div className="p-4 bg-[#1E1D1C] border-2 border-[#FF7A00] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-[#FF7A00]" />
                    AI Coach Analysis ({language.toUpperCase()})
                  </h4>
                  {!aiOptOut && (
                    <button
                      onClick={handleFetchAICoaching}
                      disabled={loadingAi}
                      className="px-3 py-1.5 text-xs font-black uppercase bg-[#FF7A00] text-black border-2 border-black hover:bg-[#ff8f26] transition disabled:opacity-50 flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
                    >
                      {loadingAi ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                      {aiReportText ? 'Regenerate Coaching' : 'Ask AI Coach'}
                    </button>
                  )}
                </div>

                {aiOptOut ? (
                  <p className="text-xs text-stone-400 italic">
                    AI proxy calls are opted out. Only local deterministic rules are used.
                  </p>
                ) : loadingAi ? (
                  <div className="p-6 text-center text-xs text-stone-400 animate-pulse">
                    Synthesizing pattern data through AI coach proxy...
                  </div>
                ) : aiReportText ? (
                  <div className="p-3 bg-stone-900/90 border border-stone-700 text-xs text-stone-200 leading-relaxed whitespace-pre-line font-sans">
                    {aiReportText}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">
                    Click &quot;Ask AI Coach&quot; to synthesize your patterns into personalized, encouraging coaching in {language}.
                  </p>
                )}

                {aiError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-700 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{aiError}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab: Goal -> Habits Generator */
            <div className="space-y-6">
              <form onSubmit={handleGenerateHabitsFromGoal} className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
                <div>
                  <label className="block text-xs font-black uppercase text-stone-300 mb-1">
                    What is your target goal?
                  </label>
                  <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="e.g. Prepare for a half marathon in 3 months, or Learn Full-Stack Web Dev"
                    className="w-full px-3 py-2 bg-stone-900 border-2 border-stone-700 text-sm text-white focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone-400 font-bold uppercase">Timeframe:</span>
                    {['30 days', '3 months', '6 months'].map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setGoalTimeframe(tf)}
                        className={`px-2.5 py-1 font-bold border transition ${
                          goalTimeframe === tf
                            ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                            : 'border-stone-700 bg-stone-900 text-stone-300'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loadingGoal || !goalInput.trim()}
                    className="px-4 py-2 bg-[#FF7A00] text-black font-black text-xs uppercase tracking-wider border-2 border-black hover:bg-[#ff8f26] transition disabled:opacity-50 flex items-center gap-2 shadow-[2px_2px_0px_#000]"
                  >
                    {loadingGoal ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Generate Phased Habit Plan
                  </button>
                </div>
              </form>

              {goalError && (
                <div className="p-3 bg-rose-950/40 border border-rose-700 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{goalError}</span>
                </div>
              )}

              {suggestedPlan && (
                <div className="p-4 bg-[#1E1D1C] border-2 border-[#FF7A00] space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <div>
                      <h4 className="text-sm font-black uppercase text-white tracking-wider">
                        Suggested Phased Habit Blueprint
                      </h4>
                      <p className="text-xs text-stone-400">
                        Goal: <span className="text-[#FF7A00] font-bold">{suggestedPlan.goal}</span> ({suggestedPlan.timeframe})
                      </p>
                    </div>
                    <button
                      onClick={handleAcceptAllHabits}
                      className="px-3 py-1.5 text-xs font-black uppercase bg-emerald-500 text-black border-2 border-black hover:bg-emerald-400 transition flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
                    >
                      <Check size={14} /> Add All Habits
                    </button>
                  </div>

                  {/* Habit Cards */}
                  <div className="space-y-2.5">
                    {suggestedPlan.habits?.map((habit, idx) => {
                      const isAdded = acceptedIds.has(habit.title);
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-stone-900 border-2 border-stone-700 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{habit.title}</span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-stone-800 border border-stone-700 text-[#FF7A00]">
                                {habit.frequency || 'Daily'}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-stone-800 border border-stone-700 text-stone-300">
                                {habit.priority || 'Medium'}
                              </span>
                            </div>
                            <p className="text-xs text-stone-400">{habit.description}</p>
                            {habit.routineStack && (
                              <p className="text-[11px] text-[#FF7A00]">
                                ⚡ Suggested Stack: {habit.routineStack}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleAcceptSingleHabit(habit)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 text-xs font-black uppercase border-2 transition flex items-center gap-1 ${
                              isAdded
                                ? 'bg-stone-800 border-stone-700 text-emerald-400 cursor-default'
                                : 'bg-[#FF7A00] border-black text-black hover:bg-[#ff8f26] shadow-[2px_2px_0px_#000]'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check size={12} /> Added
                              </>
                            ) : (
                              <>
                                <Plus size={12} /> Accept
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Privacy Note Banner */}
          <div className="p-3 bg-stone-950 border border-stone-800 flex items-center gap-2.5 text-[11px] text-stone-400">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>
              <strong>Privacy First:</strong> Your raw habit data stays stored locally in IndexedDB. AI requests only pass anonymous aggregate metrics to our secure proxy. No API keys exist in frontend code.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
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

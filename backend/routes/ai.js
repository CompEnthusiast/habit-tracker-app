const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Optional authentication middleware: attaches user if token is provided, doesn't block guests
async function optionalAuth(req, res, next) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      }
    } catch {
      // Token expired or invalid, proceed as guest
    }
  }
  next();
}

// Simple in-memory rate limiter: max 30 requests per minute per user/IP
const rateLimitMap = new Map();
function rateLimiter(req, res, next) {
  const userId = req.user?._id?.toString() || req.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000;

  let record = rateLimitMap.get(userId);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    rateLimitMap.set(userId, record);
    return next();
  }

  if (record.count >= 30) {
    return res.status(429).json({
      message: 'Rate limit exceeded. Please wait a minute before requesting AI coaching again.',
    });
  }

  record.count += 1;
  next();
}

router.use(optionalAuth);
router.use(rateLimiter);

/**
 * POST /api/ai/weekly-report & /api/ai/coach
 * Generate AI-enhanced weekly coaching text based on pre-computed deterministic stats
 */
router.post(['/weekly-report', '/coach'], async (req, res) => {
  try {
    const { stats, language, isHinglish: reqIsHinglish, optOut = false } = req.body;

    if (optOut) {
      return res.status(403).json({
        message: 'AI Coaching is disabled per your privacy settings.',
      });
    }

    const isHinglish = reqIsHinglish || language === 'hinglish';
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    const worstDay = stats?.worstWeekday?.day || stats?.worstDay?.day || 'mid-week';
    const failRate = stats?.worstWeekday?.failureRate || stats?.worstDay?.failureRate || 40;
    const skipped = stats?.mostSkippedHabit?.name || 'Your highest priority habit';
    const weeklyRate = stats?.weeklyRate || stats?.currentWeekPct || 70;

    const fallbackSummary = isHinglish
      ? `Aapki weekly consistency ${weeklyRate}% par hai. Data ke hisab se ${worstDay} (${failRate}% drop) aur '${skipped}' me sabse zyada friction hai. ${worstDay} ke din schedule ko thoda light rakho aur 2-minute version use karo.`
      : `Your weekly adherence is at ${weeklyRate}%. The pattern detection flags ${worstDay} (${failRate}% failure rate) and '${skipped}' as your highest friction areas. Apply the 2-minute minimum viable habit rule on ${worstDay} to keep the streak alive.`;

    const fallbackAction = isHinglish
      ? `Action Step: Kal subah uthte hi sabse pehle 1 main habit tick karo taaki day-long momentum bana rahe.`
      : `Action Step: Complete your primary non-negotiable habit in your peak morning energy window before cognitive fatigue sets in.`;

    if (!apiKey) {
      const combined = `${fallbackSummary}\n\n• ${fallbackAction}`;
      return res.json({
        success: true,
        isAiGenerated: false,
        report: combined,
        summary: fallbackSummary,
        recommendation: fallbackAction,
        privacyNote: 'Processed via secure local deterministic engine.',
      });
    }

    // Call LLM proxy if key is configured
    const prompt = `You are an elite, encouraging habit coach. Analyze these pre-computed habit stats:
Weekly completion rate: ${weeklyRate}%
High friction weekday: ${worstDay} (${failRate}% failure rate)
Most skipped habit: ${skipped}
Respond in friendly, punchy ${isHinglish ? 'Hinglish (Hindi-English mix)' : 'English'}.
Strictly output a JSON object with:
"summary": 2-3 concise encouraging sentences analyzing their pattern.
"recommendation": 1 immediate high-leverage action step.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(content || '{}');
      const summaryText = parsed.summary || fallbackSummary;
      const recommendationText = parsed.recommendation || fallbackAction;
      const combined = `${summaryText}\n\n• ${recommendationText}`;

      return res.json({
        success: true,
        isAiGenerated: true,
        report: combined,
        summary: summaryText,
        recommendation: recommendationText,
      });
    } catch (llmErr) {
      console.warn('LLM call failed, falling back to deterministic tips:', llmErr.message);
      const combined = `${fallbackSummary}\n\n• ${fallbackAction}`;
      return res.json({
        success: true,
        isAiGenerated: false,
        report: combined,
        summary: fallbackSummary,
        recommendation: fallbackAction,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/ai/goal-to-habits & /api/ai/plan-goal
 * Transforms an overarching goal into a phased actionable habit breakdown
 */
router.post(['/goal-to-habits', '/plan-goal'], async (req, res) => {
  try {
    const { goal, timeframe = '3 months', language, isHinglish, optOut = false } = req.body;

    if (!goal || !goal.trim()) {
      return res.status(400).json({ message: 'Goal description is required.' });
    }

    if (optOut) {
      return res.status(403).json({ message: 'AI Goal Generator is disabled in privacy settings.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    // Deterministic smart template generator fallback
    const defaultPlans = [
      {
        title: `Daily Focus Block (${goal.slice(0, 20)})`,
        name: `Daily Focus Block (${goal.slice(0, 20)})`,
        category: 'Productivity',
        priority: 'High',
        frequency: 'Daily',
        description: `Dedicated 25-minute deliberate practice session towards: ${goal}`,
        routineStack: 'After my morning hydration, I will immediately start my 25-minute focus session.',
        minimumViableHabit: '2 minutes of deliberate review or setup.',
      },
      {
        title: 'Weekly Milestones & Sprint Review',
        name: 'Weekly Milestones & Sprint Review',
        category: 'Productivity',
        priority: 'Medium',
        frequency: 'Weekly',
        description: 'Audit progress and recalibrate targets every Sunday',
        routineStack: 'After Sunday breakfast, I will review completed milestones for 10 minutes.',
        minimumViableHabit: 'Review 1 target metric on Sunday.',
      },
      {
        title: 'Physical & Mental Energy Recovery',
        name: 'Physical & Mental Energy Recovery',
        category: 'Health',
        priority: 'Medium',
        frequency: 'Daily',
        description: 'Hydration, stretching, and 7+ hours sleep to sustain discipline',
        routineStack: 'Before going to bed, I will disconnect from screens 30 minutes prior.',
        minimumViableHabit: 'Drink 1 glass of water and 1 minute of deep breathing.',
      },
    ];

    if (!apiKey) {
      return res.json({
        success: true,
        isAiGenerated: false,
        plan: {
          goal,
          timeframe,
          habits: defaultPlans,
        },
        habits: defaultPlans,
      });
    }

    // Call LLM for custom plan
    try {
      const prompt = `Deconstruct this goal into exactly 3 phased, actionable habits using the Atomic Habits methodology:
Goal: "${goal}"
Timeframe: "${timeframe}"
Language: ${isHinglish || language === 'hinglish' ? 'Hinglish' : 'English'}
Return strictly a JSON array of objects with keys:
"title": short habit name
"category": "Health" | "Productivity" | "Learning" | "Fitness" | "Work"
"priority": "High" | "Medium" | "Low"
"frequency": "Daily" | "Weekly"
"description": 1 sentence summary
"routineStack": Atomic Habits cue statement (e.g. "After I [current habit], I will [new habit]")
"minimumViableHabit": 2-minute micro version for low energy days`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedHabits = JSON.parse(text || '[]');
      const validHabits = Array.isArray(parsedHabits) && parsedHabits.length > 0 ? parsedHabits : defaultPlans;

      return res.json({
        success: true,
        isAiGenerated: true,
        plan: {
          goal,
          timeframe,
          habits: validHabits,
        },
        habits: validHabits,
      });
    } catch {
      return res.json({
        success: true,
        isAiGenerated: false,
        plan: {
          goal,
          timeframe,
          habits: defaultPlans,
        },
        habits: defaultPlans,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

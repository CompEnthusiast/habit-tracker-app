/**
 * Voice Check-in & Speech Assistant Module
 * Features:
 * - Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * - English & Hindi/Hinglish speech understanding
 * - Fuzzy token-matching against existing habits
 * - Text-To-Speech (SpeechSynthesis) Daily Briefing reader
 * - Graceful unsupported browser detection
 */

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
}

export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Simple Levenshtein distance for fuzzy matching
export function calculateSimilarity(str1, str2) {
  const s1 = (str1 || '').toLowerCase().trim();
  const s2 = (str2 || '').toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Check substring containment
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null)
  );
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

// Find closest matching habit from current habit list
export function findBestMatchingHabit(query, habits = []) {
  if (!query || habits.length === 0) return null;
  let bestMatch = null;
  let highestScore = 0;

  const cleanQuery = query.toLowerCase().replace(/[.,!?;:]/g, '').trim();

  for (const habit of habits) {
    const title = (habit.title || habit.name || '').toLowerCase();
    const score = calculateSimilarity(cleanQuery, title);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = habit;
    }
  }

  // Threshold: at least 0.45 similarity
  if (highestScore >= 0.45) {
    return { habit: bestMatch, score: highestScore };
  }
  return null;
}

/**
 * Parse Spoken Command
 * Supports English and Hindi/Hinglish phrasing:
 * - "Mark deep work as completed" / "Deep work done" / "Gym ho gaya" / "Complete meditation"
 * - "Add task buy milk" / "Naya task buy groceries"
 * - "Start focus timer" / "Start pomodoro" / "Timer chalao"
 */
export function parseVoiceCommand(transcript, habits = []) {
  const text = (transcript || '').trim();
  const lower = text.toLowerCase();

  // 1. Focus Timer Command
  if (
    lower.includes('start focus') ||
    lower.includes('start timer') ||
    lower.includes('start pomodoro') ||
    lower.includes('focus timer') ||
    lower.includes('timer chalao') ||
    lower.includes('pomodoro shuru')
  ) {
    return {
      type: 'START_TIMER',
      rawText: text,
      message: 'Starting focus session...'
    };
  }

  // 2. Add Task Command
  const addMatch = lower.match(/(?:add task|add habit|create task|naya task|task banao|habit add karo)\s+(.+)/i);
  if (addMatch && addMatch[1]) {
    const taskName = addMatch[1].trim();
    return {
      type: 'ADD_TASK',
      taskName: taskName.charAt(0).toUpperCase() + taskName.slice(1),
      rawText: text,
      message: `Add new task "${taskName}"`
    };
  }

  // 3. Mark Completed Command
  // Clean phrases like "mark X as completed", "complete X", "X done", "X ho gaya", "X kar liya"
  let queryName = lower
    .replace(/^mark\s+/i, '')
    .replace(/\s+as\s+(?:completed|done|finished)$/i, '')
    .replace(/^complete\s+/i, '')
    .replace(/\s+(?:done|completed|finished)$/i, '')
    .replace(/\s+(?:ho gaya|kar liya|khatam|poora kar diya)$/i, '')
    .trim();

  const match = findBestMatchingHabit(queryName, habits);
  if (match) {
    return {
      type: 'MARK_COMPLETED',
      habit: match.habit,
      rawText: text,
      confidence: match.score,
      message: `Mark "${match.habit.title || match.habit.name}" as completed`
    };
  }

  return {
    type: 'UNKNOWN',
    rawText: text,
    message: `Could not recognize command: "${text}"`
  };
}

/**
 * Text-to-Speech: Read Day's Plan
 */
export function speakDailyBriefing(habits = [], xp = 0, streak = 0, isHinglish = false) {
  if (!isSpeechSynthesisSupported()) return;

  window.speechSynthesis.cancel(); // Stop any pending speech

  const pending = habits.filter(h => !h.completed);
  const completed = habits.filter(h => h.completed);

  let speechText = '';
  if (isHinglish) {
    speechText = `Namaste! Aaj aapke paas ${habits.length} habits hain. ${completed.length} complete ho chuki hain aur ${pending.length} bachi hain. Current streak ${streak} din ki hai, aur total XP ${xp} hai. `;
    if (pending.length > 0) {
      speechText += `Next priority habits hain: ${pending.slice(0, 3).map(h => h.title || h.name).join(', ')}. Let's crush it!`;
    } else {
      speechText += `Superb! Aaj ke saare habits complete ho chuke hain! Keep the momentum going!`;
    }
  } else {
    speechText = `Good day! You have ${habits.length} total habits scheduled today. ${completed.length} completed, with ${pending.length} remaining. You are on a ${streak}-day streak with ${xp} XP. `;
    if (pending.length > 0) {
      speechText += `Your next habits are: ${pending.slice(0, 3).map(h => h.title || h.name).join(', ')}. Stay focused!`;
    } else {
      speechText += `Incredible job! All habits are completed for today! Keep the discipline!`;
    }
  }

  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Select good voice if available
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(v => v.lang.startsWith('en') || (isHinglish && v.lang.startsWith('hi'))) || voices[0];
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

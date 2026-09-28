const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const Habit = require('../models/Habit');
const { protect } = require('../middleware/auth');

const router = express.Router();

function getOAuthClient(redirectUri) {
  const finalRedirectUri =
    redirectUri ||
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:5000/api/google/callback';

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    finalRedirectUri
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// GET /api/google/auth-url — Generate Google OAuth consent URL
router.get('/auth-url', protect, (req, res) => {
  try {
    const redirectUri = req.query.redirect_uri || process.env.GOOGLE_REDIRECT_URI;
    const client = getOAuthClient(redirectUri);
    const stateObj = {
      userId: req.user._id.toString(),
      clientRedirect: req.query.client_redirect || '',
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state,
    });

    res.json({ url: authUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/google/callback — Google OAuth redirect handler
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`Google OAuth error: ${error}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing authorization code or state parameter');
  }

  try {
    let stateData = {};
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      stateData = { userId: state };
    }

    const { userId, clientRedirect } = stateData;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found for this authentication session');
    }

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let googleEmail = '';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();
      googleEmail = userInfo.email || '';
    } catch {
      googleEmail = '';
    }

    user.googleTokens = tokens;
    user.googleEmail = googleEmail;
    user.isGoogleConnected = true;
    user.lastGoogleSync = new Date();
    await user.save();

    // Determine target redirect
    const frontendBase =
      clientRedirect ||
      (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'http://localhost:5173');

    // Return an HTML page that redirects smoothly and handles mobile webviews/app links
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Account Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0f172a;
              color: #f8fafc;
              text-align: center;
              padding: 20px;
            }
            .card {
              background: #1e293b;
              padding: 32px;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
              max-width: 400px;
              border: 1px solid #334155;
            }
            .icon { font-size: 48px; margin-bottom: 16px; }
            h2 { margin: 0 0 8px 0; color: #38bdf8; }
            p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
            a {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: bold;
              transition: 0.2s;
            }
            a:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h2>Google Connected!</h2>
            <p>Your Google Calendar, Tasks, and Fit are now linked to Habit Tracker.</p>
            <a id="returnBtn" href="${frontendBase}?google_connected=true">Return to App</a>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = "${frontendBase}?google_connected=true";
            }, 1200);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

// GET /api/google/status — Check if user has Google linked
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      connected: !!(user.isGoogleConnected && user.googleTokens),
      email: user.googleEmail || null,
      lastSync: user.lastGoogleSync || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/google/disconnect — Disconnect Google account
router.post('/disconnect', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.googleTokens && user.googleTokens.access_token) {
      try {
        const client = getOAuthClient();
        await client.revokeToken(user.googleTokens.access_token);
      } catch (revokeErr) {
        console.log('Token revocation error (ignoring):', revokeErr.message);
      }
    }

    user.googleTokens = null;
    user.googleEmail = null;
    user.isGoogleConnected = false;
    await user.save();

    res.json({ message: 'Google account disconnected successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/google/sync — Auto-sync Google Calendar, Tasks, and Fitness habits for today
router.post('/sync', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.isGoogleConnected || !user.googleTokens) {
      return res.status(400).json({ message: 'Google account is not connected' });
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(user.googleTokens);

    // Refresh token if needed
    oauth2Client.on('tokens', async (newTokens) => {
      user.googleTokens = { ...user.googleTokens, ...newTokens };
      await user.save();
    });

    // Date calculations for today
    const clientTzOffsetMin = req.body.timezoneOffset ? Number(req.body.timezoneOffset) : new Date().getTimezoneOffset();
    const nowClient = new Date(Date.now() - clientTzOffsetMin * 60000);
    const targetDateKey = req.body.dateKey || nowClient.toISOString().split('T')[0]; // "YYYY-MM-DD"

    const startOfDay = new Date(`${targetDateKey}T00:00:00.000Z`);
    // Adjust for client timezone
    const startTimeMs = startOfDay.getTime() + clientTzOffsetMin * 60000;
    const endTimeMs = startTimeMs + 24 * 60 * 60 * 1000 - 1;

    const startIso = new Date(startTimeMs).toISOString();
    const endIso = new Date(endTimeMs).toISOString();

    // Fetch all habits configured for auto-sync
    const habits = await Habit.find({ user: user._id });
    const syncHabits = habits.filter(h => h.autoSync && h.autoSync.enabled && h.autoSync.source !== 'none');

    const syncResults = {
      targetDate: targetDateKey,
      syncedCount: 0,
      details: [],
      fitData: { steps: 0, activeMinutes: 0, calories: 0 },
      eventsFound: [],
      tasksFound: [],
    };

    // 1. Check Google Calendar Events
    const calendarHabits = syncHabits.filter(h => h.autoSync.source === 'google_calendar');
    if (calendarHabits.length > 0) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const calRes = await calendar.events.list({
          calendarId: 'primary',
          timeMin: startIso,
          timeMax: endIso,
          singleEvents: true,
          orderBy: 'startTime',
        });
        const events = calRes.data.items || [];
        syncResults.eventsFound = events.map(e => e.summary || '(Untitled Event)');

        for (const habit of calendarHabits) {
          const keyword = (habit.autoSync.keyword || habit.name).toLowerCase().trim();
          const match = events.some(e => {
            const summary = (e.summary || '').toLowerCase();
            const description = (e.description || '').toLowerCase();
            return summary.includes(keyword) || description.includes(keyword);
          });

          if (match) {
            habit.completions.set(targetDateKey, true);
            await habit.save();
            syncResults.syncedCount++;
            syncResults.details.push(`Google Calendar: Marked "${habit.name}" completed`);
          }
        }
      } catch (calErr) {
        console.error('Google Calendar Sync Error:', calErr.message);
      }
    }

    // 2. Check Google Tasks
    const taskHabits = syncHabits.filter(h => h.autoSync.source === 'google_tasks');
    if (taskHabits.length > 0) {
      try {
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });
        const taskListsRes = await tasksApi.tasklists.list({ maxResults: 10 });
        const taskLists = taskListsRes.data.items || [];

        let completedTasks = [];
        for (const list of taskLists) {
          const tRes = await tasksApi.tasks.list({
            tasklist: list.id,
            showCompleted: true,
            showHidden: true,
            updatedMin: startIso,
          });
          const listTasks = (tRes.data.items || []).filter(t => t.status === 'completed');
          completedTasks = completedTasks.concat(listTasks);
        }

        syncResults.tasksFound = completedTasks.map(t => t.title || '(Untitled Task)');

        for (const habit of taskHabits) {
          const keyword = (habit.autoSync.keyword || habit.name).toLowerCase().trim();
          const match = completedTasks.some(t => {
            const title = (t.title || '').toLowerCase();
            const notes = (t.notes || '').toLowerCase();
            return title.includes(keyword) || notes.includes(keyword);
          });

          if (match) {
            habit.completions.set(targetDateKey, true);
            await habit.save();
            syncResults.syncedCount++;
            syncResults.details.push(`Google Tasks: Marked "${habit.name}" completed`);
          }
        }
      } catch (taskErr) {
        console.error('Google Tasks Sync Error:', taskErr.message);
      }
    }

    // 3. Check Google Fit Metrics
    const fitHabits = syncHabits.filter(h => h.autoSync.source === 'google_fit');
    if (fitHabits.length > 0) {
      try {
        const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
        const fitRes = await fitness.users.dataset.aggregate({
          userId: 'me',
          requestBody: {
            aggregateBy: [
              { dataTypeName: 'com.google.step_count.delta' },
              { dataTypeName: 'com.google.active_minutes' },
              { dataTypeName: 'com.google.calories.expended' },
            ],
            bucketByTime: { durationMillis: (endTimeMs - startTimeMs + 1).toString() },
            startTimeMillis: startTimeMs.toString(),
            endTimeMillis: endTimeMs.toString(),
          },
        });

        let totalSteps = 0;
        let totalActiveMins = 0;
        let totalCalories = 0;

        const buckets = fitRes.data.bucket || [];
        for (const bucket of buckets) {
          for (const dataset of bucket.dataset || []) {
            for (const point of dataset.point || []) {
              const name = dataset.dataSourceId || '';
              const val = point.value && point.value[0];
              if (!val) continue;

              if (name.includes('step_count') || dataset.dataTypeName === 'com.google.step_count.delta') {
                totalSteps += val.intVal || 0;
              } else if (name.includes('active_minutes') || dataset.dataTypeName === 'com.google.active_minutes') {
                totalActiveMins += val.intVal || val.fpVal || 0;
              } else if (name.includes('calories') || dataset.dataTypeName === 'com.google.calories.expended') {
                totalCalories += Math.round(val.fpVal || val.intVal || 0);
              }
            }
          }
        }

        syncResults.fitData = {
          steps: totalSteps,
          activeMinutes: Math.round(totalActiveMins),
          calories: totalCalories,
        };

        for (const habit of fitHabits) {
          const metric = habit.autoSync.fitMetric || 'steps';
          const target = Number(habit.autoSync.targetValue) || (metric === 'steps' ? 10000 : 30);
          let currentVal = 0;

          if (metric === 'steps') currentVal = totalSteps;
          else if (metric === 'active_minutes') currentVal = totalActiveMins;
          else if (metric === 'calories') currentVal = totalCalories;

          if (currentVal >= target) {
            habit.completions.set(targetDateKey, true);
            await habit.save();
            syncResults.syncedCount++;
            syncResults.details.push(
              `Google Fit: Marked "${habit.name}" completed (${currentVal}/${target} ${metric})`
            );
          }
        }
      } catch (fitErr) {
        console.error('Google Fit Sync Error:', fitErr.message);
      }
    }

    user.lastGoogleSync = new Date();
    await user.save();

    // Fetch refreshed habits
    const updatedHabits = await Habit.find({ user: user._id }).sort({ createdAt: 1 });
    const formatted = updatedHabits.map(h => ({
      _id: h._id,
      name: h.name,
      category: h.category,
      color: h.color,
      targetPerWeek: h.targetPerWeek,
      reminderEnabled: h.reminderEnabled,
      reminderTime: h.reminderTime,
      autoSync: h.autoSync || { enabled: false, source: 'none', keyword: '', fitMetric: 'steps', targetValue: 10000 },
      completions: Object.fromEntries(h.completions || new Map()),
    }));

    res.json({
      success: true,
      results: syncResults,
      habits: formatted,
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/google/push-tasks — Export & push today's habits to Google Tasks
router.post('/push-tasks', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.isGoogleConnected || !user.googleTokens) {
      return res.status(400).json({ message: 'Google account is not connected' });
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(user.googleTokens);

    const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

    // 1. Find or create a dedicated "🎯 Habit Tracker" list in Google Tasks
    const taskListsRes = await tasksApi.tasklists.list({ maxResults: 50 });
    let habitList = (taskListsRes.data.items || []).find(
      (l) => l.title === '🎯 Habit Tracker' || l.title === 'Habit Tracker'
    );

    if (!habitList) {
      const newListRes = await tasksApi.tasklists.insert({
        requestBody: { title: '🎯 Habit Tracker' },
      });
      habitList = newListRes.data;
    }

    // 2. Get existing tasks in this list to avoid duplicates
    const existingTasksRes = await tasksApi.tasks.list({
      tasklist: habitList.id,
      showCompleted: false,
      maxResults: 100,
    });
    const existingTitles = new Set(
      (existingTasksRes.data.items || []).map((t) => (t.title || '').toLowerCase().trim())
    );

    // 3. Date handling for today
    const clientTzOffsetMin = req.body.timezoneOffset ? Number(req.body.timezoneOffset) : new Date().getTimezoneOffset();
    const nowClient = new Date(Date.now() - clientTzOffsetMin * 60000);
    const targetDateKey = req.body.dateKey || nowClient.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const dueIso = new Date(`${targetDateKey}T23:59:59.000Z`).toISOString();

    // 4. Fetch all user habits
    const habits = await Habit.find({ user: user._id });
    let pushedCount = 0;
    const pushedHabits = [];

    for (const habit of habits) {
      const habitNameClean = habit.name.trim();
      const isCompletedToday = habit.completions && habit.completions.get(targetDateKey);

      // Skip if already completed today in Habit Tracker or already exists in Google Tasks
      if (isCompletedToday || existingTitles.has(habitNameClean.toLowerCase())) {
        continue;
      }

      // Automatically enable Google Tasks sync on this habit if not configured
      if (!habit.autoSync || habit.autoSync.source === 'none') {
        habit.autoSync = {
          enabled: true,
          source: 'google_tasks',
          keyword: habitNameClean,
          fitMetric: 'steps',
          targetValue: 10000,
        };
        await habit.save();
      }

      await tasksApi.tasks.insert({
        tasklist: habitList.id,
        requestBody: {
          title: habitNameClean,
          notes: `Category: ${habit.category} | Target: ${habit.targetPerWeek}d/week | Synced with Habit Tracker`,
          due: dueIso,
        },
      });

      existingTitles.add(habitNameClean.toLowerCase());
      pushedCount++;
      pushedHabits.push(habitNameClean);
    }

    res.json({
      success: true,
      pushedCount,
      pushedHabits,
      listTitle: habitList.title,
      message:
        pushedCount > 0
          ? `Successfully added ${pushedCount} habit(s) to your Google Tasks under "${habitList.title}"!`
          : `All habits are already in your Google Tasks or completed for today.`,
    });
  } catch (err) {
    console.error('Push to Google Tasks error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

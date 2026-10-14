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

function isInvalidGrant(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const desc = (err.response?.data?.error_description || '').toLowerCase();
  const errCode = (err.response?.data?.error || '').toLowerCase();
  return (
    msg.includes('invalid_grant') ||
    desc.includes('invalid_grant') ||
    errCode === 'invalid_grant' ||
    msg.includes('token has been expired or revoked')
  );
}

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
      prompt: 'consent', // Forces Google to supply a fresh refresh_token every time
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

    // Preserve existing refresh_token if new response only gave access_token
    user.googleTokens = {
      ...(user.googleTokens || {}),
      ...tokens,
    };
    user.googleEmail = googleEmail || user.googleEmail || '';
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

// Helper to format Date to YYYY-MM-DD
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// GET /api/google/status — Check if user has Google linked & get settings + sync history
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      connected: !!(user.isGoogleConnected && user.googleTokens),
      email: user.googleEmail || null,
      lastSync: user.lastGoogleSync || null,
      settings: user.syncSettings || {
        autoPushDailyTasks: true,
        autoSyncIntervalMins: 15,
        syncPastDaysCount: 7,
      },
      recentLogs: (user.syncLogs || []).slice(-30).reverse(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/google/settings — Update sync preferences
router.patch('/settings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { autoPushDailyTasks, autoSyncIntervalMins, syncPastDaysCount } = req.body;
    if (!user.syncSettings) user.syncSettings = {};

    if (typeof autoPushDailyTasks === 'boolean') user.syncSettings.autoPushDailyTasks = autoPushDailyTasks;
    if (typeof autoSyncIntervalMins === 'number') user.syncSettings.autoSyncIntervalMins = autoSyncIntervalMins;
    if (typeof syncPastDaysCount === 'number') user.syncSettings.syncPastDaysCount = syncPastDaysCount;

    await user.save();
    res.json({ success: true, settings: user.syncSettings });
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

// POST /api/google/sync — Comprehensive multi-day auto-sync & auto-assign
router.post('/sync', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.isGoogleConnected || !user.googleTokens) {
      return res.status(400).json({ message: 'Google account is not connected' });
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(user.googleTokens);

    // Auto-refresh token if needed
    oauth2Client.on('tokens', async (newTokens) => {
      user.googleTokens = { ...user.googleTokens, ...newTokens };
      await user.save();
    });

    const clientTzOffsetMin = req.body.timezoneOffset ? Number(req.body.timezoneOffset) : new Date().getTimezoneOffset();
    const daysBack = Math.min(30, Math.max(1, Number(req.body.daysBack || user.syncSettings?.syncPastDaysCount || 7)));
    const shouldAutoPush = req.body.autoPush !== undefined ? Boolean(req.body.autoPush) : (user.syncSettings?.autoPushDailyTasks !== false);

    // Compute date range
    const nowUtcMs = Date.now();
    const nowClientMs = nowUtcMs - clientTzOffsetMin * 60000;
    const todayClient = new Date(nowClientMs);
    const todayDateKey = req.body.dateKey || formatDateKey(todayClient);

    // Build array of dates to inspect from (today - daysBack + 1) up to today
    const dateKeys = [];
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(todayClient.getTime() - i * 86400000);
      dateKeys.push(formatDateKey(d));
    }
    // Oldest date start to today's end in client time converted to UTC ms
    const oldestKey = dateKeys[dateKeys.length - 1];
    const rangeStartMs = new Date(`${oldestKey}T00:00:00.000Z`).getTime() + clientTzOffsetMin * 60000;
    const rangeEndMs = new Date(`${todayDateKey}T23:59:59.999Z`).getTime() + clientTzOffsetMin * 60000;

    const startIso = new Date(rangeStartMs).toISOString();
    const endIso = new Date(rangeEndMs).toISOString();

    const habits = await Habit.find({ user: user._id });
    const syncHabits = habits.filter(h => h.autoSync && h.autoSync.enabled && h.autoSync.source !== 'none');

    const syncResults = {
      todayDateKey,
      daysChecked: daysBack,
      dateRange: { start: oldestKey, end: todayDateKey },
      syncedCount: 0,
      details: [],
      pastTasksSynced: [],
      fitDataByDate: {},
      eventsFound: [],
      tasksFound: [],
      autoPushedCount: 0,
      autoPushedHabits: [],
    };

    const newLogs = [];

    // Helper to log sync item
    const addSyncLog = (dateKey, habitName, source, details) => {
      newLogs.push({
        dateKey,
        habitName,
        source,
        action: 'completed',
        details,
        timestamp: new Date(),
      });
      syncResults.pastTasksSynced.push({
        dateKey,
        habitName,
        source,
        details,
        timestamp: new Date().toISOString(),
      });
    };

    // 1. Check Google Calendar Events (Multi-Day)
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
          maxResults: 250,
        });
        const events = calRes.data.items || [];
        syncResults.eventsFound = events.map(e => ({
          summary: e.summary || '(Untitled Event)',
          date: (e.start?.dateTime || e.start?.date || '').split('T')[0],
        }));

        for (const event of events) {
          const rawDate = event.start?.dateTime || event.start?.date || '';
          if (!rawDate) continue;
          // Event date in client timezone
          const eventDateMs = new Date(rawDate).getTime() - clientTzOffsetMin * 60000;
          const eventDateKey = formatDateKey(new Date(eventDateMs));

          if (!dateKeys.includes(eventDateKey)) continue;

          const summary = (event.summary || '').toLowerCase();
          const description = (event.description || '').toLowerCase();

          for (const habit of calendarHabits) {
            const keyword = (habit.autoSync.keyword || habit.name).toLowerCase().trim();
            if (keyword && (summary.includes(keyword) || description.includes(keyword))) {
              const alreadyDone = habit.completions && habit.completions.get(eventDateKey);
              if (!alreadyDone) {
                habit.completions.set(eventDateKey, true);
                await habit.save();
                syncResults.syncedCount++;
                const msg = `Google Calendar: Marked "${habit.name}" completed on ${eventDateKey} (${event.summary || keyword})`;
                syncResults.details.push(msg);
                addSyncLog(eventDateKey, habit.name, 'google_calendar', event.summary || keyword);
              }
            }
          }
        }
      } catch (calErr) {
        console.error('Google Calendar Multi-Day Sync Error:', calErr.message);
      }
    }

    // 2. Check Google Tasks (Multi-Day)
    const taskHabits = syncHabits.filter(h => h.autoSync.source === 'google_tasks');
    let habitListId = null;
    let existingTaskTitlesForToday = new Set();
    const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

    try {
      const taskListsRes = await tasksApi.tasklists.list({ maxResults: 20 });
      const taskLists = taskListsRes.data.items || [];
      const habitList = taskLists.find(
        (l) => l.title === '🎯 Habit Tracker' || l.title === 'Habit Tracker'
      );
      if (habitList) habitListId = habitList.id;

      let allCompletedTasks = [];
      for (const list of taskLists) {
        try {
          const tRes = await tasksApi.tasks.list({
            tasklist: list.id,
            showCompleted: true,
            showHidden: true,
            updatedMin: startIso,
            maxResults: 100,
          });
          const items = tRes.data.items || [];
          const completed = items.filter(t => t.status === 'completed');
          allCompletedTasks = allCompletedTasks.concat(completed);

          if (list.id === habitListId) {
            // Collect uncompleted task titles for today to avoid duplicate auto-push
            const activeTasks = items.filter(t => t.status !== 'completed');
            activeTasks.forEach(t => existingTaskTitlesForToday.add((t.title || '').toLowerCase().trim()));
          }
        } catch (tErr) {
          console.warn(`Could not list tasks for list ${list.id}:`, tErr.message);
        }
      }

      syncResults.tasksFound = allCompletedTasks.map(t => ({
        title: t.title || '(Untitled Task)',
        completedDate: (t.completed || t.updated || '').split('T')[0],
      }));

      for (const task of allCompletedTasks) {
        const rawDate = task.completed || task.due || task.updated;
        if (!rawDate) continue;
        const taskDateMs = new Date(rawDate).getTime() - clientTzOffsetMin * 60000;
        let taskDateKey = formatDateKey(new Date(taskDateMs));

        // If completion date is within our window, use it; otherwise fallback to todayDateKey if completed recently
        if (!dateKeys.includes(taskDateKey)) {
          taskDateKey = todayDateKey;
        }

        const title = (task.title || '').toLowerCase();
        const notes = (task.notes || '').toLowerCase();

        for (const habit of taskHabits) {
          const keyword = (habit.autoSync.keyword || habit.name).toLowerCase().trim();
          if (keyword && (title.includes(keyword) || notes.includes(keyword))) {
            const alreadyDone = habit.completions && habit.completions.get(taskDateKey);
            if (!alreadyDone) {
              habit.completions.set(taskDateKey, true);
              await habit.save();
              syncResults.syncedCount++;
              const msg = `Google Tasks: Marked "${habit.name}" completed on ${taskDateKey} (Task: ${task.title || keyword})`;
              syncResults.details.push(msg);
              addSyncLog(taskDateKey, habit.name, 'google_tasks', task.title || keyword);
            }
          }
        }
      }
    } catch (taskErr) {
      console.error('Google Tasks Multi-Day Sync Error:', taskErr.message);
    }

    // 3. Check Google Fit Metrics (Multi-Day Daily Bucketing)
    const fitHabits = syncHabits.filter(h => h.autoSync.source === 'google_fit');
    if (fitHabits.length > 0) {
      try {
        const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
        // Day duration in ms
        const oneDayMs = 86400000;
        const fitRes = await fitness.users.dataset.aggregate({
          userId: 'me',
          requestBody: {
            aggregateBy: [
              { dataTypeName: 'com.google.step_count.delta' },
              { dataTypeName: 'com.google.active_minutes' },
              { dataTypeName: 'com.google.calories.expended' },
            ],
            bucketByTime: { durationMillis: oneDayMs.toString() },
            startTimeMillis: rangeStartMs.toString(),
            endTimeMillis: rangeEndMs.toString(),
          },
        });

        const buckets = fitRes.data.bucket || [];
        for (const bucket of buckets) {
          const bucketStartMs = Number(bucket.startTimeMillis);
          const bucketDate = new Date(bucketStartMs - clientTzOffsetMin * 60000);
          const bucketDateKey = formatDateKey(bucketDate);

          if (!dateKeys.includes(bucketDateKey)) continue;

          let totalSteps = 0;
          let totalActiveMins = 0;
          let totalCalories = 0;

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

          syncResults.fitDataByDate[bucketDateKey] = {
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
              const alreadyDone = habit.completions && habit.completions.get(bucketDateKey);
              if (!alreadyDone) {
                habit.completions.set(bucketDateKey, true);
                await habit.save();
                syncResults.syncedCount++;
                const msg = `Google Fit: Marked "${habit.name}" completed on ${bucketDateKey} (${currentVal}/${target} ${metric})`;
                syncResults.details.push(msg);
                addSyncLog(bucketDateKey, habit.name, 'google_fit', `${currentVal}/${target} ${metric}`);
              }
            }
          }
        }
      } catch (fitErr) {
        console.error('Google Fit Multi-Day Sync Error:', fitErr.message);
      }
    }

    // 4. AUTOMATIC DAILY TASK ASSIGNMENT (Auto-Push to Google Tasks)
    // Automatically assigns & rolls over previous/today's uncompleted habits to Google Tasks so the user never has to click manually!
    if (shouldAutoPush) {
      try {
        if (!habitListId) {
          const newListRes = await tasksApi.tasklists.insert({
            requestBody: { title: '🎯 Habit Tracker' },
          });
          habitListId = newListRes.data.id;
        }

        const dueIso = new Date(`${todayDateKey}T23:59:59.000Z`).toISOString();

        for (const habit of habits) {
          const habitNameClean = habit.name.trim();
          const isDoneToday = habit.completions && habit.completions.get(todayDateKey);

          // Skip if already done today or already in Google Tasks
          if (isDoneToday || existingTaskTitlesForToday.has(habitNameClean.toLowerCase())) {
            continue;
          }

          // Ensure autoSync settings are attached
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
            tasklist: habitListId,
            requestBody: {
              title: habitNameClean,
              notes: `[Auto-Assigned] Category: ${habit.category} | Weekly Target: ${habit.targetPerWeek}d | Synced with Habit Tracker`,
              due: dueIso,
            },
          });

          existingTaskTitlesForToday.add(habitNameClean.toLowerCase());
          syncResults.autoPushedCount++;
          syncResults.autoPushedHabits.push(habitNameClean);
        }

        if (syncResults.autoPushedCount > 0) {
          syncResults.details.push(
            `⚡ Auto-Assigned: Added ${syncResults.autoPushedCount} habit(s) to Google Tasks for today (${todayDateKey})`
          );
        }
      } catch (autoPushErr) {
        console.error('Auto-Assign Google Tasks Error:', autoPushErr.message);
      }
    }

    // Persist new sync logs (limit to latest 100 entries)
    if (newLogs.length > 0) {
      user.syncLogs = [...(user.syncLogs || []), ...newLogs].slice(-100);
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
      recentLogs: (user.syncLogs || []).slice(-30).reverse(),
    });
  } catch (err) {
    console.error('Sync error:', err);
    if (isInvalidGrant(err)) {
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          user.isGoogleConnected = false;
          user.googleTokens = null;
          await user.save();
        }
      } catch {}
      return res.status(401).json({
        message: 'Google session expired or authorization was revoked. Please click "Reconnect Google" to continue.',
        requireReconnect: true,
      });
    }
    res.status(500).json({ message: err.message });
  }
});

// POST /api/google/push-tasks — Manual / explicit Push habits to Google Tasks
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
    const targetDateKey = req.body.dateKey || formatDateKey(nowClient);
    const dueIso = new Date(`${targetDateKey}T23:59:59.000Z`).toISOString();

    // 4. Fetch all user habits
    const habits = await Habit.find({ user: user._id });
    let pushedCount = 0;
    const pushedHabits = [];

    for (const habit of habits) {
      const habitNameClean = habit.name.trim();
      const isCompletedToday = habit.completions && habit.completions.get(targetDateKey);

      if (isCompletedToday || existingTitles.has(habitNameClean.toLowerCase())) {
        continue;
      }

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
          ? `Successfully assigned ${pushedCount} habit(s) to Google Tasks under "${habitList.title}"!`
          : `All habits are already active in Google Tasks or completed for today.`,
    });
  } catch (err) {
    console.error('Push to Google Tasks error:', err);
    if (isInvalidGrant(err)) {
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          user.isGoogleConnected = false;
          user.googleTokens = null;
          await user.save();
        }
      } catch {}
      return res.status(401).json({
        message: 'Google session expired or authorization was revoked. Please click "Reconnect Google" to continue.',
        requireReconnect: true,
      });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/google/history — Clear sync history logs
router.delete('/history', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.syncLogs = [];
    await user.save();
    res.json({ success: true, message: 'Sync history cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;



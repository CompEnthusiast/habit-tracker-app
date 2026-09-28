import { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Activity, RefreshCw, Unlink, ExternalLink, CheckCircle2, AlertCircle, ListPlus } from 'lucide-react';
import { getGoogleAuthUrl, getGoogleStatus, disconnectGoogle, syncGoogleHabits, pushHabitsToGoogleTasks } from '../api/google';

export default function GoogleSyncPanel({ habits = [], onHabitsUpdated }) {
  const [status, setStatus] = useState({ connected: false, email: null, lastSync: null });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info' | 'success' | 'error'

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await getGoogleStatus();
      setStatus(data);
      return data;
    } catch {
      setStatus({ connected: false, email: null, lastSync: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if redirected from Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_connected') === 'true') {
      setMessage('🎉 Google Account successfully connected!');
      setMessageType('success');
      // Clean up URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchStatus().then((currentStatus) => {
      // Auto-sync today if connected
      if (currentStatus?.connected) {
        handleSync(false);
      }
    });
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { url } = await getGoogleAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setMessage(err.message || 'Failed to start Google sign-in');
      setMessageType('error');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Calendar, Tasks, and Fit?')) return;
    try {
      setLoading(true);
      await disconnectGoogle();
      setStatus({ connected: false, email: null, lastSync: null });
      setMessage('Google account disconnected.');
      setMessageType('info');
    } catch (err) {
      setMessage(err.message || 'Failed to disconnect');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToGoogleTasks = async () => {
    try {
      setPushing(true);
      const res = await pushHabitsToGoogleTasks();
      if (res.success) {
        setMessage(res.message || '✅ Habits pushed to Google Tasks!');
        setMessageType('success');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to push habits to Google Tasks');
      setMessageType('error');
    } finally {
      setPushing(false);
    }
  };

  const handleSync = async (showToast = true) => {
    try {
      setSyncing(true);
      const res = await syncGoogleHabits();
      if (res.success) {
        if (res.habits && onHabitsUpdated) {
          onHabitsUpdated(res.habits);
        }
        await fetchStatus();
        if (showToast) {
          const count = res.results?.syncedCount || 0;
          if (count > 0) {
            setMessage(`✨ Synced! Auto-completed ${count} habit${count === 1 ? '' : 's'} from Google.`);
            setMessageType('success');
          } else {
            setMessage('Synced with Google. No new completed habits found for today.');
            setMessageType('info');
          }
        }
      }
    } catch (err) {
      if (showToast) {
        setMessage(err.message || 'Failed to sync with Google');
        setMessageType('error');
      }
    } finally {
      setSyncing(false);
    }
  };

  const syncHabitsCount = habits.filter(h => h.autoSync?.enabled && h.autoSync?.source !== 'none').length;

  return (
    <div
      className="p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Apps info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.connected ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.connected ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              </span>
              Google 2-Way Sync
            </span>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
              <Calendar size={12} className="text-blue-400" title="Google Calendar" />
              <CheckSquare size={12} className="text-amber-400" title="Google Tasks" />
              <Activity size={12} className="text-emerald-400" title="Google Fit" />
              <span className="text-[11px] font-medium text-gray-300">Calendar • Tasks • Fit</span>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            {status.connected ? (
              <span>
                Connected as <strong className="text-emerald-400 font-semibold">{status.email}</strong> • Habits sync directly with Google Tasks list <code className="text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded text-[11px]">🎯 Habit Tracker</code>
              </span>
            ) : (
              <span>Connect Google to auto-push habits to your Google Tasks app and auto-complete them when checked off.</span>
            )}
          </p>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {status.connected ? (
            <>
              <button
                onClick={handlePushToGoogleTasks}
                disabled={pushing || loading || syncing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 active:scale-95 transition-all disabled:opacity-50"
                title="Send today's habits to your Google Tasks app"
              >
                <ListPlus size={14} className={pushing ? 'animate-bounce' : ''} />
                {pushing ? 'Sending...' : '📤 Send to Google Tasks'}
              </button>

              <button
                onClick={() => handleSync(true)}
                disabled={syncing || loading || pushing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Status'}
              </button>

              <button
                onClick={handleDisconnect}
                disabled={loading || syncing || pushing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all"
                title="Disconnect Google Account"
              >
                <Unlink size={13} />
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 active:scale-95 transition-all shadow-lg"
            >
              <ExternalLink size={14} />
              Connect Google Apps
            </button>
          )}
        </div>
      </div>

      {/* Message / Toast Banner */}
      {message && (
        <div
          className={`mt-3 px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
            messageType === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : messageType === 'error'
              ? 'bg-red-500/15 border border-red-500/30 text-red-300'
              : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {messageType === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-[11px] underline ml-2 opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

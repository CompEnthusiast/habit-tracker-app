import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckSquare,
  Activity,
  RefreshCw,
  Unlink,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ListPlus,
  History,
  Zap,
  Clock,
  Settings2,
} from 'lucide-react';
import {
  getGoogleAuthUrl,
  getGoogleStatus,
  disconnectGoogle,
  syncGoogleHabits,
  pushHabitsToGoogleTasks,
  updateGoogleSettings,
} from '../api/google';
import SyncHistoryModal from './SyncHistoryModal';

export default function GoogleSyncPanel({ habits = [], onHabitsUpdated }) {
  const [status, setStatus] = useState({
    connected: false,
    email: null,
    lastSync: null,
    settings: {
      autoPushDailyTasks: true,
      autoSyncIntervalMins: 15,
      syncPastDaysCount: 7,
    },
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info' | 'success' | 'error'
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [syncDaysBack, setSyncDaysBack] = useState(7);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [autoPushEnabled, setAutoPushEnabled] = useState(true);

  const autoSyncTimerRef = useRef(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await getGoogleStatus();
      setStatus(data);
      if (data.settings) {
        setAutoPushEnabled(data.settings.autoPushDailyTasks !== false);
        setSyncDaysBack(data.settings.syncPastDaysCount || 7);
      }
      return data;
    } catch {
      setStatus({
        connected: false,
        email: null,
        lastSync: null,
        settings: { autoPushDailyTasks: true, autoSyncIntervalMins: 15, syncPastDaysCount: 7 },
        recentLogs: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if redirected from Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_connected') === 'true') {
      setMessage('🎉 Google Account successfully connected! Auto-assign & sync active.');
      setMessageType('success');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchStatus().then((currentStatus) => {
      // Auto-sync on app open if connected
      if (currentStatus?.connected) {
        handleSync({ daysBack: currentStatus.settings?.syncPastDaysCount || 7, showToast: false });
      }
    });
  }, []);

  // Periodic Auto-Sync Timer (runs in background reliably)
  useEffect(() => {
    if (!status.connected || !autoSyncEnabled) {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
      return;
    }

    const intervalMs = (status.settings?.autoSyncIntervalMins || 15) * 60 * 1000;
    autoSyncTimerRef.current = setInterval(() => {
      handleSync({ daysBack: syncDaysBack, showToast: false, isBackground: true });
    }, intervalMs);

    return () => {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
    };
  }, [status.connected, autoSyncEnabled, status.settings?.autoSyncIntervalMins, syncDaysBack]);

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
      setStatus({
        connected: false,
        email: null,
        lastSync: null,
        settings: {},
        recentLogs: [],
      });
      setMessage('Google account disconnected.');
      setMessageType('info');
    } catch (err) {
      setMessage(err.message || 'Failed to disconnect');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoPush = async (e) => {
    const val = e.target.checked;
    setAutoPushEnabled(val);
    try {
      await updateGoogleSettings({ autoPushDailyTasks: val });
      setMessage(
        val
          ? '⚡ Daily Auto-Assignment enabled! Habits will automatically roll over to Google Tasks.'
          : 'Daily Auto-Assignment paused.'
      );
      setMessageType('info');
    } catch (err) {
      console.error('Failed to update settings:', err);
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
      const isGrantError = (err.message || '').toLowerCase().includes('invalid_grant') || (err.message || '').toLowerCase().includes('expired') || (err.message || '').toLowerCase().includes('reconnect');
      if (isGrantError) {
        setStatus((prev) => ({ ...prev, connected: false, email: null }));
        setMessage('Google session expired or token was revoked. Click "Reconnect Google" below.');
      } else {
        setMessage(err.message || 'Failed to push habits to Google Tasks');
      }
      setMessageType('error');
    } finally {
      setPushing(false);
    }
  };

  const handleSync = async (opts = {}) => {
    const days = opts.daysBack || syncDaysBack;
    const showToast = opts.showToast !== undefined ? opts.showToast : true;

    try {
      setSyncing(true);
      const res = await syncGoogleHabits({
        daysBack: days,
        autoPush: autoPushEnabled,
      });

      if (res.success) {
        if (res.habits && onHabitsUpdated) {
          onHabitsUpdated(res.habits);
        }

        setStatus((prev) => ({
          ...prev,
          lastSync: new Date().toISOString(),
          recentLogs: res.recentLogs || prev.recentLogs,
        }));

        if (showToast) {
          const count = res.results?.syncedCount || 0;
          const autoPushed = res.results?.autoPushedCount || 0;

          if (count > 0 && autoPushed > 0) {
            setMessage(
              `✨ Synced! Completed ${count} habit(s) from past ${days} days & auto-assigned ${autoPushed} habit(s) to Google Tasks!`
            );
            setMessageType('success');
          } else if (count > 0) {
            setMessage(
              `✨ Synced! Auto-completed ${count} habit(s) across the past ${days} days from Google.`
            );
            setMessageType('success');
          } else if (autoPushed > 0) {
            setMessage(`⚡ Auto-assigned ${autoPushed} daily habit(s) to Google Tasks!`);
            setMessageType('success');
          } else {
            setMessage(`Synced with Google for past ${days} days. Everything is up to date.`);
            setMessageType('info');
          }
        }
      }
    } catch (err) {
      const isGrantError = (err.message || '').toLowerCase().includes('invalid_grant') || (err.message || '').toLowerCase().includes('expired') || (err.message || '').toLowerCase().includes('reconnect');
      if (isGrantError) {
        setStatus((prev) => ({ ...prev, connected: false, email: null }));
        setMessage('Google session expired or token was revoked. Click "Reconnect Google" below.');
      } else if (showToast) {
        setMessage(err.message || 'Failed to sync with Google');
      }
      setMessageType('error');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isExpiredOrInvalid = message.toLowerCase().includes('expired') || message.toLowerCase().includes('reconnect') || message.toLowerCase().includes('invalid_grant');

  return (
    <>
      <div className="p-5 rounded-xl border-2 border-[#494848] bg-[#1E1D1C] shadow-[5px_5px_0px_#000000] relative overflow-hidden transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left: Apps info & Status */}
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      status.connected ? 'bg-[#FF7A00]' : 'bg-[#C1C1C1]'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      status.connected ? 'bg-[#FF7A00]' : 'bg-[#494848]'
                    }`}
                  />
                </span>
                GOOGLE 2-WAY SYNC & AUTO-ASSIGN
              </span>

              <div className="flex items-center gap-1.5 text-xs text-[#C1C1C1] bg-[#100E0C] px-2.5 py-1 rounded border-2 border-[#494848] shadow-[2px_2px_0px_#000000]">
                <Calendar size={12} className="text-[#C1C1C1]" title="Google Calendar" />
                <CheckSquare size={12} className="text-[#FF7A00]" title="Google Tasks" />
                <Activity size={12} className="text-[#FFA64D]" title="Google Fit" />
                <span className="text-[10px] font-mono font-bold text-[#C1C1C1]">CALENDAR • TASKS • FIT</span>
              </div>

              {status.connected && (
                <span className="brutal-badge-orange rounded">
                  AUTO-ASSIGN ACTIVE
                </span>
              )}
            </div>

            <p className="text-xs text-[#C1C1C1] leading-relaxed">
              {status.connected ? (
                <span>
                  Linked with <strong className="text-[#FF7A00] font-bold">{status.email}</strong> •
                  Habits auto-sync & roll over to Google Tasks list{' '}
                  <code className="text-black bg-[#FF7A00] font-mono font-bold px-1.5 py-0.5 border border-black rounded text-[11px]">
                    🎯 Habit Tracker
                  </code>
                  . Last sync: <strong className="text-white font-mono">{formatLastSync(status.lastSync)}</strong>.
                </span>
              ) : (
                <span>
                  Connect Google to automatically push daily habits to Google Tasks and sync past task check-ins across Calendar, Tasks, and Fit.
                </span>
              )}
            </p>

            {/* Quick Auto-Assign / Sync Settings Bar */}
            {status.connected && (
              <div className="flex items-center gap-4 text-xs text-[#C1C1C1] pt-1 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none font-bold text-xs">
                  <input
                    type="checkbox"
                    checked={autoPushEnabled}
                    onChange={handleToggleAutoPush}
                    className="w-4 h-4 accent-[#FF7A00] rounded cursor-pointer"
                  />
                  <span>Auto-Push Tasks Daily</span>
                </label>

                <div className="flex items-center gap-1.5 text-[#C1C1C1] text-xs font-mono">
                  <span>CATCH-UP:</span>
                  <select
                    value={syncDaysBack}
                    onChange={(e) => setSyncDaysBack(Number(e.target.value))}
                    className="bg-[#100E0C] border-2 border-[#494848] text-white rounded px-2 py-0.5 text-xs font-bold focus:outline-none focus:border-[#FF7A00] shadow-[2px_2px_0px_#000000]"
                  >
                    <option value={1}>Today Only</option>
                    <option value={3}>Past 3 Days</option>
                    <option value={7}>Past 7 Days</option>
                    <option value={14}>Past 14 Days</option>
                    <option value={30}>Past 30 Days</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right: Action Buttons — 2-column grid on narrow, flex row on wide */}
          <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2 w-full lg:w-auto lg:items-center">
            {status.connected ? (
              <>
                {/* Sync History */}
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="brutal-btn brutal-btn-ghost px-3 py-2 text-xs col-span-1"
                  title="View past tasks synced from Google"
                >
                  <History size={14} className="text-[#FF7A00]" />
                  PAST TASKS
                  {status.recentLogs?.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 bg-[#FF7A00] text-black font-black text-[10px] border border-black shadow-[1px_1px_0px_#000] leading-none">
                      {status.recentLogs.length}
                    </span>
                  )}
                </button>

                {/* Manual Push */}
                <button
                  onClick={handlePushToGoogleTasks}
                  disabled={pushing || loading || syncing}
                  className="brutal-btn px-3 py-2 text-xs col-span-1 bg-[#100E0C] text-[#FF7A00] border-2 border-[#FF7A00] hover:bg-[#FF7A00] hover:text-black hover:shadow-[5px_5px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  title="Manually push today's habits to Google Tasks"
                >
                  <ListPlus size={14} className={pushing ? 'animate-bounce' : ''} />
                  {pushing ? 'ASSIGNING...' : 'ASSIGN TO TASKS'}
                </button>

                {/* Sync */}
                <button
                  onClick={() => handleSync({ daysBack: syncDaysBack, showToast: true })}
                  disabled={syncing || loading || pushing}
                  className="brutal-btn brutal-btn-primary px-4 py-2 text-xs col-span-1"
                  title={`Sync completions for the past ${syncDaysBack} days`}
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'SYNCING...' : `SYNC (${syncDaysBack}D)`}
                </button>

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  disabled={loading || syncing || pushing}
                  className="brutal-btn px-3 py-2 text-xs col-span-1 bg-[#100E0C] text-[#C1C1C1] border-2 border-[#494848] hover:text-[#FF4444] hover:border-[#FF4444] hover:shadow-[4px_4px_0px_#FF4444] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  title="Disconnect Google Account"
                >
                  <Unlink size={13} />
                  DISCONNECT
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="brutal-btn brutal-btn-primary px-5 py-2.5 text-xs col-span-2"
              >
                <ExternalLink size={14} />
                CONNECT GOOGLE APPS
              </button>
            )}
          </div>
        </div>

        {/* Message / Toast Banner */}
        {message && (
          <div
            className={`mt-4 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 border-2 shadow-[3px_3px_0px_#000000] ${
              messageType === 'success'
                ? 'bg-[#100E0C] border-[#FF7A00] text-[#FF7A00]'
                : messageType === 'error'
                ? 'bg-[#100E0C] border-[#FF4444] text-[#FF4444]'
                : 'bg-[#100E0C] border-[#494848] text-[#C1C1C1]'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {messageType === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{message}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isExpiredOrInvalid && (
                <button
                  onClick={handleConnect}
                  className="brutal-btn brutal-btn-primary px-3 py-1 text-xs"
                >
                  <ExternalLink size={12} />
                  RECONNECT GOOGLE NOW
                </button>
              )}
              <button
                onClick={() => setMessage('')}
                className="text-[11px] font-mono uppercase underline hover:no-underline hover:font-black tracking-wider transition-all"
              >
                [DISMISS]
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Sync History Modal */}
      <SyncHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        recentLogs={status.recentLogs || []}
        onClearHistory={() => setStatus((prev) => ({ ...prev, recentLogs: [] }))}
        onTriggerSync={(opts) => handleSync({ ...opts, showToast: true })}
        syncing={syncing}
        status={status}
      />
    </>
  );
}

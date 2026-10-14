/**
 * SyncStatusBadge — Small indicator showing sync state
 * 
 * States: Synced / Syncing / Offline / Error
 * Includes manual "Sync Now" button
 */
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';

export default function SyncStatusBadge({
  isOnline,
  syncStatus, // 'synced' | 'syncing' | 'error' | 'idle'
  lastSyncTime,
  onSyncNow,
  pendingCount = 0,
}) {
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        label: 'OFFLINE',
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10',
        borderColor: 'border-amber-400/30',
      };
    }
    if (syncStatus === 'syncing') {
      return {
        icon: RefreshCw,
        label: 'SYNCING',
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        borderColor: 'border-blue-400/30',
        animate: true,
      };
    }
    if (syncStatus === 'error') {
      return {
        icon: AlertCircle,
        label: 'ERROR',
        color: 'text-red-400',
        bgColor: 'bg-red-400/10',
        borderColor: 'border-red-400/30',
      };
    }
    return {
      icon: CheckCircle2,
      label: 'SYNCED',
      color: 'text-[--color-primary]',
      bgColor: 'bg-[--color-primary]/10',
      borderColor: 'border-[--color-primary]/30',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatTime = (ts) => {
    if (!ts) return 'Never';
    const diff = Math.round((Date.now() - ts) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${config.bgColor} ${config.borderColor} transition-all`}>
      <Icon
        size={12}
        className={`${config.color} ${config.animate ? 'animate-spin' : ''}`}
      />
      <span className={`text-[10px] font-mono font-black uppercase ${config.color}`}>
        {config.label}
      </span>

      {lastSyncTime && isOnline && syncStatus !== 'syncing' && (
        <span className="text-[9px] font-mono text-[--color-silver]">
          {formatTime(lastSyncTime)}
        </span>
      )}

      {pendingCount > 0 && (
        <span className="text-[9px] font-mono font-bold text-amber-400">
          ({pendingCount} queued)
        </span>
      )}

      {isOnline && syncStatus !== 'syncing' && (
        <button
          onClick={onSyncNow}
          className="ml-1 text-[--color-silver] hover:text-[--color-primary] transition-colors"
          title="Sync now"
          aria-label="Sync now"
        >
          <Cloud size={11} />
        </button>
      )}
    </div>
  );
}

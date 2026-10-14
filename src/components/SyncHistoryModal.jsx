import { useState } from 'react';
import {
  X,
  History,
  CheckCircle2,
  Calendar,
  CheckSquare,
  Activity,
  Trash2,
  RefreshCw,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import { clearGoogleSyncHistory } from '../api/google';

export default function SyncHistoryModal({
  isOpen,
  onClose,
  recentLogs = [],
  onClearHistory,
  onTriggerSync,
  syncing = false,
  status = {},
}) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [clearing, setClearing] = useState(false);

  if (!isOpen) return null;

  const filteredLogs = recentLogs.filter((log) => {
    const matchesFilter = filter === 'all' || log.source === filter;
    const matchesSearch =
      !searchTerm ||
      (log.habitName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.dateKey || '').includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const key = log.dateKey || 'Unknown Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const handleClear = async () => {
    if (!window.confirm('Clear all Google sync history logs?')) return;
    try {
      setClearing(true);
      await clearGoogleSyncHistory();
      if (onClearHistory) onClearHistory();
    } catch (e) {
      alert('Failed to clear sync history: ' + e.message);
    } finally {
      setClearing(false);
    }
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'google_tasks':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#100E0C] bg-[#FF7A00] px-1.5 py-0.5 border border-[#FF7A00] uppercase font-mono">
            <CheckSquare size={9} /> TASKS
          </span>
        );
      case 'google_calendar':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#C1C1C1] bg-[#100E0C] px-1.5 py-0.5 border border-[#494848] uppercase font-mono">
            <Calendar size={9} /> CAL
          </span>
        );
      case 'google_fit':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#FFA64D] bg-[#FFA64D]/10 px-1.5 py-0.5 border border-[#FFA64D] uppercase font-mono">
            <Activity size={9} /> FIT
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#FF7A00] bg-[#FF7A00]/10 px-1.5 py-0.5 border border-[#FF7A00] uppercase font-mono">
            <Sparkles size={9} /> SYNC
          </span>
        );
    }
  };

  const formatDateLabel = (dateKey) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    if (dateKey === today) return `TODAY (${dateKey})`;
    if (dateKey === yesterday) return `YESTERDAY (${dateKey})`;
    return dateKey.toUpperCase();
  };

  const FILTER_TABS = [
    { id: 'all', label: `ALL (${recentLogs.length})` },
    { id: 'google_tasks', label: 'TASKS' },
    { id: 'google_calendar', label: 'CAL' },
    { id: 'google_fit', label: 'FIT' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#1E1D1C] border-2 border-[#FF7A00] overflow-hidden"
        style={{ boxShadow: '6px 6px 0px #FF7A00' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#FF7A00]/40 bg-[#100E0C]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF7A00] border-2 border-[#FF7A00]" style={{ boxShadow: '2px 2px 0px #000' }}>
              <History size={16} className="text-[#100E0C]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono flex items-center gap-2">
                SYNC HISTORY
                <span className="text-[10px] px-2 py-0.5 border-2 border-[#FF7A00] bg-[#FF7A00]/20 text-[#FF7A00] font-mono">
                  {recentLogs.length} LOGGED
                </span>
              </h2>
              <p className="text-[10px] text-[#FF7A00] font-mono uppercase tracking-wider">
                // GOOGLE TASKS · CALENDAR · FIT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[#494848] text-[#C1C1C1] hover:border-[#FF7A00] hover:text-[#FF7A00] transition-all"
            style={{ boxShadow: '2px 2px 0px #000' }}
            aria-label="Close sync history"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-3 bg-[#100E0C] border-b-2 border-[#494848] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTriggerSync && onTriggerSync({ daysBack: 7 })}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-[#100E0C] bg-[#FF7A00] border-2 border-[#FF7A00] uppercase tracking-wider transition-all disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px] font-mono"
              style={{ boxShadow: '3px 3px 0px #000' }}
              title="Catch up completions from Google for the past 7 days"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'SYNCING...' : 'CATCH-UP 7 DAYS'}
            </button>
            <button
              onClick={() => onTriggerSync && onTriggerSync({ daysBack: 14 })}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-[#C1C1C1] bg-[#1E1D1C] border-2 border-[#494848] hover:border-[#FF7A00] hover:text-[#FF7A00] uppercase tracking-wider transition-all disabled:opacity-50 font-mono"
            >
              PAST 14 DAYS
            </button>
          </div>

          {recentLogs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black text-[#FF4444] border-2 border-[#FF4444]/40 hover:border-[#FF4444] hover:bg-[#FF4444]/10 uppercase tracking-wider transition-all font-mono"
              title="Clear all past sync logs"
            >
              <Trash2 size={11} />
              {clearing ? 'CLEARING...' : 'CLEAR LOGS'}
            </button>
          )}
        </div>

        {/* Filter & Search */}
        <div className="px-5 py-3 border-b-2 border-[#494848] flex flex-col sm:flex-row items-center gap-2.5 justify-between bg-[#1E1D1C]">
          <div className="flex items-center gap-1 p-1 border-2 border-[#494848] bg-[#100E0C] w-full sm:w-auto overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all font-mono ${
                  filter === tab.id
                    ? 'bg-[#FF7A00] text-[#100E0C]'
                    : 'text-[#C1C1C1] hover:text-[#FF7A00]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-48">
            <Search size={12} className="absolute left-3 top-2.5 text-[#C1C1C1]" />
            <input
              type="text"
              placeholder="SEARCH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border-2 border-[#494848] bg-[#100E0C] text-[10px] text-white placeholder-[#C1C1C1]/50 focus:outline-none focus:border-[#FF7A00] uppercase font-mono"
            />
          </div>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#100E0C]/40">
          {Object.keys(groupedLogs).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 border-2 border-[#FF7A00] bg-[#1E1D1C] flex items-center justify-center text-[#FF7A00] mb-3"
                style={{ boxShadow: '3px 3px 0px #FF7A00' }}
              >
                <Clock size={22} />
              </div>
              <p className="text-sm font-black text-white uppercase font-mono tracking-widest">NO ENTRIES FOUND</p>
              <p className="text-[10px] text-[#C1C1C1] mt-1 max-w-sm font-mono uppercase">
                // Tasks & events appear here after sync
              </p>
              <button
                onClick={() => onTriggerSync && onTriggerSync({ daysBack: 7 })}
                disabled={syncing}
                className="mt-4 px-4 py-2 text-xs font-black text-[#100E0C] bg-[#FF7A00] border-2 border-[#FF7A00] uppercase tracking-widest transition-all active:translate-x-[1px] active:translate-y-[1px] font-mono"
                style={{ boxShadow: '3px 3px 0px #000' }}
              >
                RUN 7-DAY SYNC NOW
              </button>
            </div>
          ) : (
            Object.entries(groupedLogs).map(([dateKey, items]) => (
              <div key={dateKey} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#FF7A00] uppercase tracking-widest font-mono">
                    📅 {formatDateLabel(dateKey)}
                  </span>
                  <span className="text-[10px] text-[#C1C1C1] font-mono">({items.length} completed)</span>
                  <div className="flex-1 h-[2px] bg-[#FF7A00]/30" />
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.habitName}-${idx}`}
                      className="flex items-center justify-between p-3 border-2 border-[#494848] bg-[#1E1D1C] hover:border-[#FF7A00] transition-all"
                      style={{ boxShadow: '2px 2px 0px #000' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 border-2 border-[#FF7A00] bg-[#FF7A00]/15 flex items-center justify-center text-[#FF7A00] shrink-0"
                          style={{ boxShadow: '2px 2px 0px #FF7A00' }}
                        >
                          <CheckCircle2 size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase font-mono tracking-wider">{item.habitName}</span>
                            {getSourceBadge(item.source)}
                          </div>
                          {item.details && (
                            <p className="text-[10px] text-[#C1C1C1] mt-0.5 font-mono">{item.details}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#C1C1C1] font-mono">
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'AUTO-SYNCED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t-2 border-[#494848] bg-[#1E1D1C] flex items-center justify-between">
          <span className="text-[10px] text-[#C1C1C1] font-mono uppercase">
            CONNECTED: <strong className="text-[#FF7A00]">{status.email || 'GOOGLE ACCOUNT'}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border-2 border-[#494848] hover:border-[#FF7A00] text-white text-xs font-black uppercase tracking-widest transition-all font-mono"
            style={{ boxShadow: '2px 2px 0px #000' }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

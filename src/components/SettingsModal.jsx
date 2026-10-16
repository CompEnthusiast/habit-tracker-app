import React, { useState } from 'react';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
  Eye,
  Bell,
  Download,
  Upload,
  Trash2,
  Wrench,
  Sparkles,
  Check,
  AlertTriangle
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { requestNotificationPermission, getNotificationPermission } from '../utils/pwaManager';

export default function SettingsModal({
  isOpen,
  onClose,
  habits = [],
  dayRecords = [],
  onImportData,
  onResetAllData,
  // Debug controls
  onSimulateNextDay,
  onAddDebugXP,
  onGrantDebugBadge
}) {
  const [soundEnabled, setSoundEnabled] = useState(soundEffects.soundEnabled);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [language, setLanguage] = useState('hinglish');
  const [theme, setTheme] = useState('neo-dark');
  const [morningReminderTime, setMorningReminderTime] = useState('08:00');
  const [eveningReminderTime, setEveningReminderTime] = useState('20:00');
  const [pushStatus, setPushStatus] = useState(getNotificationPermission());
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = (enabled) => {
    setSoundEnabled(enabled);
    soundEffects.setSoundEnabled(enabled);
  };

  const handleRequestPush = async () => {
    const res = await requestNotificationPermission();
    setPushStatus(res);
  };

  const handleExportJSON = () => {
    const exportBundle = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      habits,
      dayRecords
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-rpg-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleExportCSV = () => {
    let csv = 'Habit ID,Title,Category,Priority,Frequency,Completed\n';
    habits.forEach((h) => {
      csv += `"${h._id}","${(h.title || h.name || '').replace(/"/g, '""')}","${h.category || ''}","${h.priority || ''}","${h.frequency || ''}",${Boolean(h.completed)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-rpg-habits-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (parsed.habits && onImportData) {
          onImportData(parsed);
          soundEffects.playVictoryFanfare();
          alert('Data imported successfully!');
        } else {
          alert('Invalid backup file format');
        }
      } catch (err) {
        alert('Failed to parse backup JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#100E0C] border-2 border-[#494848] shadow-[6px_6px_0px_#000000] text-stone-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#494848] bg-[#1E1D1C]">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-[#FF7A00] bg-[#FF7A00]/20 text-[#FF7A00]">
              <Settings size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">System Settings</h2>
              <p className="text-xs text-stone-400">Audio, Motion, Notifications, Export/Import & Debug</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-stone-600 bg-stone-800 hover:bg-stone-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Audio & Motion Section */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Audio & Accessibility
            </h3>

            <div className="flex items-center justify-between py-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 size={18} className="text-[#FF7A00]" />
                ) : (
                  <VolumeX size={18} className="text-stone-500" />
                )}
                <div>
                  <span className="text-xs font-bold text-white block">RPG Sound Effects</span>
                  <span className="text-[11px] text-stone-400">Audio cues for completions, fanfare & badges</span>
                </div>
              </div>
              <button
                onClick={() => handleToggleSound(!soundEnabled)}
                className={`px-3 py-1 text-xs font-black uppercase border-2 transition ${
                  soundEnabled
                    ? 'border-[#FF7A00] bg-[#FF7A00] text-black shadow-[2px_2px_0px_#000]'
                    : 'border-stone-700 bg-stone-900 text-stone-400'
                }`}
              >
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-stone-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Reduced Motion</span>
                  <span className="text-[11px] text-stone-400">Disables screen confetti and floating animations</span>
                </div>
              </div>
              <button
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`px-3 py-1 text-xs font-black uppercase border-2 transition ${
                  reducedMotion
                    ? 'border-[#FF7A00] bg-[#FF7A00] text-black shadow-[2px_2px_0px_#000]'
                    : 'border-stone-700 bg-stone-900 text-stone-400'
                }`}
              >
                {reducedMotion ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Language & Theme Section */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Localization & Theme
            </h3>

            <div className="flex items-center justify-between py-2 border-b border-stone-800">
              <span className="text-xs font-bold text-white">App Language:</span>
              <div className="flex gap-2">
                {['english', 'hinglish', 'hindi'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1 text-xs font-black uppercase border transition ${
                      language === lang
                        ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                        : 'border-stone-700 bg-stone-900 text-stone-400'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-bold text-white">Theme Palette:</span>
              <div className="flex gap-2">
                {[
                  { id: 'neo-dark', label: 'Neo Dark (#100E0C)' },
                  { id: 'neo-light', label: 'Paper White' },
                  { id: 'neo-orange', label: 'Electric Orange' }
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id)}
                    className={`px-2.5 py-1 text-xs font-bold border transition ${
                      theme === th.id
                        ? 'border-[#FF7A00] bg-[#FF7A00] text-black'
                        : 'border-stone-700 bg-stone-900 text-stone-400'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#FF7A00]" />
                <h3 className="text-xs font-black uppercase text-white tracking-wider">
                  Reminders & Push Notifications
                </h3>
              </div>
              {pushStatus !== 'granted' && (
                <button
                  onClick={handleRequestPush}
                  className="px-3 py-1 bg-[#FF7A00] text-black font-black text-xs uppercase border border-black hover:bg-[#ff8f26]"
                >
                  Enable Push
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 mb-1 uppercase">
                  Morning Habit Check-In:
                </label>
                <input
                  type="time"
                  value={morningReminderTime}
                  onChange={(e) => setMorningReminderTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-900 border-2 border-stone-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 mb-1 uppercase">
                  Evening Reflection Reminder:
                </label>
                <input
                  type="time"
                  value={eveningReminderTime}
                  onChange={(e) => setEveningReminderTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-900 border-2 border-stone-700 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Data Backup & Restore */}
          <div className="p-4 bg-[#1E1D1C] border-2 border-[#494848] space-y-3">
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Data Backup & Restore
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-stone-800 border-2 border-stone-600 hover:border-[#FF7A00] text-xs font-bold uppercase transition flex items-center gap-1.5"
              >
                <Download size={14} /> Export Backup (JSON)
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-stone-800 border-2 border-stone-600 hover:border-[#FF7A00] text-xs font-bold uppercase transition flex items-center gap-1.5"
              >
                <Download size={14} /> Export Habits (CSV)
              </button>
              <label className="px-3 py-1.5 bg-stone-800 border-2 border-stone-600 hover:border-[#FF7A00] text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer">
                <Upload size={14} /> Import Backup (JSON)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
            {exportSuccess && (
              <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check size={14} /> Export downloaded successfully!
              </p>
            )}
          </div>

          {/* Debug Testing Panel */}
          <div className="p-4 bg-amber-950/20 border-2 border-amber-800 space-y-3">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <Wrench size={16} /> Debug & Verification Panel
            </h3>
            <p className="text-[11px] text-stone-400">
              Simulate midnight date advances, add XP, and test badge unlocks instantly.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onSimulateNextDay}
                className="px-3 py-1.5 bg-amber-600 text-black font-black text-xs uppercase border border-black hover:bg-amber-500 shadow-[2px_2px_0px_#000]"
              >
                Simulate Next Day ⏩
              </button>
              <button
                onClick={() => onAddDebugXP(100)}
                className="px-3 py-1.5 bg-stone-800 border border-amber-600 text-amber-300 font-bold text-xs uppercase hover:bg-stone-700"
              >
                +100 XP
              </button>
              <button
                onClick={() => onGrantDebugBadge('master_discipline')}
                className="px-3 py-1.5 bg-stone-800 border border-amber-600 text-amber-300 font-bold text-xs uppercase hover:bg-stone-700"
              >
                Grant &quot;Master&quot; Badge
              </button>
            </div>
          </div>

          {/* Danger Zone: Delete All Data */}
          <div className="p-4 bg-rose-950/30 border-2 border-rose-800 space-y-3">
            <h3 className="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} /> Danger Zone
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Delete All Data</span>
                <span className="text-[11px] text-stone-400">
                  Wipe all IndexedDB day records, habits, streaks, and reset to fresh installation.
                </span>
              </div>
              {showConfirmReset ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onResetAllData) onResetAllData();
                      setShowConfirmReset(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-rose-600 text-white font-black text-xs uppercase border border-black hover:bg-rose-500"
                  >
                    Confirm Wipe
                  </button>
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="px-2 py-1.5 bg-stone-800 text-stone-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="px-3 py-1.5 bg-rose-950 border border-rose-600 text-rose-300 hover:bg-rose-900 text-xs font-bold uppercase transition flex items-center gap-1"
                >
                  <Trash2 size={14} /> Wipe All Data
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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

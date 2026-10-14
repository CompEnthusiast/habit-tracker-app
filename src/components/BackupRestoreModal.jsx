import { useState, useRef } from 'react';
import { Download, Upload, ShieldCheck, X, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createHabit } from '../api/habits';

export default function BackupRestoreModal({ isOpen, onClose, habits = [], onHabitsReload }) {
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(
        {
          appName: 'HabitTracker',
          version: '2.0',
          exportedAt: new Date().toISOString(),
          habits,
        },
        null,
        2
      );
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HabitTracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setFeedback({ message: 'Backup JSON downloaded successfully!', type: 'success' });
    } catch (e) {
      setFeedback({ message: 'Export failed: ' + e.message, type: 'error' });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImporting(true);
        const parsed = JSON.parse(event.target.result);
        const importedHabits = parsed.habits || (Array.isArray(parsed) ? parsed : null);

        if (!Array.isArray(importedHabits) || importedHabits.length === 0) {
          throw new Error('Invalid backup file: no habit list found.');
        }

        let createdCount = 0;
        for (const item of importedHabits) {
          const habitData = {
            name: item.name,
            category: item.category || 'General',
            color: item.color || 'primary',
            targetPerWeek: item.targetPerWeek || 7,
            reminderEnabled: Boolean(item.reminderEnabled),
            reminderTime: item.reminderTime || '',
            autoSync: item.autoSync || { enabled: false, source: 'none' },
          };
          await createHabit(habitData);
          createdCount++;
        }

        setFeedback({
          message: `Successfully imported ${createdCount} habit(s)!`,
          type: 'success',
        });
        if (onHabitsReload) onHabitsReload();
      } catch (err) {
        setFeedback({ message: 'Import failed: ' + err.message, type: 'error' });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div
        className="w-full max-w-md bg-[#1E1D1C] border-2 border-[#FF7A00] overflow-hidden"
        style={{ boxShadow: '6px 6px 0px #FF7A00' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#FF7A00]/40 bg-[#100E0C]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF7A00] border-2 border-[#FF7A00]" style={{ boxShadow: '2px 2px 0px #000' }}>
              <Database size={16} className="text-[#100E0C]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono">DATA BACKUP</h2>
              <p className="text-[10px] text-[#FF7A00] font-mono uppercase tracking-wider">// EXPORT OR RESTORE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[#494848] text-[#C1C1C1] hover:border-[#FF7A00] hover:text-[#FF7A00] transition-all"
            style={{ boxShadow: '2px 2px 0px #000' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Feedback banner */}
          {feedback.message && (
            <div
              className={`p-3 text-xs flex items-center gap-2 border-2 font-mono uppercase tracking-wider ${
                feedback.type === 'success'
                  ? 'bg-[#FF7A00]/10 border-[#FF7A00] text-[#FF7A00]'
                  : 'bg-[#FF4444]/10 border-[#FF4444] text-[#FF4444]'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Export Card */}
          <div
            className="p-4 border-2 border-[#494848] bg-[#100E0C] flex items-center justify-between hover:border-[#FF7A00] transition-all"
            style={{ boxShadow: '3px 3px 0px #000' }}
          >
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <ShieldCheck size={13} className="text-[#FF7A00]" />
                EXPORT FULL BACKUP
              </h3>
              <p className="text-[10px] text-[#C1C1C1] mt-0.5 font-mono">
                {habits.length} habits → JSON file
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-[#100E0C] bg-[#FF7A00] border-2 border-[#FF7A00] uppercase tracking-wider shrink-0 active:translate-x-[1px] active:translate-y-[1px] font-mono"
              style={{ boxShadow: '3px 3px 0px #000' }}
            >
              <Download size={12} />
              EXPORT
            </button>
          </div>

          {/* Import Card */}
          <div
            className="p-4 border-2 border-[#494848] bg-[#100E0C] flex items-center justify-between hover:border-[#FF7A00] transition-all"
            style={{ boxShadow: '3px 3px 0px #000' }}
          >
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <Upload size={13} className="text-[#FFA64D]" />
                RESTORE FROM BACKUP
              </h3>
              <p className="text-[10px] text-[#C1C1C1] mt-0.5 font-mono">
                Upload previously exported .json
              </p>
            </div>
            <label
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-[#1E1D1C] border-2 border-[#494848] hover:border-[#FF7A00] hover:text-[#FF7A00] uppercase tracking-wider cursor-pointer shrink-0 transition-all font-mono"
              style={{ boxShadow: '3px 3px 0px #000' }}
            >
              <Upload size={12} />
              {importing ? 'RESTORING...' : 'RESTORE'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t-2 border-[#494848] bg-[#100E0C] flex justify-end">
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

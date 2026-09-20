import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportData';

export default function ExportMenu({ habits, monthDaysMap, daysInMonth, monthName, year }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doExport = async (type) => {
    setExporting(type);
    setOpen(false);
    const params = { habits, monthDaysMap, daysInMonth, monthName, year };
    await new Promise(r => setTimeout(r, 100)); // let UI update
    if (type === 'excel') exportToExcel(params);
    if (type === 'pdf')   exportToPDF(params);
    setExporting(null);
  };

  if (habits.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!!exporting}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 border border-white/10 hover:border-white/20"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {exporting ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Download size={15} className="text-gray-300" />
        )}
        <span className="text-gray-300">{exporting ? 'Exporting…' : 'Export'}</span>
        <ChevronDown size={13} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50"
          style={{ background: 'linear-gradient(135deg, #1e1e2e, #252535)' }}
        >
          <div className="p-1.5">
            <button
              onClick={() => doExport('excel')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                <FileSpreadsheet size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200 group-hover:text-white">Excel (.xlsx)</p>
                <p className="text-[10px] text-gray-600">Full grid + weekly summary</p>
              </div>
            </button>

            <button
              onClick={() => doExport('pdf')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
                <FileText size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200 group-hover:text-white">PDF Report</p>
                <p className="text-[10px] text-gray-600">Beautiful dark-theme report</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

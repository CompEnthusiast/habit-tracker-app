import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Calendar, CheckSquare } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportData';

export default function ExportMenu({
  habits = [],
  monthDaysMap = {},
  daysInMonth = 31,
  monthName = 'Current',
  year = new Date().getFullYear(),
  currentDay = new Date().getDate(),
  moodStats = { great: 10, good: 6, neutral: 3, tough: 1 },
  userXP = 1250,
  userLevel = 4,
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [pdfRange, setPdfRange] = useState('month'); // 'today' | 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doExport = async (type) => {
    setExporting(type);
    setOpen(false);
    const params = {
      habits,
      monthDaysMap,
      daysInMonth,
      monthName,
      year,
      currentDay: currentDay || new Date().getDate(),
      dateRangeType: pdfRange,
      customStartDate: customStart,
      customEndDate: customEnd,
      moodStats,
      userXP,
      userLevel,
    };
    await new Promise((r) => setTimeout(r, 120));
    if (type === 'excel') exportToExcel(params);
    if (type === 'pdf') exportToPDF(params);
    setExporting(null);
  };

  if (habits.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!exporting}
        className="flex items-center gap-2 px-4 py-2 font-black text-xs uppercase tracking-widest border-2 border-[#494848] bg-[#1E1D1C] hover:border-[#FF7A00] text-[#C1C1C1] hover:text-[#FF7A00] transition-all font-mono active:translate-x-[1px] active:translate-y-[1px]"
        style={{ boxShadow: '3px 3px 0px #000' }}
      >
        {exporting ? (
          <div className="w-3.5 h-3.5 border-2 border-[#FF7A00]/30 border-t-[#FF7A00] rounded-full animate-spin" />
        ) : (
          <Download size={13} className="text-[#FF7A00]" />
        )}
        <span>{exporting ? 'EXPORTING…' : 'EXPORT'}</span>
        <ChevronDown size={11} className={`text-[#C1C1C1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 border-2 border-[#FF7A00] bg-[#1E1D1C] overflow-hidden z-50 p-2.5 space-y-2.5 shadow-[4px_4px_0px_#FF7A00]"
        >
          {/* PDF Range Selector */}
          <div className="p-2 border border-[#494848] bg-[#100E0C]">
            <p className="text-[10px] font-mono font-black text-[#FF7A00] uppercase mb-1.5 flex items-center gap-1">
              <Calendar size={11} />
              PDF RANGE SELECTOR
            </p>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: '7D' },
                { id: 'month', label: 'Month' },
                { id: 'custom', label: 'Custom' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPdfRange(r.id)}
                  className={`text-[9px] font-mono font-bold py-1 px-1 border uppercase text-center transition-all ${
                    pdfRange === r.id
                      ? 'border-[#FF7A00] bg-[#FF7A00] text-black font-black'
                      : 'border-[#494848] text-[#C1C1C1] hover:text-white hover:border-[#FF7A00]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom Range Picker */}
            {pdfRange === 'custom' && (
              <div className="mt-2 pt-2 border-t border-[#494848] space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono text-[#C1C1C1]">
                  <span>START:</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-[#1E1D1C] border border-[#494848] text-white px-1.5 py-0.5 text-[9px] font-mono outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-[#C1C1C1]">
                  <span>END:</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-[#1E1D1C] border border-[#494848] text-white px-1.5 py-0.5 text-[9px] font-mono outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <button
              onClick={() => doExport('pdf')}
              className="w-full flex items-center gap-3 px-3 py-2 border-2 border-transparent hover:border-[#FF7A00] hover:bg-[#FF7A00]/10 transition-all text-left group"
            >
              <div className="w-7 h-7 border-2 border-[#FF7A00] flex items-center justify-center bg-[#FF7A00]/15">
                <FileText size={14} className="text-[#FF7A00]" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase font-mono">EXPORT PDF REPORT</p>
                <p className="text-[9px] text-[#C1C1C1] font-mono">Neo-Brutalist ({pdfRange.toUpperCase()})</p>
              </div>
            </button>

            <button
              onClick={() => doExport('excel')}
              className="w-full flex items-center gap-3 px-3 py-2 border-2 border-transparent hover:border-[#FF7A00] hover:bg-[#FF7A00]/10 transition-all text-left group"
            >
              <div className="w-7 h-7 border-2 border-[#494848] flex items-center justify-center bg-white/10">
                <FileSpreadsheet size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase font-mono">EXPORT EXCEL (.XLSX)</p>
                <p className="text-[9px] text-[#C1C1C1] font-mono">Full monthly spreadsheet</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

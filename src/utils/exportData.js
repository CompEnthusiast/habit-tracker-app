import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// ─── UI THEME COLORS (matching Neo-Brutalist Orange/Black UI) ────────────────
const PALETTE = {
  bg:         { r: 16,  g: 14,  b: 12  }, // #100E0C dark canvas
  cardBg:     { r: 30,  g: 29,  b: 28  }, // #1E1D1C card surface
  cardInner:  { r: 24,  g: 22,  b: 20  }, // #181614 inner block
  orange:     { r: 255, g: 122, b: 0   }, // #FF7A00 electric orange
  orangeDim:  { r: 204, g: 82,  b: 0   }, // #CC5200 deep ember
  orangeAmber:{ r: 255, g: 166, b: 77  }, // #FFA64D warm amber
  textWhite:  { r: 255, g: 255, b: 255 },
  textDim:    { r: 193, g: 193, b: 193 }, // #C1C1C1 mono gray
  textMuted:  { r: 115, g: 115, b: 115 }, // #737373 dark gray
  border:     { r: 73,  g: 72,  b: 72  }, // #494848 solid border
  borderDark: { r: 0,   g: 0,   b: 0   }, // #000000 shadow border
};

const COLOR_HEX = {
  primary:   '#FF7A00',
  secondary: '#FFA64D',
  accent1:   '#FF7A00',
  accent2:   '#FFA64D',
  accent3:   '#FF5500',
  success:   '#FF7A00',
};

function hexToRgb(hex) {
  const h = (hex || '#FF7A00').replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) || 255,
    g: parseInt(h.slice(2, 4), 16) || 122,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

// ─── EXCEL EXPORT ───────────────────────────────────────────────────────────
export function exportToExcel({ habits, monthDaysMap, daysInMonth, monthName, year }) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Overview
  const overviewRows = [
    [`Habit Tracker — ${monthName} ${year}`],
    [],
    ['Habit', 'Category', 'Priority', 'Days Completed', 'Completion %', 'Best Streak', ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`)],
  ];

  for (const habit of habits) {
    const days = monthDaysMap[habit._id] || {};
    const completed = Object.values(days).filter(Boolean).length;
    const pct = Math.round((completed / daysInMonth) * 100);

    let best = 0, cur = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (days[d]) { cur++; best = Math.max(best, cur); } else { cur = 0; }
    }

    const dayCells = Array.from({ length: daysInMonth }, (_, i) => days[i + 1] ? '✓' : '');
    overviewRows.push([habit.name, habit.category || 'General', habit.priority || 'Medium', completed, `${pct}%`, best, ...dayCells]);
  }

  const ws = XLSX.utils.aoa_to_sheet(overviewRows);
  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    ...Array.from({ length: daysInMonth }, () => ({ wch: 5 })),
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Overview');

  // Sheet 2: Weekly Summary
  const weekRows = [
    [`Weekly Summary — ${monthName} ${year}`],
    [],
  ];
  const numWeeks = Math.ceil(daysInMonth / 7);
  const weekHeaders = ['Habit', 'Category'];
  for (let w = 0; w < numWeeks; w++) {
    const start = w * 7 + 1;
    const end = Math.min(start + 6, daysInMonth);
    weekHeaders.push(`Week ${w + 1} (${start}–${end})`);
  }
  weekHeaders.push('Total Done');
  weekRows.push(weekHeaders);

  for (const habit of habits) {
    const days = monthDaysMap[habit._id] || {};
    const row = [habit.name, habit.category || 'General'];
    let total = 0;
    for (let w = 0; w < numWeeks; w++) {
      let wCount = 0;
      for (let d = w * 7 + 1; d <= Math.min((w + 1) * 7, daysInMonth); d++) {
        if (days[d]) wCount++;
      }
      row.push(wCount);
      total += wCount;
    }
    row.push(total);
    weekRows.push(row);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(weekRows);
  ws2['!cols'] = [{ wch: 22 }, { wch: 14 }, ...Array(numWeeks + 1).fill({ wch: 16 })];
  XLSX.utils.book_append_sheet(wb, ws2, 'Weekly Summary');

  XLSX.writeFile(wb, `HabitTracker_${monthName}_${year}.xlsx`);
}

// ─── NEO-BRUTALIST PDF EXPORT ───────────────────────────────────────────────
export function exportToPDF({
  habits = [],
  monthDaysMap = {},
  daysInMonth = 31,
  monthName = 'Current',
  year = new Date().getFullYear(),
  dateRangeType = 'month', // 'today' | 'week' | 'month' | 'all'
  currentDay = new Date().getDate(),
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 297 mm
  const H = doc.internal.pageSize.getHeight();  // 210 mm

  const setFill = (c) => doc.setFillColor(c.r, c.g, c.b);
  const setDraw = (c) => doc.setDrawColor(c.r, c.g, c.b);
  const setTxt  = (c) => doc.setTextColor(c.r, c.g, c.b);

  // Determine days window based on dateRangeType
  let startDay = 1;
  let endDay = daysInMonth;
  let rangeLabel = `${monthName} 1 – ${daysInMonth}, ${year}`;

  if (dateRangeType === 'today') {
    startDay = Math.min(Math.max(1, currentDay), daysInMonth);
    endDay = startDay;
    rangeLabel = `Today: ${monthName} ${startDay}, ${year}`;
  } else if (dateRangeType === 'week') {
    startDay = Math.max(1, currentDay - 6);
    endDay = Math.min(daysInMonth, currentDay);
    rangeLabel = `Last 7 Days: ${monthName} ${startDay} – ${endDay}, ${year}`;
  }

  const displayDaysCount = endDay - startDay + 1;
  const dayIndices = Array.from({ length: displayDaysCount }, (_, i) => startDay + i);

  // Overall statistics calculation
  const totalSlots = habits.length * displayDaysCount;
  let totalDone = 0;
  let maxGlobalStreak = 0;

  habits.forEach((h) => {
    const days = monthDaysMap[h._id] || {};
    let curStreak = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (days[d]) {
        curStreak++;
        maxGlobalStreak = Math.max(maxGlobalStreak, curStreak);
      } else {
        curStreak = 0;
      }
    }
    dayIndices.forEach((d) => {
      if (days[d]) totalDone++;
    });
  });

  const overallPct = totalSlots > 0 ? Math.round((totalDone / totalSlots) * 100) : 0;

  // Pagination setup: max 12 habits per page to avoid awkward cuts
  const HABITS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(habits.length / HABITS_PER_PAGE));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // ── 1. Dark Canvas Background ──────────────────────────────────────────
    setFill(PALETTE.bg);
    doc.rect(0, 0, W, H, 'F');

    // ── 2. Top Header Card (Neo-Brutalist Frame) ───────────────────────────
    const headerH = 26;
    // Brutalist shadow
    setFill(PALETTE.borderDark);
    doc.rect(10, 10, W - 16, headerH, 'F');
    // Main card box
    setFill(PALETTE.cardBg);
    setDraw(PALETTE.border);
    doc.setLineWidth(0.8);
    doc.rect(8, 8, W - 16, headerH, 'FD');

    // Electric Orange Accent Strip on Left
    setFill(PALETTE.orange);
    doc.rect(8, 8, 4, headerH, 'F');

    // Header Title
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    setTxt(PALETTE.textWhite);
    doc.text('HABIT TRACKER // DISCIPLINE LOG', 18, 17);

    // Range Subtitle & Locked Status info
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    setTxt(PALETTE.orange);
    doc.text(`RANGE: ${rangeLabel.toUpperCase()}  |  PAST DAYS LOCKED [L]`, 18, 24);

    // Top Right KPI Stats
    const statsX = W - 110;
    setFill(PALETTE.cardInner);
    setDraw(PALETTE.border);
    doc.rect(statsX, 11, 100, 20, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    setTxt(PALETTE.textDim);
    doc.text('COMPLETED', statsX + 5, 17);
    doc.text('RATE', statsX + 38, 17);
    doc.text('BEST STREAK', statsX + 68, 17);

    doc.setFontSize(10);
    setTxt(PALETTE.orange);
    doc.text(`${totalDone}/${totalSlots}`, statsX + 5, 26);
    doc.text(`${overallPct}%`, statsX + 38, 26);
    doc.text(`${maxGlobalStreak} DAYS`, statsX + 68, 26);

    // ── 3. Habit Grid Table ────────────────────────────────────────────────
    const gridTop = 40;
    const pageHabits = habits.slice(page * HABITS_PER_PAGE, (page + 1) * HABITS_PER_PAGE);

    const nameColW = 60;
    const statsColW = 32;
    const daysAreaW = W - 16 - nameColW - statsColW;
    const cellW = Math.max(5.5, daysAreaW / displayDaysCount);
    const rowH = 9.5;

    // Header Row Background with shadow
    setFill(PALETTE.borderDark);
    doc.rect(10, gridTop + 2, W - 16, rowH, 'F');
    setFill(PALETTE.cardInner);
    setDraw(PALETTE.orange);
    doc.setLineWidth(0.6);
    doc.rect(8, gridTop, W - 16, rowH, 'FD');

    // Table Header Labels
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    setTxt(PALETTE.orange);
    doc.text('HABIT & CATEGORY', 14, gridTop + 6);
    doc.text('STATS', 8 + nameColW + 4, gridTop + 6);

    // Day numbers header
    dayIndices.forEach((dayNum, i) => {
      const cx = 8 + nameColW + statsColW + i * cellW + cellW / 2;
      const isPast = dayNum < currentDay;
      const isToday = dayNum === currentDay;

      doc.setFontSize(6);
      if (isToday) {
        setTxt(PALETTE.orange);
      } else if (isPast) {
        setTxt(PALETTE.textDim);
      } else {
        setTxt(PALETTE.textMuted);
      }
      doc.text(String(dayNum), cx, gridTop + 6, { align: 'center' });
    });

    // ── 4. Rows for this page ──────────────────────────────────────────────
    pageHabits.forEach((habit, idx) => {
      const y = gridTop + rowH * (idx + 1);
      const isEven = idx % 2 === 0;

      // Row background
      setFill(isEven ? PALETTE.cardBg : PALETTE.cardInner);
      setDraw(PALETTE.border);
      doc.setLineWidth(0.3);
      doc.rect(8, y, W - 16, rowH, 'FD');

      // Habit accent indicator
      const hColor = hexToRgb(COLOR_HEX[habit.color] || '#FF7A00');
      setFill(hColor);
      doc.rect(9, y + 1.5, 2, rowH - 3, 'F');

      // Habit Name & Category
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      setTxt(PALETTE.textWhite);
      const habitTitle = habit.name.length > 24 ? habit.name.slice(0, 23) + '…' : habit.name;
      doc.text(habitTitle, 13, y + 4.5);

      doc.setFont('courier', 'normal');
      doc.setFontSize(5.5);
      setTxt(PALETTE.textDim);
      const catText = `${(habit.category || 'GENERAL').toUpperCase()} · [${habit.priority || 'MED'}]`;
      doc.text(catText, 13, y + 8);

      // Habit Stats (Done count & percentage)
      const days_ = monthDaysMap[habit._id] || {};
      const completedInRange = dayIndices.filter((d) => days_[d]).length;
      const habitPct = displayDaysCount > 0 ? Math.round((completedInRange / displayDaysCount) * 100) : 0;

      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      setTxt(PALETTE.orange);
      doc.text(`${completedInRange}/${displayDaysCount} (${habitPct}%)`, 8 + nameColW + 4, y + 6);

      // Day Check Cells
      dayIndices.forEach((dayNum, i) => {
        const cx = 8 + nameColW + statsColW + i * cellW + cellW / 2;
        const cy = y + rowH / 2;
        const isDone = !!days_[dayNum];
        const isPast = dayNum < currentDay;
        const isToday = dayNum === currentDay;

        const cellPadding = 1.2;
        const bx = cx - cellW / 2 + cellPadding;
        const by = y + cellPadding;
        const bw = cellW - cellPadding * 2;
        const bh = rowH - cellPadding * 2;

        if (isDone) {
          // Completed day: Orange filled neo-brutalist square with dark checkmark
          setFill(PALETTE.orange);
          setDraw(PALETTE.borderDark);
          doc.setLineWidth(0.4);
          doc.rect(bx, by, bw, bh, 'FD');

          doc.setFont('courier', 'bold');
          doc.setFontSize(6.5);
          setTxt(PALETTE.borderDark);
          doc.text('X', cx, cy + 1.5, { align: 'center' });
        } else if (isPast) {
          // Past missed day: locked indicator [L] or dash
          setFill(PALETTE.cardBg);
          setDraw(PALETTE.border);
          doc.setLineWidth(0.2);
          doc.rect(bx, by, bw, bh, 'FD');

          doc.setFont('courier', 'normal');
          doc.setFontSize(5);
          setTxt(PALETTE.textMuted);
          doc.text('·', cx, cy + 1.2, { align: 'center' });
        } else if (isToday) {
          // Today pending: Orange dashed outline
          setDraw(PALETTE.orange);
          doc.setLineWidth(0.5);
          doc.rect(bx, by, bw, bh, 'S');
        } else {
          // Future day: empty muted box
          setDraw(PALETTE.border);
          doc.setLineWidth(0.2);
          doc.rect(bx, by, bw, bh, 'S');
        }
      });
    });

    // ── 5. Page Footer ─────────────────────────────────────────────────────
    const footerY = H - 10;
    setDraw(PALETTE.border);
    doc.setLineWidth(0.4);
    doc.line(8, footerY - 2, W - 8, footerY - 2);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    setTxt(PALETTE.textDim);
    doc.text(`HABIT TRACKER SYSTEM // GENERATED: ${new Date().toISOString().slice(0, 10)}`, 10, footerY + 3);

    doc.setFont('courier', 'bold');
    setTxt(PALETTE.orange);
    doc.text(`PAGE ${page + 1} OF ${totalPages}`, W - 35, footerY + 3);
  }

  // Save the PDF
  const filename = `HabitTracker_${dateRangeType}_${monthName}_${year}.pdf`;
  doc.save(filename);
}

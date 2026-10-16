import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// ─── NEO-BRUTALIST PALETTE ────────────────────────────────────────────────────
const PALETTE = {
  bg:          { r: 16,  g: 14,  b: 12  }, // #100E0C Dark canvas
  cardBg:      { r: 30,  g: 29,  b: 28  }, // #1E1D1C Card surface
  cardInner:   { r: 24,  g: 22,  b: 20  }, // #181614 Inner container
  cardElevated:{ r: 38,  g: 36,  b: 34  }, // #262422 Elevated box
  orange:      { r: 255, g: 122, b: 0   }, // #FF7A00 Electric orange
  orangeDim:   { r: 204, g: 82,  b: 0   }, // #CC5200 Deep amber
  amber:       { r: 255, g: 166, b: 77  }, // #FFA64D Warm amber
  gold:        { r: 255, g: 184, b: 0   }, // #FFB800 Solar gold
  white:       { r: 255, g: 255, b: 255 },
  silver:      { r: 193, g: 193, b: 193 }, // #C1C1C1 Mono silver
  textMuted:   { r: 120, g: 120, b: 120 }, // #787878 Muted gray
  border:      { r: 73,  g: 72,  b: 72  }, // #494848 Solid slate
  borderDark:  { r: 0,   g: 0,   b: 0   }, // #000000 Drop shadow
  success:     { r: 34,  g: 197, b: 94  }, // Emerald
};

const COLOR_HEX = {
  accent1:   '#FF7A00',
  accent2:   '#FFA64D',
  accent3:   '#CC5200',
  primary:   '#C1C1C1',
  secondary: '#8E8E93',
  success:   '#FFB800',
};

function hexToRgb(hex) {
  const h = (hex || '#FF7A00').replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) || 255,
    g: parseInt(h.slice(2, 4), 16) || 122,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
export function exportToExcel({ habits, monthDaysMap, daysInMonth, monthName, year }) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Monthly Overview
  const overviewRows = [
    [`Habit Tracker — ${monthName} ${year}`],
    [],
    [
      'Habit',
      'Category',
      'Priority',
      'Days Completed',
      'Completion %',
      'Best Streak',
      ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),
    ],
  ];

  for (const habit of habits) {
    const days = monthDaysMap[habit._id] || {};
    const completed = Object.values(days).filter(Boolean).length;
    const pct = Math.round((completed / daysInMonth) * 100);

    let best = 0;
    let cur = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (days[d]) {
        cur++;
        best = Math.max(best, cur);
      } else {
        cur = 0;
      }
    }

    const dayCells = Array.from({ length: daysInMonth }, (_, i) => (days[i + 1] ? '✓' : ''));
    overviewRows.push([
      habit.name,
      habit.category || 'General',
      habit.priority || 'Medium',
      completed,
      `${pct}%`,
      best,
      ...dayCells,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(overviewRows);
  ws['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    ...Array.from({ length: daysInMonth }, () => ({ wch: 6 })),
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Overview');

  XLSX.writeFile(wb, `HabitTracker_${monthName}_${year}.xlsx`);
}

// ─── NEO-BRUTALIST PDF REPORT REDESIGN ─────────────────────────────────────────

export function exportToPDF({
  habits = [],
  monthDaysMap = {},
  daysInMonth = 31,
  monthName = 'Current',
  year = new Date().getFullYear(),
  dateRangeType = 'month', // 'today' | 'week' | 'month' | 'custom'
  currentDay = new Date().getDate(),
  customStartDate = null,
  customEndDate = null,
  moodStats = { great: 12, good: 8, neutral: 4, tough: 1 },
  userXP = null,
  userLevel = null,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();  // 297 mm
  const H = doc.internal.pageSize.getHeight(); // 210 mm

  const setFill = (c) => doc.setFillColor(c.r, c.g, c.b);
  const setDraw = (c) => doc.setDrawColor(c.r, c.g, c.b);
  const setTxt  = (c) => doc.setTextColor(c.r, c.g, c.b);

  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Determine date range
  let startDay = 1;
  let endDay = daysInMonth;
  let rangeLabel = `${monthName.toUpperCase()} 1 – ${daysInMonth}, ${year}`;

  if (dateRangeType === 'today') {
    startDay = Math.min(Math.max(1, currentDay), daysInMonth);
    endDay = startDay;
    rangeLabel = `TODAY: ${monthName.toUpperCase()} ${startDay}, ${year}`;
  } else if (dateRangeType === 'week') {
    startDay = Math.max(1, currentDay - 6);
    endDay = Math.min(daysInMonth, currentDay);
    rangeLabel = `LAST 7 DAYS: ${monthName.toUpperCase()} ${startDay} – ${endDay}, ${year}`;
  } else if (dateRangeType === 'custom' && customStartDate && customEndDate) {
    rangeLabel = `CUSTOM: ${customStartDate} TO ${customEndDate}`;
  }

  const displayDaysCount = Math.max(1, endDay - startDay + 1);
  const dayIndices = Array.from({ length: displayDaysCount }, (_, i) => startDay + i);

  // 2. Calculate summary statistics
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
  const calculatedXP = userXP || totalDone * 25 + maxGlobalStreak * 50;
  const calculatedLevel = userLevel || Math.floor(calculatedXP / 250) + 1;

  // Pagination calculations: max 7 habits per page to leave generous room for stats & mood chart
  const HABITS_PER_PAGE = 7;
  const totalPages = Math.max(1, Math.ceil(habits.length / HABITS_PER_PAGE));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // ── Background Canvas ───────────────────────────────────────────────
    setFill(PALETTE.bg);
    doc.rect(0, 0, W, H, 'F');

    // ── Top Header with Neo-Brutalist Frame ──────────────────────────────
    const headerY = 8;
    const headerH = 26;

    // Hard drop-shadow
    setFill(PALETTE.borderDark);
    doc.rect(10, headerY + 2, W - 18, headerH, 'F');

    // Main header card
    setFill(PALETTE.cardBg);
    setDraw(PALETTE.border);
    doc.setLineWidth(0.8);
    doc.rect(8, headerY, W - 18, headerH, 'FD');

    // Electric Orange Accent Strip
    setFill(PALETTE.orange);
    doc.rect(8, headerY, 4, headerH, 'F');

    // App Branding Logo Badge
    setFill(PALETTE.cardInner);
    setDraw(PALETTE.orange);
    doc.setLineWidth(0.5);
    doc.rect(16, headerY + 4, 18, 18, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    setTxt(PALETTE.orange);
    doc.text('//HAB', 18, headerY + 12);
    doc.setFontSize(7);
    setTxt(PALETTE.white);
    doc.text('PWA', 20, headerY + 18);

    // Header Title
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    setTxt(PALETTE.white);
    doc.text('HABIT TRACKER // DISCIPLINE OS', 38, headerY + 11);

    // Range Subtitle with Lock Status Info
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    setTxt(PALETTE.amber);
    doc.text(`RANGE: ${rangeLabel}   |   PAST DAYS: LOCKED [L]`, 38, headerY + 17);

    doc.setFontSize(6.5);
    setTxt(PALETTE.silver);
    doc.text(`GENERATED: ${todayStr}   |   STATUS: OFFLINE-FIRST PWA`, 38, headerY + 22);

    // Header Right: Gamification Summary Cards (Level & XP)
    const badgeW = 75;
    const badgeX = W - 10 - badgeW;
    setFill(PALETTE.cardInner);
    setDraw(PALETTE.border);
    doc.rect(badgeX, headerY + 3, badgeW, 20, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    setTxt(PALETTE.silver);
    doc.text('LEVEL', badgeX + 5, headerY + 9);
    doc.text('TOTAL XP', badgeX + 28, headerY + 9);
    doc.text('BEST STREAK', badgeX + 53, headerY + 9);

    doc.setFontSize(10);
    setTxt(PALETTE.orange);
    doc.text(`LVL ${calculatedLevel}`, badgeX + 5, headerY + 18);
    doc.text(`${calculatedXP}`, badgeX + 28, headerY + 18);
    doc.text(`${maxGlobalStreak}D`, badgeX + 53, headerY + 18);

    // ── Mid Section: Summary Cards (Total, Completed %, Mood Distribution) ─
    const kpiY = 37;
    const kpiH = 17;

    // Card 1: Completed Rate
    const c1W = 60;
    setFill(PALETTE.cardBg);
    setDraw(PALETTE.border);
    doc.rect(8, kpiY, c1W, kpiH, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    setTxt(PALETTE.silver);
    doc.text('OVERALL COMPLETION', 12, kpiY + 6);
    doc.setFontSize(10);
    setTxt(PALETTE.orange);
    doc.text(`${totalDone} / ${totalSlots} (${overallPct}%)`, 12, kpiY + 13);

    // Card 2: Daily Completion Average
    const c2X = 8 + c1W + 4;
    const c2W = 60;
    setFill(PALETTE.cardBg);
    setDraw(PALETTE.border);
    doc.rect(c2X, kpiY, c2W, kpiH, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    setTxt(PALETTE.silver);
    doc.text('AVG TASKS / DAY', c2X + 4, kpiY + 6);
    doc.setFontSize(10);
    setTxt(PALETTE.white);
    const avgPerDay = displayDaysCount > 0 ? (totalDone / displayDaysCount).toFixed(1) : 0;
    doc.text(`${avgPerDay} TASKS`, c2X + 4, kpiY + 13);

    // Card 3: Mood Trend Chart & Distribution
    const c3X = c2X + c2W + 4;
    const c3W = W - 10 - c3X;
    setFill(PALETTE.cardBg);
    setDraw(PALETTE.border);
    doc.rect(c3X, kpiY, c3W, kpiH, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    setTxt(PALETTE.silver);
    doc.text('MOOD DISTRIBUTION // WELLNESS LOG', c3X + 4, kpiY + 6);

    const moods = [
      { label: 'GREAT ⚡', val: moodStats.great || 0, color: PALETTE.orange },
      { label: 'GOOD 😊', val: moodStats.good || 0, color: PALETTE.amber },
      { label: 'NEUTRAL 😐', val: moodStats.neutral || 0, color: PALETTE.silver },
      { label: 'TOUGH 🌧️', val: moodStats.tough || 0, color: PALETTE.textMuted },
    ];
    const totalMoods = moods.reduce((s, m) => s + m.val, 0) || 1;

    moods.forEach((m, idx) => {
      const mx = c3X + 4 + idx * 36;
      const barW = Math.max(2, Math.min(22, (m.val / totalMoods) * 26));

      doc.setFontSize(5.5);
      setTxt(PALETTE.silver);
      doc.text(`${m.label}: ${m.val}`, mx, kpiY + 10);

      // Mini progress bar
      setFill(PALETTE.cardInner);
      doc.rect(mx, kpiY + 12, 26, 3, 'F');
      setFill(m.color);
      doc.rect(mx, kpiY + 12, barW, 3, 'F');
    });

    // ── Table Section: Habits & Daily Tick Breakdown ─────────────────────
    const gridTop = 58;
    const pageHabits = habits.slice(page * HABITS_PER_PAGE, (page + 1) * HABITS_PER_PAGE);

    const nameColW = 56;
    const statsColW = 30;
    const daysAreaW = W - 18 - nameColW - statsColW;
    const cellW = Math.max(5.8, daysAreaW / displayDaysCount);
    const rowH = 15;

    // Header Row with Shadow
    setFill(PALETTE.borderDark);
    doc.rect(10, gridTop + 1.5, W - 18, 8, 'F');
    setFill(PALETTE.cardInner);
    setDraw(PALETTE.orange);
    doc.setLineWidth(0.6);
    doc.rect(8, gridTop, W - 18, 8, 'FD');

    // Header labels
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    setTxt(PALETTE.orange);
    doc.text('HABIT / DISCIPLINE', 14, gridTop + 5.5);
    doc.text('SCORE', 8 + nameColW + 4, gridTop + 5.5);

    dayIndices.forEach((dayNum, i) => {
      const cx = 8 + nameColW + statsColW + i * cellW + cellW / 2;
      const isPast = dayNum < currentDay;
      const isToday = dayNum === currentDay;

      doc.setFontSize(6);
      if (isToday) {
        setTxt(PALETTE.orange);
      } else if (isPast) {
        setTxt(PALETTE.silver);
      } else {
        setTxt(PALETTE.textMuted);
      }
      doc.text(`D${dayNum}`, cx, gridTop + 5.5, { align: 'center' });
    });

    // Habit Rows
    pageHabits.forEach((habit, idx) => {
      const y = gridTop + 9 + idx * (rowH + 2);

      // Row background
      setFill(PALETTE.cardBg);
      setDraw(PALETTE.border);
      doc.setLineWidth(0.4);
      doc.rect(8, y, W - 18, rowH, 'FD');

      // Left Accent Color Strip
      const hColor = hexToRgb(COLOR_HEX[habit.color] || '#FF7A00');
      setFill(hColor);
      doc.rect(8, y, 2.5, rowH, 'F');

      // Habit Title
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      setTxt(PALETTE.white);
      const title = habit.name.length > 25 ? habit.name.slice(0, 24) + '…' : habit.name;
      doc.text(title, 13, y + 5.5);

      // Habit Meta (Category & Priority)
      doc.setFont('courier', 'normal');
      doc.setFontSize(5.5);
      setTxt(PALETTE.silver);
      const meta = `${(habit.category || 'HEALTH').toUpperCase()} · [${(habit.priority || 'MED').toUpperCase()}]`;
      doc.text(meta, 13, y + 10.5);

      // Stats Column
      const days_ = monthDaysMap[habit._id] || {};
      const completedInRange = dayIndices.filter((d) => days_[d]).length;
      const habitPct = displayDaysCount > 0 ? Math.round((completedInRange / displayDaysCount) * 100) : 0;

      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      setTxt(PALETTE.orange);
      doc.text(`${completedInRange}/${displayDaysCount}`, 8 + nameColW + 4, y + 6.5);
      doc.setFontSize(6);
      setTxt(PALETTE.silver);
      doc.text(`${habitPct}% DONE`, 8 + nameColW + 4, y + 11.5);

      // Day Ticks & Lock Icons
      dayIndices.forEach((dayNum, i) => {
        const cx = 8 + nameColW + statsColW + i * cellW + cellW / 2;
        const cy = y + rowH / 2;
        const isDone = Boolean(days_[dayNum]);
        const isPast = dayNum < currentDay;
        const isToday = dayNum === currentDay;

        const cellPadding = 1.2;
        const bx = cx - cellW / 2 + cellPadding;
        const by = y + cellPadding + 1;
        const bw = cellW - cellPadding * 2;
        const bh = rowH - cellPadding * 2 - 2;

        if (isDone) {
          // Completed Day: Orange filled neo-brutalist square with dark checkmark
          setFill(PALETTE.orange);
          setDraw(PALETTE.borderDark);
          doc.setLineWidth(0.4);
          doc.rect(bx, by, bw, bh, 'FD');

          doc.setFont('courier', 'bold');
          doc.setFontSize(6.5);
          setTxt(PALETTE.borderDark);
          doc.text('✓', cx, cy + 1.2, { align: 'center' });
        } else if (isPast) {
          // Locked past day indicator [L]
          setFill(PALETTE.cardInner);
          setDraw(PALETTE.border);
          doc.setLineWidth(0.2);
          doc.rect(bx, by, bw, bh, 'FD');

          doc.setFont('courier', 'normal');
          doc.setFontSize(4.5);
          setTxt(PALETTE.textMuted);
          doc.text('[L]', cx, cy + 1, { align: 'center' });
        } else if (isToday) {
          // Today pending box
          setFill(PALETTE.cardBg);
          setDraw(PALETTE.orange);
          doc.setLineWidth(0.5);
          doc.rect(bx, by, bw, bh, 'FD');

          doc.setFontSize(5);
          setTxt(PALETTE.orange);
          doc.text('○', cx, cy + 1, { align: 'center' });
        } else {
          // Future day
          setDraw(PALETTE.border);
          doc.setLineWidth(0.2);
          doc.rect(bx, by, bw, bh, 'S');
        }
      });
    });

    // ── Footer: Pagination & Disclaimers ─────────────────────────────────
    const footerY = H - 9;
    setDraw(PALETTE.border);
    doc.setLineWidth(0.4);
    doc.line(8, footerY - 2, W - 10, footerY - 2);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    setTxt(PALETTE.silver);
    doc.text('HABIT TRACKER PWA // OFF-GRID PROTOCOL // LOCKED HISTORY AUDIT', 10, footerY + 3);

    doc.setFont('courier', 'bold');
    setTxt(PALETTE.orange);
    doc.text(`PAGE ${page + 1} OF ${totalPages}`, W - 35, footerY + 3);
  }

  // Save the PDF
  const filename = `HabitTracker_Report_${dateRangeType}_${year}.pdf`;
  doc.save(filename);
}

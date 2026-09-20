import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const COLOR_HEX = {
  primary:   '#3b82f6',
  secondary: '#a855f7',
  accent1:   '#ec4899',
  accent2:   '#06b6d4',
  accent3:   '#f59e0b',
  success:   '#22c55e',
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0,2), 16),
    g: parseInt(h.slice(2,4), 16),
    b: parseInt(h.slice(4,6), 16),
  };
}

// ─── EXCEL EXPORT ───────────────────────────────────────────────────────────
export function exportToExcel({ habits, monthDaysMap, daysInMonth, monthName, year }) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Overview
  const overviewRows = [
    [`Habit Tracker — ${monthName} ${year}`],
    [],
    ['Habit', 'Category', 'Days Completed', 'Completion %', 'Best Streak', ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`)],
  ];

  for (const habit of habits) {
    const days = monthDaysMap[habit._id] || {};
    const completed = Object.values(days).filter(Boolean).length;
    const pct = Math.round((completed / daysInMonth) * 100);

    // Best streak calc
    let best = 0, cur = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (days[d]) { cur++; best = Math.max(best, cur); } else { cur = 0; }
    }

    const dayCells = Array.from({ length: daysInMonth }, (_, i) => days[i + 1] ? '✓' : '');
    overviewRows.push([habit.name, habit.category, completed, `${pct}%`, best, ...dayCells]);
  }

  const ws = XLSX.utils.aoa_to_sheet(overviewRows);

  // Column widths
  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    ...Array.from({ length: daysInMonth }, () => ({ wch: 5 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Overview');

  // Sheet 2: Weekly Summary
  const weekRows = [
    [`Weekly Summary — ${monthName} ${year}`],
    [],
  ];
  const numWeeks = Math.ceil(daysInMonth / 7);
  const weekHeaders = ['Habit'];
  for (let w = 0; w < numWeeks; w++) {
    const start = w * 7 + 1;
    const end = Math.min(start + 6, daysInMonth);
    weekHeaders.push(`Week ${w + 1} (${start}–${end})`);
  }
  weekHeaders.push('Total');
  weekRows.push(weekHeaders);

  for (const habit of habits) {
    const days = monthDaysMap[habit._id] || {};
    const row = [habit.name];
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
  ws2['!cols'] = [{ wch: 22 }, ...Array(numWeeks + 1).fill({ wch: 16 })];
  XLSX.utils.book_append_sheet(wb, ws2, 'Weekly Summary');

  XLSX.writeFile(wb, `HabitTracker_${monthName}_${year}.xlsx`);
}

// ─── PDF EXPORT ─────────────────────────────────────────────────────────────
export function exportToPDF({ habits, monthDaysMap, daysInMonth, monthName, year }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 297
  const H = doc.internal.pageSize.getHeight();  // 210

  const BG       = { r: 18,  g: 18,  b: 28  };
  const CARD_BG  = { r: 30,  g: 30,  b: 46  };
  const PURPLE   = { r: 168, g: 85,  b: 247 };
  const INDIGO   = { r: 99,  g: 102, b: 241 };
  const TEXT_LT  = { r: 220, g: 220, b: 235 };
  const TEXT_DIM = { r: 100, g: 100, b: 120 };
  const SUCCESS  = { r: 34,  g: 197, b: 94  };

  function setFill(c)   { doc.setFillColor(c.r, c.g, c.b); }
  function setDraw(c)   { doc.setDrawColor(c.r, c.g, c.b); }
  function setTxt(c)    { doc.setTextColor(c.r, c.g, c.b); }

  // ── Background ──────────────────────────────────────────────────────────
  setFill(BG); doc.rect(0, 0, W, H, 'F');

  // Subtle gradient blobs
  doc.setGState(doc.GState({ opacity: 0.12 }));
  setFill(INDIGO);
  doc.circle(50, 30, 60, 'F');
  setFill(PURPLE);
  doc.circle(250, 180, 70, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // ── Header card ─────────────────────────────────────────────────────────
  setFill(CARD_BG);
  doc.roundedRect(8, 8, W - 16, 24, 4, 4, 'F');

  // Purple accent strip on left
  setFill(PURPLE);
  doc.roundedRect(8, 8, 5, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setTxt(TEXT_LT);
  doc.text('Habit Tracker', 20, 19);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setTxt(TEXT_DIM);
  doc.text(`${monthName} ${year}`, 20, 26);

  // Stats on right
  const total = habits.length * daysInMonth;
  const done = habits.reduce((acc, h) => {
    return acc + Object.values(monthDaysMap[h._id] || {}).filter(Boolean).length;
  }, 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setTxt(SUCCESS);
  doc.text(`${done} / ${total} completed`, W - 70, 17);
  setTxt(PURPLE);
  doc.text(`${pct}% overall`, W - 70, 25);

  // ── Grid ────────────────────────────────────────────────────────────────
  const gridTop = 38;
  const leftColW = 52;
  const cellW = (W - 16 - leftColW) / daysInMonth;
  const rowH = Math.min(10, (H - gridTop - 25) / (habits.length + 1));

  // Header row (day numbers)
  setFill(CARD_BG);
  doc.rect(8, gridTop, W - 16, rowH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  setTxt(TEXT_DIM);
  doc.text('HABIT', 13, gridTop + rowH / 2 + 1.5);

  for (let d = 1; d <= daysInMonth; d++) {
    const x = 8 + leftColW + (d - 1) * cellW + cellW / 2;
    doc.text(String(d), x, gridTop + rowH / 2 + 1.5, { align: 'center' });
  }

  // Habit rows
  habits.forEach((habit, idx) => {
    const y = gridTop + rowH * (idx + 1);
    const isEven = idx % 2 === 0;

    // Row bg
    setFill(isEven ? CARD_BG : BG);
    doc.rect(8, y, W - 16, rowH, 'F');

    // Colored dot
    const hex = COLOR_HEX[habit.color] || '#a855f7';
    const rgb = hexToRgb(hex);
    setFill(rgb);
    doc.circle(12, y + rowH / 2, 1.5, 'F');

    // Habit name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    setTxt(TEXT_LT);
    const nameStr = habit.name.length > 18 ? habit.name.slice(0, 17) + '…' : habit.name;
    doc.text(nameStr, 16, y + rowH / 2 + 1.5);

    // Completion % badge
    const days_ = monthDaysMap[habit._id] || {};
    const comp = Object.values(days_).filter(Boolean).length;
    const p = Math.round((comp / daysInMonth) * 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    setTxt(rgb);
    doc.text(`${p}%`, 8 + leftColW - 7, y + rowH / 2 + 1.5, { align: 'right' });

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cx = 8 + leftColW + (d - 1) * cellW + cellW / 2;
      const cy = y + rowH / 2;
      const isDone = !!(days_[d]);

      if (isDone) {
        setFill(rgb);
        doc.roundedRect(cx - cellW / 2 + 0.5, y + 1, cellW - 1, rowH - 2, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        setTxt({ r: 255, g: 255, b: 255 });
        doc.text('✓', cx, cy + 1.5, { align: 'center' });
      } else {
        doc.setGState(doc.GState({ opacity: 0.15 }));
        setDraw({ r: 255, g: 255, b: 255 });
        doc.setLineWidth(0.2);
        doc.roundedRect(cx - cellW / 2 + 0.5, y + 1, cellW - 1, rowH - 2, 1, 1, 'S');
        doc.setGState(doc.GState({ opacity: 1 }));
      }
    }
  });

  // Grid bottom border
  setDraw({ r: 60, g: 60, b: 80 });
  doc.setLineWidth(0.3);
  doc.line(8, gridTop + rowH * (habits.length + 1), W - 8, gridTop + rowH * (habits.length + 1));

  // ── Weekly summary ───────────────────────────────────────────────────────
  const summaryY = gridTop + rowH * (habits.length + 1) + 6;
  if (summaryY + 40 < H) {
    setFill(CARD_BG);
    doc.roundedRect(8, summaryY, W - 16, 36, 4, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTxt(PURPLE);
    doc.text('WEEKLY BREAKDOWN', 14, summaryY + 7);

    const numWeeks = Math.ceil(daysInMonth / 7);
    const colW2 = (W - 16 - 52) / numWeeks;

    // Week headers
    for (let w = 0; w < numWeeks; w++) {
      const start = w * 7 + 1;
      const end = Math.min(start + 6, daysInMonth);
      const xh = 14 + 52 + w * colW2 + colW2 / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      setTxt(TEXT_DIM);
      doc.text(`W${w + 1}: ${start}–${end}`, xh, summaryY + 7, { align: 'center' });
    }

    // Habit rows
    habits.forEach((habit, idx) => {
      const ry = summaryY + 12 + idx * 6;
      const hex = COLOR_HEX[habit.color] || '#a855f7';
      const rgb = hexToRgb(hex);
      const days_ = monthDaysMap[habit._id] || {};

      setFill(rgb);
      doc.circle(13, ry, 1.3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      setTxt(TEXT_LT);
      doc.text(habit.name.length > 20 ? habit.name.slice(0, 19) + '…' : habit.name, 16, ry + 1);

      for (let w = 0; w < numWeeks; w++) {
        let cnt = 0;
        for (let d = w * 7 + 1; d <= Math.min((w + 1) * 7, daysInMonth); d++) {
          if (days_[d]) cnt++;
        }
        const maxInWeek = Math.min(7, daysInMonth - w * 7);
        const xc = 14 + 52 + w * colW2 + colW2 / 2;

        // Mini bar
        const barW = colW2 - 4;
        const fillW = maxInWeek > 0 ? (cnt / maxInWeek) * barW : 0;
        doc.setGState(doc.GState({ opacity: 0.2 }));
        setFill(rgb);
        doc.roundedRect(xc - barW / 2, ry - 2.5, barW, 2.5, 0.5, 0.5, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));
        setFill(rgb);
        if (fillW > 0) doc.roundedRect(xc - barW / 2, ry - 2.5, fillW, 2.5, 0.5, 0.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        setTxt(TEXT_LT);
        doc.text(`${cnt}/${maxInWeek}`, xc, ry + 1, { align: 'center' });
      }
    });
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  setTxt(TEXT_DIM);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(`Generated by Habit Tracker · ${new Date().toLocaleDateString()}`, W / 2, H - 5, { align: 'center' });

  doc.save(`HabitTracker_${monthName}_${year}.pdf`);
}

/**
 * WeeklyProgressChart — Bar chart showing daily completion rates for the week
 * Uses recharts (already installed)
 */
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeeklyProgressChart({ habits = [] }) {
  const data = useMemo(() => {
    const today = new Date();
    const result = [];

    // Get the start of the week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      const isFuture = d > today;

      let completed = 0;
      let total = habits.length;

      if (!isFuture && total > 0) {
        for (const habit of habits) {
          if (habit.completions?.[dateKey]) completed++;
        }
      }

      const pct = total > 0 && !isFuture ? Math.round((completed / total) * 100) : 0;
      const isToday = dateKey === today.toISOString().slice(0, 10);

      result.push({
        day: DAY_NAMES[i],
        date: dateKey,
        completed,
        total,
        pct,
        isToday,
        isFuture,
      });
    }

    return result;
  }, [habits]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[--color-background] p-3 border-2 border-[--color-borderSlate] text-xs" style={{ boxShadow: '2px 2px 0px #000' }}>
          <p className="font-black text-[--color-text] uppercase font-mono">{d.day} ({d.date})</p>
          <p className="text-[--color-primary] font-bold mt-1">{d.completed}/{d.total} completed</p>
          <p className="text-[--color-silver] font-mono">{d.pct}%</p>
        </div>
      );
    }
    return null;
  };

  if (habits.length === 0) return null;

  return (
    <div className="brutal-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[--color-borderSlate]">
        <BarChart3 size={18} className="text-[--color-primary]" />
        <span className="text-base font-black uppercase text-[--color-text] tracking-wider">THIS WEEK</span>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borderSlate)" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="day"
              stroke="var(--color-silver)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={800}
            />
            <YAxis
              stroke="var(--color-silver)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              fontFamily="'JetBrains Mono', monospace"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isFuture ? 'transparent' : entry.isToday ? 'var(--color-primary)' : 'var(--color-primary)'}
                  opacity={entry.isFuture ? 0.1 : entry.isToday ? 1 : 0.6}
                  stroke={entry.isToday ? '#000' : 'transparent'}
                  strokeWidth={entry.isToday ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

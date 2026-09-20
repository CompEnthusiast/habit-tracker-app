import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const colorHexMap = {
  primary:   '#3b82f6',
  secondary: '#a855f7',
  accent1:   '#ec4899',
  accent2:   '#06b6d4',
  accent3:   '#f59e0b',
  success:   '#22c55e',
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, color } = payload[0].payload;
    return (
      <div
        className="px-4 py-3 rounded-xl border border-white/10 shadow-xl text-sm"
        style={{ background: '#1e1e2e' }}
      >
        <p className="font-semibold text-white">{name}</p>
        <p style={{ color }}>{value} days completed</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
    {payload.map((entry) => (
      <div key={entry.value} className="flex items-center gap-1.5 text-xs">
        <span
          className="w-2 h-2 rounded-full inline-block"
          style={{ background: entry.color, boxShadow: `0 0 6px ${entry.color}80` }}
        />
        <span className="text-gray-400">{entry.value}</span>
      </div>
    ))}
  </div>
);

export default function HabitPieChart({ habits, monthDaysMap }) {
  const data = habits.map((h) => {
    const days = monthDaysMap[h._id] || {};
    const count = Object.values(days).filter(Boolean).length;
    return {
      name: h.name,
      value: count,
      color: colorHexMap[h.color] || '#3b82f6',
    };
  }).filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div
        className="rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center text-center h-64"
        style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
      >
        <p className="text-3xl mb-2">🥧</p>
        <p className="text-sm text-gray-500">Check off some habits to see the pie chart</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border border-white/5 p-6 shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-bold text-white">Monthly Breakdown</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="transparent"
                  style={{ filter: `drop-shadow(0 0 6px ${entry.color}60)` }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

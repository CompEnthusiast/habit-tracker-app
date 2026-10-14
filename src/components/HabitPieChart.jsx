import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const colorHexMap = {
  accent1:   '#FF7A00',
  accent2:   '#FFA64D',
  accent3:   '#CC5200',
  primary:   '#C1C1C1',
  secondary: '#8E8E93',
  success:   '#FFB800',
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, color } = payload[0].payload;
    return (
      <div className="px-3.5 py-2.5 rounded-xl border border-[#494848] bg-[#100E0C] shadow-xl text-xs">
        <p className="font-bold text-white mb-0.5">{name}</p>
        <p style={{ color }}>{value} days completed</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
    {payload.map((entry) => (
      <div key={entry.value} className="flex items-center gap-1.5 text-xs">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block"
          style={{ background: entry.color, boxShadow: `0 0 6px ${entry.color}80` }}
        />
        <span className="text-[#C1C1C1] font-medium">{entry.value}</span>
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
      color: colorHexMap[h.color] || '#FF7A00',
    };
  }).filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-[#494848] bg-[#1E1D1C] p-6 flex flex-col items-center justify-center text-center h-64">
        <p className="text-3xl mb-2">🥧</p>
        <p className="text-xs text-[#C1C1C1]">Check off some habits to see the pie chart</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#494848] bg-[#1E1D1C] p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base font-bold text-white tracking-tight">Monthly Breakdown</span>
        <div className="flex-1 h-px bg-[#494848]" />
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

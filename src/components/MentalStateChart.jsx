import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function MentalStateChart({ data }) {
  // Custom tooltip to make it match the dark theme
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface p-3 border border-white/10 rounded-lg shadow-xl">
          <p className="text-gray-400 text-xs mb-1">Day {label}</p>
          <p className="font-bold text-accent1">
            Score: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface p-6 rounded-2xl shadow-lg border border-white/5 mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold">Mental State</h2>
          <p className="text-xs text-gray-400">Self-reported mood tracking</p>
        </div>
        <div className="flex gap-2 items-center text-xs text-gray-400">
          <div className="w-3 h-3 rounded-full bg-accent1 opacity-50"></div>
          Overall Wellness
        </div>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="#ffffff50" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis 
              stroke="#ffffff50" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#ec4899" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorScore)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#ec4899' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

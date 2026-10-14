import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function MentalStateChart({ data }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#100E0C] p-3 border border-[#494848] rounded-xl shadow-xl">
          <p className="text-[#C1C1C1] text-xs mb-1">Day {label}</p>
          <p className="font-bold text-[#FF7A00]">
            Wellness Score: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1E1D1C] p-6 rounded-2xl shadow-xl border border-[#494848] mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Mental State</h2>
          <p className="text-xs text-[#C1C1C1]">Self-reported mood & energy tracking</p>
        </div>
        <div className="flex gap-2 items-center text-xs text-[#C1C1C1]">
          <div className="w-3 h-3 rounded-full bg-[#FF7A00] shadow-[0_0_8px_#FF7A00]"></div>
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
                <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#FF7A00" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#49484850" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="#C1C1C180" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis 
              stroke="#C1C1C180" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#FF7A00" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorScore)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#FF7A00' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

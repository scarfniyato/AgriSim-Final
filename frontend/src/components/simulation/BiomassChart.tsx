import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface BiomassDataPoint {
  day: number;
  biomass: number;
}

interface BiomassChartProps {
  data: BiomassDataPoint[];
  currentDay: number;
}

export function BiomassChart({ data, currentDay }: BiomassChartProps) {
  const visibleData = data.filter(d => d.day <= currentDay);
  
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-poppins font-semibold text-foreground">Biomass Accumulation</h3>
          <p className="text-sm text-muted-foreground">Dry weight over time (g/m²)</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Total Biomass</span>
        </div>
      </div>
      
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visibleData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="biomassGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(122, 39%, 49%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(122, 39%, 49%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 10%, 88%)" vertical={false} />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: 'hsl(120, 10%, 40%)' }}
              axisLine={{ stroke: 'hsl(120, 10%, 88%)' }}
              tickLine={false}
              label={{ value: 'Days', position: 'insideBottom', offset: -5, fontSize: 11, fill: 'hsl(120, 10%, 40%)' }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(120, 10%, 40%)' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'g/m²', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(120, 10%, 40%)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(120, 10%, 88%)',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px',
              }}
              labelFormatter={(label) => `Day ${label}`}
              formatter={(value: number) => [`${value.toFixed(1)} g/m²`, 'Biomass']}
            />
            <Area
              type="monotone"
              dataKey="biomass"
              stroke="hsl(122, 39%, 49%)"
              strokeWidth={2.5}
              fill="url(#biomassGradient)"
              dot={false}
              activeDot={{ r: 6, fill: 'hsl(122, 39%, 49%)', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent } from '../ui/Card';

interface ChartProps {
  data: any[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export const PeakHungerChart = ({ data }: ChartProps) => {
  return (
    <Card className="h-80">
      <CardContent className="h-full pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Peak Hunger Times</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area type="monotone" dataKey="orders" stroke="#8884d8" fillOpacity={1} fill="url(#colorOrders)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const PrintingVolumeChart = ({ data }: ChartProps) => {
  return (
    <Card className="h-80">
      <CardContent className="h-full pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Printing Volume Heatmap</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis dataKey="shop" type="category" width={100} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Bar dataKey="pages" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const TravelTrendsChart = ({ data }: ChartProps) => {
  return (
    <Card className="h-80">
      <CardContent className="h-full pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Travel Trends</h3>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="count"
              nameKey="destination"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const ErnestUsageChart = ({ data }: ChartProps) => {
  return (
    <Card className="h-80">
      <CardContent className="h-full pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Ernest Usage by Subject</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="subject" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="queries" fill="#ffc658" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

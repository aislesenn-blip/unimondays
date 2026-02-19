import { mockAdminStats } from '../data/mockData';
import { StatsCard } from '../components/dashboard/StatsCard';
import { PeakHungerChart, PrintingVolumeChart, TravelTrendsChart, PlaybookUsageChart } from '../components/dashboard/AnalyticsCharts';
import { Clock, Printer, Map, Brain } from 'lucide-react';

export const AdminDashboard = () => {
  return (
    <div className="space-y-8 pb-20">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">God View Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Peak Hunger" value="20:00" icon={Clock} trend={{ value: 12, isPositive: true }} />
        <StatsCard title="Print Jobs" value="4.8k" icon={Printer} trend={{ value: 5, isPositive: true }} />
        <StatsCard title="Travelers" value="1.2k" icon={Map} trend={{ value: 2, isPositive: false }} />
        <StatsCard title="AI Queries" value="890" icon={Brain} trend={{ value: 24, isPositive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PeakHungerChart data={mockAdminStats.peakHungerTimes} />
        <PrintingVolumeChart data={mockAdminStats.printingVolume} />
        <TravelTrendsChart data={mockAdminStats.travelTrends} />
        <PlaybookUsageChart data={mockAdminStats.playbookUsage} />
      </div>
    </div>
  );
};

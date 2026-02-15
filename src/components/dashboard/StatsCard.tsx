import { Card, CardContent } from '../ui/Card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatsCard = ({ title, value, icon: Icon, trend, className }: StatsCardProps) => {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
              <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
            </div>
          </div>

          {trend && (
            <div className={cn(
              "flex items-center text-xs font-medium px-2 py-1 rounded-full",
              trend.isPositive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

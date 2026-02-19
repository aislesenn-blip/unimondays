import { useAuth } from '../context/AuthContext';
import { MarketplaceGrid } from '../components/marketplace/MarketplaceGrid';
import { mockBusinesses } from '../data/mockData';
import { TravelHero } from '../components/travel/TravelHero';
import type { Category } from '../types';

interface ServiceListProps {
  category: Category;
  title?: string;
}

export const ServiceList = ({ category, title }: ServiceListProps) => {
  const { user } = useAuth();

  const universityBusinesses = mockBusinesses.filter(b => b.university === (user?.university || 'UDSM'));
  const filteredBusinesses = universityBusinesses.filter(b => b.category === category);

  return (
    <div className="min-h-screen bg-slate-50 space-y-6 pb-24">
      <div className="flex items-center justify-between px-4 pt-6 pb-2 sticky top-0 bg-slate-50/95 backdrop-blur z-20 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title || category}</h1>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            {filteredBusinesses.length} Available
        </span>
      </div>

      {/* Hero for Travel */}
      {category === 'Travel' && (
          <div className="px-4">
              <TravelHero />
          </div>
      )}

      <div className="px-2">
         {filteredBusinesses.length > 0 ? (
            <MarketplaceGrid businesses={filteredBusinesses} />
         ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <p>No services found in this category.</p>
            </div>
         )}
      </div>
    </div>
  );
};

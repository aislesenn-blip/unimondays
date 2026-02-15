import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MarketplaceGrid } from '../components/marketplace/MarketplaceGrid';
import { mockBusinesses } from '../data/mockData';
import { Button } from '../components/ui/Button';
import type { Category } from '../types';

export const Marketplace = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');

  const categories: (Category | 'All')[] = ['All', 'Food', 'Stationary', 'Travel', 'Tech', 'Grooming', 'Other'];

  const universityBusinesses = mockBusinesses.filter(b => b.university === (user?.university || 'UDSM'));

  const filteredBusinesses = activeCategory === 'All'
    ? universityBusinesses
    : universityBusinesses.filter(b => b.category === activeCategory);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Marketplace</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 px-2 scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="rounded-full whitespace-nowrap px-6"
          >
            {cat}
          </Button>
        ))}
      </div>

      <MarketplaceGrid businesses={filteredBusinesses} />
    </div>
  );
};

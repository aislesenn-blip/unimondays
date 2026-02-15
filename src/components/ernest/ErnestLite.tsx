import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Handshake } from 'lucide-react';
import { mockBusinesses } from '../../data/mockData';

export const ErnestLite = () => {
  const [query, setQuery] = useState('');

  // Search Algorithm: Query: Merchant Name + Product List + Description + Hidden SEO Tags.
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();

    // Smart Context: If a user types "Wali" (Swahili), Ernest must find items tagged "Rice" or "Wali".
    // This is handled by the data having both tags, but we can also add synonym mapping if needed.
    // For now, the mock data has "Rice" and "Wali" tags.

    const filtered = mockBusinesses.filter((b) => {
       const searchString = `
         ${b.name}
         ${b.description}
         ${b.category}
         ${b.tags?.join(' ')}
       `.toLowerCase();

       return searchString.includes(lowerQuery);
    });

    // Price Comparison: Display results in a List View sorted by Price (Low to High).
    return filtered.sort((a, b) => (a.price || 999999) - (b.price || 999999));
  }, [query]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
         <input
           value={query}
           onChange={(e) => setQuery(e.target.value)}
           placeholder="Search 'Wali', 'Printing', 'Njaa'..."
           className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-400"
         />
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {results.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="group bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors cursor-pointer shadow-sm"
            >
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {b.name}
                      {b.isNegotiable && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" title="Price Negotiable">
                           <Handshake className="w-3 h-3 mr-1" />
                           Maelewano
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{b.description}</p>

                    <div className="flex flex-wrap gap-1 mt-2">
                       {/* Hidden SEO tags are not displayed here as per requirements */}
                    </div>
                 </div>

                 <div className="text-right">
                    {b.price ? (
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">
                        {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(b.price)}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Ask Price</div>
                    )}
                    <div className="flex items-center justify-end text-xs text-slate-400 mt-1">
                       <MapPin className="w-3 h-3 mr-1" /> 1.2km
                    </div>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {query && results.length === 0 && (
           <div className="text-center py-8 text-slate-400 text-sm">
              No results found for "{query}". Try "Rice", "Print", or "Bus".
           </div>
        )}
      </div>
    </div>
  );
};

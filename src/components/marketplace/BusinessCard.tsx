import type { Business } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, Pizza, Bus, Smartphone, Scissors, Star, Wifi, Zap, Truck, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface BusinessCardProps {
  business: Business;
}

const amenityIcons: Record<string, any> = {
  delivery: Truck,
  express: Zap,
  wifi: Wifi,
  color_print: Printer,
};

const categoryIcons: Record<string, any> = {
  Stationary: Printer,
  Food: Pizza,
  Travel: Bus,
  Tech: Smartphone,
  Grooming: Scissors,
  Opportunities: Briefcase,
  Other: Star,
};

export const BusinessCard = ({ business }: BusinessCardProps) => {
  const navigate = useNavigate();
  // Determine icon based on category or fallback
  const IconComponent = categoryIcons[business.category] || Star;

  const handleCardClick = () => {
    navigate(`/merchant/${business.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      onClick={handleCardClick}
      className="cursor-pointer"
    >
      <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm group overflow-hidden bg-white dark:bg-slate-800">

        {/* Icon-based Header (No Photos) */}
        <div className="relative h-40 w-full bg-indigo-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-slate-900">
          <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:linear-gradient(0deg,white,transparent)]" />

          <div className="relative z-10 p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 group-hover:scale-110 transition-transform duration-500">
            <IconComponent className="w-10 h-10 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
          </div>

          <div className="absolute top-2 right-2 flex gap-1 z-20">
             {business.amenities.slice(0, 2).map((amenity) => {
               const AmIcon = amenityIcons[amenity];
               return (
                 <div key={amenity} className="bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-full shadow-sm backdrop-blur-md" title={amenity}>
                   <AmIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                 </div>
               );
             })}
          </div>

          <div className="absolute bottom-2 left-2 flex gap-1 z-20">
            <Badge variant="accent" className="shadow-sm backdrop-blur-md bg-lime-400/90 text-slate-900 border-0 h-6 px-2">
              <Star className="w-3 h-3 mr-1 fill-current" />
              {business.rating}
            </Badge>
            {!business.isOpen && (
               <Badge variant="destructive" className="shadow-sm backdrop-blur-md h-6 px-2 border-0">Closed</Badge>
            )}
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col gap-3 pt-4">
          <div>
            <div className="flex justify-between items-start mb-1 gap-2">
               <h3 className="font-bold text-lg leading-tight line-clamp-1 text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                 {business.name}
               </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5em]">{business.description}</p>

            <div className="mt-3 flex items-center justify-between">
               {business.price ? (
                 <div className="flex items-baseline gap-1">
                   <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                     {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(business.price)}
                   </span>
                 </div>
               ) : (
                  <span className="text-sm font-medium text-slate-400 italic">Ask for price</span>
               )}

               <div className="text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                 {business.university}
               </div>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <Button
              className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-indigo-600 text-white shadow-none border-0 transition-all h-10 text-sm font-medium group-hover:shadow-lg pointer-events-none"
              tabIndex={-1}
            >
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

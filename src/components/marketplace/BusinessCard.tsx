import type { Business } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, Star, Wifi, Zap, Truck } from 'lucide-react';
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

export const BusinessCard = ({ business }: BusinessCardProps) => {
  const navigate = useNavigate();

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
      className="cursor-pointer group"
    >
      <Card className="h-full flex flex-col hover:shadow-xl transition-all duration-300 border-slate-100 group overflow-hidden bg-white">

        {/* Photo Header with Unsplash Fallback */}
        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
          {/* Use business imageUrl if exists, else Unsplash based on Category */}
          <img
            src={business.imageUrl || `https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400`} // Default to Food/General if missing logic, but let's improve
            srcSet={business.imageUrl || `https://source.unsplash.com/featured/400x300?${business.category.replace(' ', ',')},university`}
            onError={(e) => {
                // Fallback if unsplash fails
                e.currentTarget.src = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=400";
            }}
            alt={business.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />

          <div className="absolute top-3 right-3 flex gap-1 z-20">
             {business.amenities.slice(0, 2).map((amenity) => {
               const AmIcon = amenityIcons[amenity];
               return (
                 <div key={amenity} className="bg-white/90 p-1.5 rounded-full shadow-sm backdrop-blur-md border border-slate-100" title={amenity}>
                   <AmIcon className="w-3 h-3 text-emerald-600" />
                 </div>
               );
             })}
          </div>

          <div className="absolute bottom-3 left-3 flex gap-2 z-20">
            <Badge className="bg-white/90 text-slate-900 shadow-sm backdrop-blur-md border-0 h-6 px-2 font-bold flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              {business.rating}
            </Badge>
            {!business.isOpen && (
               <Badge variant="destructive" className="shadow-sm backdrop-blur-md h-6 px-2 border-0">Closed</Badge>
            )}
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col gap-3 pt-5 pb-5">
          <div>
            <div className="flex justify-between items-start mb-1 gap-2">
               <h3 className="font-bold text-lg leading-tight line-clamp-1 text-slate-900 group-hover:text-indigo-600 transition-colors">
                 {business.name}
               </h3>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5em] font-medium leading-relaxed">{business.description}</p>

            <div className="mt-4 flex items-center justify-between">
               {business.price ? (
                 <div className="flex items-baseline gap-1">
                   <span className="text-lg font-bold text-slate-900">
                     {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(business.price)}
                   </span>
                 </div>
               ) : (
                  <span className="text-sm font-medium text-slate-400 italic">Ask for price</span>
               )}

               <div className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-md">
                 {business.university}
               </div>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <Button
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white shadow-none border-0 transition-all h-10 text-sm font-semibold tracking-wide pointer-events-none"
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

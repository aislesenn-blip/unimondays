import type { Business } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, Pizza, Bus, Smartphone, Scissors, Book, MessageCircle, Star, Wifi, Zap, Truck, Handshake } from 'lucide-react';
import { motion } from 'framer-motion';

interface BusinessCardProps {
  business: Business;
}

const amenityIcons: Record<string, any> = {
  delivery: Truck,
  express: Zap,
  wifi: Wifi,
  color_print: Printer,
};

const fallbackIcons: Record<string, any> = {
  printer: Printer,
  food: Pizza,
  bus: Bus,
  tech: Smartphone,
  scissors: Scissors,
  book: Book,
  default: Star,
};

export const BusinessCard = ({ business }: BusinessCardProps) => {
  const FallbackIcon = business.iconFallback ? fallbackIcons[business.iconFallback] : fallbackIcons.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-300 border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm group overflow-hidden">
        <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
          {business.imageUrl ? (
            <img
              src={business.imageUrl}
              alt={business.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900 w-full h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:linear-gradient(0deg,white,transparent)]" />
              <FallbackIcon className="w-16 h-16 mb-8 text-indigo-200 dark:text-indigo-900 relative z-10" strokeWidth={1.5} />

              {/* Visual Amenity Selector for No-Photo Profiles */}
              <div className="absolute bottom-4 flex gap-3 z-20 justify-center w-full">
                 {business.amenities.map((amenity) => {
                   const Icon = amenityIcons[amenity];
                   return (
                     <div key={amenity} className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 backdrop-blur-sm" title={amenity}>
                        <Icon className="w-4 h-4" />
                     </div>
                   );
                 })}
              </div>
            </div>
          )}

          <div className="absolute top-2 right-2 flex gap-1 z-20">
             {business.amenities.map((amenity) => {
               const Icon = amenityIcons[amenity];
               return (
                 <div key={amenity} className="bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-full shadow-sm backdrop-blur-md" title={amenity}>
                   <Icon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                 </div>
               );
             })}
          </div>

          <div className="absolute bottom-2 left-2 flex gap-1 z-20">
            <Badge variant="accent" className="shadow-sm backdrop-blur-md bg-lime-400/90 text-slate-900 border-0 h-6">
              <Star className="w-3 h-3 mr-1 fill-current" />
              {business.rating}
            </Badge>
            {business.isNegotiable && (
               <Badge variant="secondary" className="shadow-sm backdrop-blur-md bg-blue-50/90 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 border-0 h-6">
                 <Handshake className="w-3 h-3 mr-1" />
                 Deal
               </Badge>
            )}
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col gap-3 pt-4">
          <div>
            <div className="flex justify-between items-start mb-1 gap-2">
               <h3 className="font-bold text-lg leading-tight line-clamp-1 text-slate-900 dark:text-slate-100">{business.name}</h3>
               {!business.isOpen && (
                 <Badge variant="destructive" className="text-[10px] px-1.5 h-5 shrink-0">Closed</Badge>
               )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5em]">{business.description}</p>

            <div className="mt-3 flex items-baseline gap-1">
               {business.price ? (
                 <>
                   <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                     {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(business.price)}
                   </span>
                   <span className="text-xs text-slate-400">
                      {business.category === 'Stationary' ? '/ page' : ''}
                      {business.category === 'Travel' ? '/ trip' : ''}
                   </span>
                 </>
               ) : (
                  <span className="text-sm font-medium text-slate-400 italic">Ask for price</span>
               )}
            </div>
          </div>

          <div className="mt-auto pt-2">
            <Button
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-md shadow-green-500/20 border-0 transition-all active:scale-95"
              onClick={() => window.open(`https://wa.me/${business.whatsapp}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat to Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

import { useParams, useNavigate } from 'react-router-dom';
import { mockBusinesses } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import {
  ChevronLeft, MessageCircle, Clock, MapPin, Star, ShieldCheck, Share2, Info, Store,
  Truck, Zap, Wifi, Printer, Pizza, Smartphone, Book, Scissors, Bus, Briefcase as BriefcaseIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

// Helper Components for Icons
const AmenityIcon = ({ amenity, className }: { amenity: string, className?: string }) => {
   const icons: any = {
      delivery: Truck,
      express: Zap,
      wifi: Wifi,
      color_print: Printer
   };
   const Icon = icons[amenity] || Star;
   return <Icon className={className} />;
};

const StoreIcon = ({ category, className }: { category: string, className?: string }) => {
   const icons: any = {
      Food: Pizza,
      Tech: Smartphone,
      Stationary: Book,
      Grooming: Scissors,
      Travel: Bus,
      Opportunities: BriefcaseIcon
   };
   const Icon = icons[category] || Store;
   return <Icon className={className} />;
};

export const MerchantProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const business = mockBusinesses.find(b => b.id === id);

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Merchant Not Found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-6">
      {/* Header / Nav */}
      <div className="flex items-center justify-between px-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 text-slate-500">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        <span className="text-sm font-medium text-slate-400">Merchant Profile</span>
        <Button variant="ghost" size="sm" className="-mr-2 text-slate-500">
           <Share2 className="w-5 h-5" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative h-64 w-full rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-6 shadow-lg group">
           {business.imageUrl ? (
             <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-200 dark:text-indigo-800">
                <StoreIcon category={business.category} className="w-24 h-24 opacity-50" />
             </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

           <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                 <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0 px-3 py-1">
                    {business.category}
                 </Badge>
                 {business.isOpen ? (
                    <Badge variant="secondary" className="bg-lime-500/80 text-white backdrop-blur-md border-0 px-3 py-1">Open Now</Badge>
                 ) : (
                    <Badge variant="destructive" className="backdrop-blur-md border-0 px-3 py-1">Closed</Badge>
                 )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 drop-shadow-md">{business.name}</h1>
              <div className="flex items-center text-sm text-slate-200 gap-4 font-medium">
                 <span className="flex items-center gap-1"><Star className="w-4 h-4 text-lime-400 fill-current" /> {business.rating} Rating</span>
                 <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-indigo-300" /> {business.university}</span>
              </div>
           </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
           {/* Left Column: Details */}
           <div className="md:col-span-2 space-y-8">
              <section>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">About</h3>
                 <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                    {business.description}
                 </p>
                 {business.tags && (
                   <div className="flex flex-wrap gap-2 mt-4">
                      {business.tags.map(tag => (
                        <span key={tag} className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                          #{tag}
                        </span>
                      ))}
                   </div>
                 )}
              </section>

              <section>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Amenities</h3>
                 <div className="grid grid-cols-2 gap-3">
                    {business.amenities.map(amenity => (
                       <div key={amenity} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                             <AmenityIcon amenity={amenity} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                             {amenity.replace('_', ' ')}
                          </span>
                       </div>
                    ))}
                 </div>
              </section>
           </div>

           {/* Right Column: Actions */}
           <div className="space-y-6">
              <Card className="p-6 space-y-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <Clock className="w-3 h-3" /> Opening Hours
                    </h3>
                    <div className="space-y-3">
                       <div className="flex justify-between text-sm pb-2 border-b border-slate-50 dark:border-slate-800">
                          <span className="text-slate-500">Mon - Fri</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                             {business.openingHours || '08:00'} - {business.closingHours || '20:00'}
                          </span>
                       </div>
                       <div className="flex justify-between text-sm pb-2 border-b border-slate-50 dark:border-slate-800">
                          <span className="text-slate-500">Sat</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                             {business.openingHours || '09:00'} - 17:00
                          </span>
                       </div>
                       <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Sun</span>
                          <span className="text-slate-400 italic">Closed</span>
                       </div>
                    </div>
                 </div>

                 <div className="pt-2">
                    {business.price && (
                       <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                          <p className="text-xs text-slate-400 mb-1">Starting from</p>
                          <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(business.price)}
                             </span>
                          </div>
                       </div>
                    )}

                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] text-white shadow-lg shadow-emerald-500/20 border-0 h-12 text-base font-semibold transition-all"
                      onClick={() => window.open(`https://wa.me/${business.whatsapp}`, '_blank')}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Partner with Us
                    </Button>
                    <p className="text-[10px] text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
                       <ShieldCheck className="w-3 h-3" /> 100% Secure & Verified
                    </p>
                 </div>
              </Card>

              {/* Product Catalogue */}
              <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Catalogue</h3>
                 <div className="space-y-4">
                    {[
                      { name: "Full Binding", price: 2500, desc: "Spiral or Hardcover" },
                      { name: "Color Print (A4)", price: 500, desc: "High quality paper" },
                      { name: "Scanning", price: 200, desc: "Per page" }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                         <div>
                            <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.desc}</p>
                         </div>
                         <span className="font-bold text-emerald-600 text-sm">
                            {item.price.toLocaleString()} TZS
                         </span>
                      </div>
                    ))}
                 </div>
              </Card>

              {/* Gallery Grid */}
              <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Gallery</h3>
                 <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                       <div key={i} className="aspect-square rounded-lg bg-slate-100 overflow-hidden">
                          <img
                            src={`https://source.unsplash.com/random/200x200?sig=${i}&office`}
                            alt="Gallery"
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                          />
                       </div>
                    ))}
                 </div>
              </Card>

              {/* Verified Badge Card */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl flex items-start gap-3 border border-indigo-100 dark:border-indigo-900/30">
                 <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                 <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-snug">
                    This merchant is officially verified by <strong>{business.university}</strong> administration for student services.
                 </p>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

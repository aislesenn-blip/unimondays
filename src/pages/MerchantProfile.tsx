import { useParams, useNavigate } from 'react-router-dom';
import { mockBusinesses } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import {
  ChevronLeft, MessageCircle, Clock, MapPin, Star, ShieldCheck, Share2, Info,
  Truck, Zap, Wifi, Printer
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

export const MerchantProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const business = mockBusinesses.find(b => b.id === id);

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Merchant Not Found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // Fallback Image Logic
  const getFallbackImage = () => {
      switch (business.category) {
        case 'Food': return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200";
        case 'Stationary': return "https://images.unsplash.com/photo-1562564055-71e051d33c19?auto=format&fit=crop&q=80&w=1200";
        case 'Travel': return "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=1200";
        default: return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200";
      }
  };

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
        <div className="relative h-64 w-full rounded-3xl overflow-hidden bg-slate-100 mb-6 shadow-lg group">
           <img
             src={business.imageUrl || getFallbackImage()}
             alt={business.name}
             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
             onError={(e) => { e.currentTarget.src = getFallbackImage(); }}
           />
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
                 <h3 className="text-lg font-bold text-slate-900 mb-3">About</h3>
                 <p className="text-slate-600 leading-relaxed text-base">
                    {business.description}
                 </p>
                 {business.tags && (
                   <div className="flex flex-wrap gap-2 mt-4">
                      {business.tags.map(tag => (
                        <span key={tag} className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          #{tag}
                        </span>
                      ))}
                   </div>
                 )}
              </section>

              <section>
                 <h3 className="text-lg font-bold text-slate-900 mb-4">Amenities</h3>
                 <div className="grid grid-cols-2 gap-3">
                    {business.amenities.map(amenity => (
                       <div key={amenity} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                             <AmenityIcon amenity={amenity} className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 capitalize">
                             {amenity.replace('_', ' ')}
                          </span>
                       </div>
                    ))}
                 </div>
              </section>
           </div>

           {/* Right Column: Actions */}
           <div className="space-y-6">
              <Card className="p-6 space-y-6 bg-white border-slate-200 shadow-xl shadow-slate-200/50">
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <Clock className="w-3 h-3" /> Opening Hours
                    </h3>
                    <div className="space-y-3">
                       <div className="flex justify-between text-sm pb-2 border-b border-slate-50">
                          <span className="text-slate-500">Mon - Fri</span>
                          <span className="font-medium text-slate-900">
                             {business.openingHours || '08:00'} - {business.closingHours || '20:00'}
                          </span>
                       </div>
                       <div className="flex justify-between text-sm pb-2 border-b border-slate-50">
                          <span className="text-slate-500">Sat</span>
                          <span className="font-medium text-slate-900">
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
                       <div className="mb-4 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Starting from</p>
                          <div className="flex items-baseline gap-1">
                             <span className="text-3xl font-extrabold text-slate-900">
                                {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(business.price)}
                             </span>
                          </div>
                       </div>
                    )}

                    <Button
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] hover:scale-[1.02] text-white shadow-lg shadow-green-500/20 border-0 h-14 text-lg font-bold transition-all rounded-xl"
                      onClick={() => window.open(`https://wa.me/${business.whatsapp}`, '_blank')}
                    >
                      <MessageCircle className="w-6 h-6 mr-2 fill-current" />
                      Order via WhatsApp
                    </Button>
                    <p className="text-[10px] text-center text-slate-400 mt-3 flex items-center justify-center gap-1 font-medium">
                       <ShieldCheck className="w-3 h-3 text-emerald-500" /> 100% Secure & Verified
                    </p>
                 </div>
              </Card>

              {/* Verified Badge Card */}
              <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 border border-emerald-100">
                 <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                 <p className="text-sm text-emerald-900 leading-snug">
                    This merchant is officially verified by <strong>{business.university}</strong> administration for student services.
                 </p>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

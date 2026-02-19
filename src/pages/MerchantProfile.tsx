import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockBusinesses } from '../data/mockData';
import { useOrder } from '../context/OrderContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import {
  ChevronLeft, Clock, MapPin, Star, Share2, Info, Search, Plus, ShoppingCart, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { MenuItem } from '../types';

export const MerchantProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vendors, menus } = useOrder();
  const business = mockBusinesses.find(b => b.id === id);
  const vendorConfig = id ? vendors[id] : null;
  const vendorMenu = id ? menus[id] : [];

  // Cart State
  const [cart, setCart] = useState<{item: MenuItem, quantity: number}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // If no menu in context (e.g. mock data vendor), use empty array or simulate
  const displayMenu = vendorMenu.length > 0 ? vendorMenu : [];

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Merchant Not Found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // Filter Menu
  const filteredMenu = displayMenu.filter(item =>
     item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item: MenuItem) => {
      setCart(prev => {
          const existing = prev.find(i => i.item.id === item.id);
          if (existing) {
              return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
          }
          return [...prev, { item, quantity: 1 }];
      });
  };

  const removeFromCart = (itemId: string) => {
      setCart(prev => {
          const existing = prev.find(i => i.item.id === itemId);
          if (existing && existing.quantity > 1) {
              return prev.map(i => i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
          }
          return prev.filter(i => i.item.id !== itemId);
      });
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);
  const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

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
    <div className="pb-24 space-y-6 relative">
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
           {/* Left Column: Menu & Search */}
           <div className="md:col-span-2 space-y-8">
              {/* Vendor Policy & Lipa */}
              {vendorConfig && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-start">
                          <div>
                              <h3 className="font-bold text-emerald-900">Ordering Policy</h3>
                              <p className="text-sm text-emerald-700">{vendorConfig.instructions}</p>
                          </div>
                          <Badge className="bg-emerald-200 text-emerald-800 hover:bg-emerald-300 border-0">
                              Window: {vendorConfig.orderWindow.open} - {vendorConfig.orderWindow.close}
                          </Badge>
                      </div>
                      <div className="pt-2 border-t border-emerald-200/50 mt-2">
                           <p className="text-xs font-bold text-emerald-600 uppercase">Lipa Namba Payment</p>
                           <p className="text-lg font-mono text-emerald-900">{vendorConfig.lipaNumber} <span className="text-sm text-emerald-700">({vendorConfig.lipaName})</span></p>
                      </div>
                  </div>
              )}

              {/* Menu Section */}
              <section>
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-bold text-slate-900">Menu</h3>
                     <div className="relative w-1/2">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                         <input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                         />
                     </div>
                 </div>

                 <div className="space-y-3">
                     {filteredMenu.length > 0 ? (
                         filteredMenu.map(item => (
                             <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all">
                                 <div>
                                     <h4 className="font-bold text-slate-900">{item.name}</h4>
                                     <p className="text-xs text-slate-500">{item.description}</p>
                                     <span className="text-sm font-semibold text-emerald-600">{item.price} TZS</span>
                                 </div>
                                 <Button size="sm" onClick={() => addToCart(item)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100">
                                     <Plus className="w-4 h-4 mr-1" /> Add
                                 </Button>
                             </div>
                         ))
                     ) : (
                         <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                             <p className="text-slate-400">No menu items available.</p>
                         </div>
                     )}
                 </div>
              </section>
           </div>

           {/* Right Column: Info & Cart */}
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
                    </div>
                 </div>

                 {/* Sticky Cart Summary for Mobile/Desktop */}
                 <div className="pt-2">
                    {cartCount > 0 ? (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-3">
                            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                                {cart.map((c) => (
                                    <div key={c.item.id} className="flex justify-between text-xs text-emerald-800 items-center">
                                        <span>{c.quantity}x {c.item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span>{c.item.price * c.quantity}</span>
                                            <button onClick={() => removeFromCart(c.item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center text-emerald-900 font-bold pt-2 border-t border-emerald-200">
                                <span>Total ({cartCount})</span>
                                <span>{cartTotal} TZS</span>
                            </div>
                            <Button
                                onClick={() => navigate('/checkout', { state: { cart, vendorId: id, vendorConfig, business } })}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <ShoppingCart className="w-4 h-4 mr-2" /> Checkout
                            </Button>
                        </div>
                    ) : (
                         <p className="text-center text-slate-400 text-sm py-2">Select items to order</p>
                    )}
                 </div>
              </Card>

              {/* Verified Badge Card */}
              <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 border border-emerald-100">
                 <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                 <p className="text-sm text-emerald-900 leading-snug">
                    Verified by <strong>{business.university}</strong>.
                 </p>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

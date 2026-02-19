import { useState, useEffect } from 'react';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ChevronLeft, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { OrderItem } from '../types';

export const Orders = () => {
  const { user } = useAuth();
  const { orders, redeemItem, vendors } = useOrder();
  const navigate = useNavigate();
  const [activeCoupon, setActiveCoupon] = useState<{orderId: string, item: OrderItem} | null>(null);
  const [timer, setTimer] = useState(15);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Filter orders for the current student
  const myOrders = orders.filter(o => o.studentId === (user?.id || 'guest')).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  useEffect(() => {
      let interval: any;
      if (activeCoupon && timer > 0) {
          interval = setInterval(() => {
              setTimer(prev => prev - 1);
          }, 1000);
      } else if (activeCoupon && timer === 0) {
          // Time's up! Mark as redeemed
          redeemItem(activeCoupon.orderId, activeCoupon.item.id);
          setIsRedeeming(false);
          setActiveCoupon(null);
      }
      return () => clearInterval(interval);
  }, [activeCoupon, timer, redeemItem]);

  const handleActivate = (orderId: string, item: OrderItem) => {
      setTimer(15);
      setActiveCoupon({ orderId, item });
      setIsRedeeming(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-2 border-b border-slate-100 sticky top-0 z-10">
          <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="-ml-2">
              <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg text-slate-900">My Orders</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
          {myOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <p>No orders yet.</p>
                  <Button onClick={() => navigate('/dining')} className="mt-4">Find Food</Button>
              </div>
          ) : (
              myOrders.map(order => (
                  <Card key={order.id} className="bg-white border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <div>
                              <p className="font-bold text-slate-900 text-sm">Order #{order.id.slice(-4)}</p>
                              <p className="text-xs text-slate-500">{new Date(order.timestamp).toLocaleString()}</p>
                          </div>
                          <Badge variant={order.status === 'confirmed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'} className={order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : ''}>
                              {order.status.toUpperCase()}
                          </Badge>
                      </div>

                      <div className="p-4 space-y-4">
                          {order.status === 'pending' && (
                              <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2 border border-amber-100">
                                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                                  <p>
                                      Waiting for vendor confirmation. This usually takes 5-10 minutes.
                                      If delayed, call <strong>{vendors[order.vendorId]?.lipaNumber || 'the vendor'}</strong>.
                                  </p>
                              </div>
                          )}

                          <div className="space-y-3">
                              {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                      <div className="flex flex-col">
                                          <span className="font-bold text-slate-900">{item.name}</span>
                                          <span className="text-xs text-slate-500 font-mono">ID: {item.id.slice(0,6)}</span>
                                      </div>

                                      {order.status === 'confirmed' ? (
                                          item.status === 'redeemed' ? (
                                              <Button disabled size="sm" className="bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed w-32">
                                                  CONSUMED
                                              </Button>
                                          ) : (
                                              <Button
                                                  size="sm"
                                                  onClick={() => handleActivate(order.id, item)}
                                                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 w-32 font-bold animate-pulse"
                                              >
                                                  Activate Pickup
                                              </Button>
                                          )
                                      ) : (
                                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                              {order.status === 'pending' ? 'Pending' : 'Cancelled'}
                                          </span>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </Card>
              ))
          )}
      </div>

      {/* FULL SCREEN REDEMPTION MODAL */}
      <AnimatePresence>
          {isRedeeming && activeCoupon && (
              <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center p-4"
              >
                  <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl relative">
                      {/* Animated Anti-Fraud Border */}
                      <div className="absolute inset-0 border-[8px] border-emerald-500 rounded-3xl animate-[spin_4s_linear_infinite] opacity-50 pointer-events-none" style={{ clipPath: 'inset(0 round 24px)' }}></div>

                      {/* Content */}
                      <div className="p-8 flex flex-col items-center text-center space-y-6 relative z-10 bg-white m-1 rounded-2xl h-full">

                          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full animate-bounce">
                              <CheckCircle className="w-12 h-12" />
                          </div>

                          <div>
                              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-1">
                                  {activeCoupon.item.name}
                              </h2>
                              <p className="text-slate-500 font-medium text-lg">
                                  Valid Coupon
                              </p>
                          </div>

                          <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Current Time</p>
                              <p className="text-xl font-mono font-bold text-slate-900">
                                  {new Date().toLocaleTimeString()}
                              </p>
                              <p className="text-sm text-slate-500 font-medium">
                                  {new Date().toLocaleDateString()}
                              </p>
                          </div>

                          {/* Timer */}
                          <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-red-500 relative">
                              <span className="text-5xl font-black text-red-600 tabular-nums">
                                  {timer}
                              </span>
                              <span className="text-xs font-bold text-red-400 uppercase mt-1">Seconds</span>

                              {/* Pulse Effect */}
                              <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping"></div>
                          </div>

                          <p className="text-xs text-slate-400 max-w-[200px]">
                              Show this screen to the vendor immediately. This coupon will expire in {timer} seconds.
                          </p>

                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

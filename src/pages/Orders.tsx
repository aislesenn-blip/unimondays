import { useState, useEffect, useRef } from 'react';
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
  const { orders, redeemItem } = useOrder();
  const navigate = useNavigate();
  const [activeCoupon, setActiveCoupon] = useState<{orderId: string, item: OrderItem} | null>(null);
  const [timer, setTimer] = useState(15.00);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Ref for timer to prevent dependency loops
  const timerRef = useRef<number>(15.00);

  // Filter orders for the current student
  const myOrders = orders.filter(o => o.studentId === (user?.id || 'guest')).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Timer Logic (Milliseconds) - Optimized
  useEffect(() => {
      let interval: any;

      if (activeCoupon) {
          // Reset timer on activation
          timerRef.current = 15.00;
          setTimer(15.00);

          interval = setInterval(() => {
              timerRef.current = Math.max(0, timerRef.current - 0.03);
              setTimer(timerRef.current);

              if (timerRef.current <= 0) {
                  clearInterval(interval);
                  // Time's up! Mark as redeemed
                  redeemItem(activeCoupon.orderId, activeCoupon.item.id);
                  setIsRedeeming(false);
                  setActiveCoupon(null);
              }
          }, 30);
      }

      return () => clearInterval(interval);
  }, [activeCoupon, redeemItem]);

  // Live Clock Logic
  useEffect(() => {
      if (isRedeeming) {
          const clockInterval = setInterval(() => {
              setCurrentTime(new Date());
          }, 1000);
          return () => clearInterval(clockInterval);
      }
  }, [isRedeeming]);

  const handleActivate = (orderId: string, item: OrderItem) => {
      timerRef.current = 15.00;
      setTimer(15.00);
      setCurrentTime(new Date());
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
                                  <Clock className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                                  <p>
                                      Waiting for vendor confirmation...
                                  </p>
                              </div>
                          )}

                          {order.type === 'custom_task' ? (
                              <div className="space-y-3">
                                  <div className="p-3 border border-indigo-100 bg-indigo-50/50 rounded-xl">
                                       <h4 className="font-bold text-indigo-900 text-sm mb-1">Custom Task Request</h4>
                                       <p className="text-xs text-indigo-700 italic mb-2">"{order.customDetails?.description}"</p>

                                       <div className="flex items-center justify-between mt-3">
                                            <span className="text-xs font-bold text-indigo-900">Paid: {order.totalAmount} TZS</span>

                                            {order.status === 'confirmed' ? (
                                                order.items[0]?.status === 'redeemed' ? (
                                                    <Button disabled size="sm" className="bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed w-32">
                                                        CONSUMED
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleActivate(order.id, order.items[0])}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 w-32 font-bold animate-pulse"
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
                                  </div>
                              </div>
                          ) : (
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
                          )}
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
                  <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl relative min-h-[500px]">
                      {/* PROOF OF LIFE: Spinning Gradient Border */}
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 animate-[spin_2s_linear_infinite] opacity-100 pointer-events-none rounded-3xl"></div>

                      {/* Content Container */}
                      <div className="absolute inset-2 bg-white rounded-2xl z-10 flex flex-col items-center p-6 text-center space-y-5">

                          {/* Header */}
                          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full shadow-inner animate-pulse">
                              <CheckCircle className="w-10 h-10" />
                          </div>

                          <div>
                              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                                  {activeCoupon.item.name}
                              </h2>
                              <div className="flex items-center justify-center gap-2 mt-2">
                                 <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                 <p className="text-red-500 font-bold text-xs uppercase tracking-widest">Live Ticket</p>
                              </div>
                          </div>

                          {/* Live Clock Card */}
                          <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Validated At</p>
                              <p className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                                  {currentTime.toLocaleTimeString()}
                              </p>
                              <p className="text-xs text-slate-500 font-medium">
                                  {currentTime.toLocaleDateString()}
                              </p>
                          </div>

                          {/* Millisecond Timer */}
                          <div className="flex-1 flex flex-col items-center justify-center">
                              <div className="relative flex flex-col items-center justify-center w-36 h-36 rounded-full border-8 border-red-500 bg-red-50 shadow-inner">
                                  <span className="text-5xl font-black text-red-600 tabular-nums tracking-tighter">
                                      {timer.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] font-bold text-red-400 uppercase mt-[-5px]">Seconds Remaining</span>
                              </div>
                          </div>

                          <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                              This screen must be moving. Static screenshots are invalid.
                          </p>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

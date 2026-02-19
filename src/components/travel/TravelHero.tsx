import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Bus, Calendar, MapPin, Phone, CheckCircle, ChevronRight, Star } from 'lucide-react';

export const TravelHero = () => {
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({ destination: '', month: '', phone: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock backend submission
        console.log("VIP Waitlist Submission:", formData);
        setShowWaitlist(false);
        setShowSuccess(true);
    };

    return (
        <div className="mb-8">
            {/* VIP HERO CARD */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl"
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>

                <div className="relative p-8 md:p-12 flex flex-col items-start gap-4">
                    <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-500/30">
                        <Star className="w-3 h-3 fill-current" />
                        VIP Holiday Travel
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                        Unlock Exclusive <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            Luxury Bus Discounts
                        </span>
                    </h1>

                    <p className="text-slate-300 text-lg max-w-lg leading-relaxed">
                        Join the waitlist, and we'll negotiate the best fares for your holiday trip.
                        We aggregate student demand to get you VIP prices.
                    </p>

                    <Button
                        onClick={() => setShowWaitlist(true)}
                        className="mt-4 bg-white text-slate-900 hover:bg-emerald-50 font-bold h-12 px-8 text-lg shadow-lg shadow-white/10"
                    >
                        Join VIP Waitlist <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </motion.div>

            {/* WAITLIST MODAL */}
            <AnimatePresence>
                {showWaitlist && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowWaitlist(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="mb-6">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                                    <Bus className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Where are you headed?</h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    Tell us your plans so we can fight for your discount.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Destination</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Arusha, Mwanza, Dodoma"
                                            className="w-full pl-10 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                            value={formData.destination}
                                            onChange={e => setFormData({...formData, destination: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Expected Travel Month</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <select
                                            required
                                            className="w-full pl-10 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium appearance-none"
                                            value={formData.month}
                                            onChange={e => setFormData({...formData, month: e.target.value})}
                                        >
                                            <option value="" disabled>Select Month...</option>
                                            <option value="June">June</option>
                                            <option value="July">July</option>
                                            <option value="December">December</option>
                                            <option value="January">January</option>
                                        </select>
                                    </div>
                                    <p className="text-[10px] text-slate-400">Exact date not required.</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="tel"
                                            placeholder="For discount updates"
                                            className="w-full pl-10 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold mt-4 shadow-lg shadow-emerald-200">
                                    Secure My Discount
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SUCCESS MODAL */}
            <AnimatePresence>
                {showSuccess && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>

                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                                <CheckCircle className="w-10 h-10" />
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2">You're on the VIP list!</h3>

                            <p className="text-slate-500 leading-relaxed mb-8">
                                We are aggregating student numbers to secure the ultimate luxury bus discounts for your route.
                                <br/><br/>
                                <span className="font-bold text-emerald-600">We'll notify you when booking opens.</span>
                            </p>

                            <Button
                                onClick={() => setShowSuccess(false)}
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold"
                            >
                                Got it
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

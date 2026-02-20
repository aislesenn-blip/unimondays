import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const INTERESTS = [
    { id: 'agribusiness', label: 'Agribusiness', image: 'https://images.unsplash.com/photo-1625246333195-58197bd47d19?q=80&w=1000&auto=format&fit=crop' },
    { id: 'law', label: 'Corporate Law', image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1000&auto=format&fit=crop' },
    { id: 'medicine', label: 'Medicine', image: 'https://images.unsplash.com/photo-1576091160550-2187d80018f7?q=80&w=1000&auto=format&fit=crop' },
    { id: 'tech', label: 'Technology', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop' },
    { id: 'arts', label: 'Creative Arts', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000&auto=format&fit=crop' },
    { id: 'business', label: 'Hustle & Biz', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop' },
];

export const Onboarding = ({ onComplete }: { onComplete: (interest: string) => void }) => {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <div className="text-center max-w-md mb-8">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
                    Mental <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Escape.</span>
                </h1>
                <p className="text-slate-500 text-lg">
                    Choose your world. We'll curate a daily stream of global inspiration tailored to you.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
                {INTERESTS.map((item) => (
                    <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelected(item.id)}
                        className={`relative h-40 rounded-3xl overflow-hidden shadow-lg transition-all ${selected === item.id ? 'ring-4 ring-emerald-500 scale-105 z-10' : 'opacity-80 hover:opacity-100'}`}
                    >
                        <img src={item.image} alt={item.label} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition-colors"></div>
                        <div className="absolute bottom-4 left-4 text-white font-bold text-lg text-left leading-none">
                            {item.label}
                        </div>
                        {selected === item.id && (
                            <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full">
                                <Check className="w-4 h-4" />
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>

            <Button
                disabled={!selected}
                onClick={() => selected && onComplete(selected)}
                className="w-full max-w-md h-16 text-xl font-bold bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform"
            >
                Dive In <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
        </div>
    );
};

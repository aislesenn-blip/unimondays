import { useState } from 'react';
import { Onboarding } from '../components/playbook/Onboarding';
import { InspirationFeed } from '../components/playbook/InspirationFeed';
import { Button } from '../components/ui/Button';
import { ChevronLeft } from 'lucide-react';

export const Playbook = () => {
    const [interest, setInterest] = useState<string | null>(null);

    // If no interest, show Onboarding
    if (!interest) {
        return <Onboarding onComplete={setInterest} />;
    }

    return (
        <div className="h-screen bg-black flex flex-col relative">
            {/* Minimal Nav Overlay */}
            <div className="absolute top-6 left-6 z-50">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setInterest(null)}
                    className="bg-black/20 backdrop-blur-md text-white hover:bg-black/40 rounded-full"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>
            </div>

            <InspirationFeed interest={interest} />
        </div>
    );
};

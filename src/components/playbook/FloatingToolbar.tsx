import { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3 } from 'lucide-react';

interface FloatingToolbarProps {
    onFormat: (command: string, value?: string) => void;
}

export const FloatingToolbar = ({ onFormat }: FloatingToolbarProps) => {
    const [position, setPosition] = useState<{ top: number, left: number } | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                setPosition(null);
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Only show if selection is within the editor (we can check container but simple check first)
            if (rect.width > 0) {
                 setPosition({
                     top: rect.top - 50, // Position above
                     left: rect.left + rect.width / 2
                 });
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    if (!position) return null;

    return (
        <div
            ref={toolbarRef}
            style={{
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%)',
                position: 'fixed'
            }}
            className="z-50 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-1 p-1 animate-in fade-in zoom-in duration-200 pointer-events-auto"
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
        >
            <button onClick={() => onFormat('bold')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white">
                <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => onFormat('italic')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white">
                <Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button onClick={() => onFormat('formatBlock', 'H1')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white">
                <Heading1 className="w-4 h-4" />
            </button>
            <button onClick={() => onFormat('formatBlock', 'H2')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white">
                <Heading2 className="w-4 h-4" />
            </button>
            <button onClick={() => onFormat('formatBlock', 'H3')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white">
                <Heading3 className="w-4 h-4" />
            </button>
        </div>
    );
};

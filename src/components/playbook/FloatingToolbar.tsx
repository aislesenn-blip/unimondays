import { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, AlignLeft, AlignCenter, Heading1, Heading2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

export const FloatingToolbar = ({ editorRef }: FloatingToolbarProps) => {
  const [position, setPosition] = useState<{top: number, left: number} | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
        setPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate position above the selection
      setPosition({
        top: rect.top - 50 + window.scrollY, // 50px above
        left: rect.left + (rect.width / 2) - 150 // Center horizontally (approx width/2)
      });
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [editorRef]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    // Keep focus
    if (editorRef.current) {
        editorRef.current.focus();
    }
  };

  if (!position) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        style={{ top: position.top, left: position.left }}
        className="fixed z-50 bg-slate-900 text-white rounded-full shadow-xl flex items-center p-1 gap-1"
        ref={toolbarRef}
      >
        <button onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <Bold className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-1"></div>
        <button onClick={() => execCommand('formatBlock', 'H1')} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <Heading1 className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('formatBlock', 'H2')} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <Heading2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-1"></div>
        <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <AlignCenter className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

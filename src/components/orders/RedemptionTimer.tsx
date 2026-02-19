import { useRef, useEffect } from 'react';

interface RedemptionTimerProps {
  initialTime: number; // in seconds
  onComplete: () => void;
}

export const RedemptionTimer = ({ initialTime, onComplete }: RedemptionTimerProps) => {
  const timerRef = useRef<HTMLDivElement>(null);
  const timeLeftRef = useRef(initialTime);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    timeLeftRef.current = initialTime;
    lastTimeRef.current = performance.now();

    const updateTimer = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      timeLeftRef.current = Math.max(0, timeLeftRef.current - delta);

      if (timerRef.current) {
        timerRef.current.textContent = timeLeftRef.current.toFixed(2);
      }

      if (timeLeftRef.current <= 0) {
        onComplete();
        cancelAnimationFrame(animationFrameRef.current);
      } else {
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [initialTime, onComplete]);

  return (
    <div className="relative flex flex-col items-center justify-center w-36 h-36 rounded-full border-8 border-red-500 bg-red-50 shadow-inner">
      <span
        ref={timerRef}
        className="text-5xl font-black text-red-600 tabular-nums tracking-tighter"
      >
        {initialTime.toFixed(2)}
      </span>
      <span className="text-[10px] font-bold text-red-400 uppercase mt-[-5px]">Seconds Remaining</span>
    </div>
  );
};

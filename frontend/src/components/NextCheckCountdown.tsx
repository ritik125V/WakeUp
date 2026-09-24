'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface NextCheckCountdownProps {
  lastCheckedAt?: string;
  checkIntervalMinutes: number;
  onCycleComplete?: () => void;
}

export function NextCheckCountdown({
  lastCheckedAt,
  checkIntervalMinutes,
  onCycleComplete,
}: NextCheckCountdownProps) {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('00:00');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const updateCountdown = () => {
      const lastCheckMs = lastCheckedAt ? new Date(lastCheckedAt).getTime() : Date.now();
      const intervalMs = checkIntervalMinutes * 60 * 1000;
      const nextCheckMs = lastCheckMs + intervalMs;
      const nowMs = Date.now();

      const elapsedMs = Math.max(0, nowMs - lastCheckMs);
      const remainingMs = Math.max(0, nextCheckMs - nowMs);

      const pct = Math.min(100, Math.max(0, (elapsedMs / intervalMs) * 100));
      setProgressPercent(pct);

      if (remainingMs <= 0) {
        setTimeLeftStr('Executing...');
        if (!completedRef.current) {
          completedRef.current = true;
          if (onCycleComplete) onCycleComplete();
        }
      } else {
        completedRef.current = false;
        const totalSec = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const formattedMins = String(mins).padStart(2, '0');
        const formattedSecs = String(secs).padStart(2, '0');
        setTimeLeftStr(`${formattedMins}:${formattedSecs}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastCheckedAt, checkIntervalMinutes, onCycleComplete]);

  return (
    <div className="inline-flex items-center gap-2 font-mono text-[11px] text-neutral-400">
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3 text-rose-500" />
        <span className="text-neutral-300 font-bold">{timeLeftStr}</span>
      </span>

      {/* Short, compact micro-bar (width 100px) */}
      <div className="w-24 h-1.5 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden shrink-0">
        <div
          className="h-full bg-gradient-to-r from-rose-950 via-rose-600 to-rose-400 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

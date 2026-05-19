import React, { useMemo } from 'react';

/**
 * Circular countdown timer with animated ring
 */
export default function Timer({ timeLeft, maxTime = 10, isActive }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / maxTime;
  const offset = circumference * (1 - progress);

  const isUrgent = timeLeft <= 3;
  const isDanger = timeLeft <= 1;

  const ringColor = useMemo(() => {
    if (isDanger) return '#ef4444';
    if (isUrgent) return '#f59e0b';
    return '#5c7cfa';
  }, [isUrgent, isDanger]);

  const bgRingColor = 'rgba(255,255,255,0.05)';

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="timer-ring w-full h-full" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={bgRingColor}
            strokeWidth="6"
          />
          {/* Progress ring */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: isUrgent ? `drop-shadow(0 0 6px ${ringColor})` : 'none'
            }}
          />
        </svg>
        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-3xl font-bold transition-colors duration-300 ${
              isDanger ? 'text-red-400 animate-pulse' :
              isUrgent ? 'text-amber-400' :
              'text-white'
            }`}
          >
            {timeLeft}
          </span>
        </div>
      </div>
      {/* Progress bar underneath */}
      <div className="w-full max-w-[120px] h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${ringColor}, ${ringColor}cc)`
          }}
        />
      </div>
    </div>
  );
}

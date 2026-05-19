import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for countdown timer with server sync
 */
export function useTimer(serverStartTime, duration = 10) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback((startTime, dur) => {
    const d = dur || duration;
    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsRunning(true);

    // Calculate offset from server time
    const serverOffset = startTime ? (Date.now() - startTime) / 1000 : 0;
    const remaining = Math.max(0, d - serverOffset);
    setTimeLeft(Math.ceil(remaining));

    intervalRef.current = setInterval(() => {
      const elapsed = startTime
        ? (Date.now() - startTime) / 1000
        : d - remaining + 0.1;
      const left = Math.max(0, d - elapsed);
      setTimeLeft(Math.ceil(left));

      if (left <= 0) {
        clearInterval(intervalRef.current);
        setIsRunning(false);
      }
    }, 100);
  }, [duration]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(duration);
  }, [duration]);

  const reset = useCallback((dur) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(dur || duration);
    setIsRunning(false);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { timeLeft, isRunning, start, stop, reset };
}

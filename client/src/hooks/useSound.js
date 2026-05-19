import { useCallback, useRef } from 'react';
import { playTick, playUrgentTick, playCorrect, playWrong, playWin, playNotify, initAudio } from '../utils/sounds';

/**
 * Custom hook for managing game sound effects
 */
export function useSound() {
  const initialized = useRef(false);

  const init = useCallback(() => {
    if (!initialized.current) {
      initAudio();
      initialized.current = true;
    }
  }, []);

  return {
    init,
    playTick,
    playUrgentTick,
    playCorrect,
    playWrong,
    playWin,
    playNotify
  };
}

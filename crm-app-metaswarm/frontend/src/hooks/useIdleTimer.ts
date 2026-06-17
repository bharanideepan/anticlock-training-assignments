import { useEffect, useRef } from 'react';

const IDLE_EVENTS: (keyof DocumentEventMap)[] = [
  'mousemove',
  'keydown',
  'mousedown',
  'touchstart',
  'scroll',
];

export function useIdleTimer(onIdle: () => void, timeoutMs = 30 * 60 * 1000): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(onIdle, timeoutMs);
    };

    reset();
    IDLE_EVENTS.forEach((e) => document.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      IDLE_EVENTS.forEach((e) => document.removeEventListener(e, reset));
    };
  }, [onIdle, timeoutMs]);
}

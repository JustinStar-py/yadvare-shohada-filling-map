"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a number toward its target value (ease-out cubic).
 * Used for Persian numeral counters that feel alive without being arcade-like.
 */
export function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const delta = to - from;

    if (delta === 0) return;
    if (Math.abs(delta) > 10000 || duration <= 0) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + delta * eased);
      setDisplay(current);
      fromRef.current = current;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return display;
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a number toward its target value (ease-out cubic).
 * Used for Persian numeral counters that feel alive without being arcade-like.
 */
export function useCountUp(value: number, duration = 850, skipInitial = true): number {
  const [display, setDisplay] = useState(() => (Number.isFinite(value) ? Math.max(0, value) : 0));
  const fromRef = useRef(display);
  const rafRef = useRef<number | null>(null);
  const isInitialMount = useRef(skipInitial);

  useEffect(() => {
    const to = Number.isFinite(value) ? Math.max(0, value) : fromRef.current;

    // Skip animation from 0 on first non-zero data load
    if (isInitialMount.current && to > 0) {
      isInitialMount.current = false;
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const from = Math.max(0, fromRef.current);
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
      const current = Math.max(0, Math.round(from + delta * eased));
      setDisplay(current);
      fromRef.current = current;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = Math.max(0, to);
        setDisplay(Math.max(0, to));
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return display;
}

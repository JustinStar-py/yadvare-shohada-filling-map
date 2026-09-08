"use client";

import { useState, useEffect } from "react";

/**
 * useModalTransition
 * Emil Kowalski design engineering pattern for interruptible, hardware-accelerated
 * modal enter and exit animations.
 *
 * - Avoids abrupt unmounting: stays mounted during the exit duration.
 * - Interruptible: if reopened during exit, smoothly transitions back to visible.
 * - Hardware accelerated: facilitates transform (scale 0.95 -> 1) & opacity transitions.
 */
export function useModalTransition(isOpen: boolean, exitDuration = 180) {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      let innerRaf: number | null = null;
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => {
          setVisible(true);
        });
      });

      return () => {
        cancelAnimationFrame(outerRaf);
        if (innerRaf !== null) cancelAnimationFrame(innerRaf);
      };
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, exitDuration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, exitDuration]);

  return { mounted, visible };
}


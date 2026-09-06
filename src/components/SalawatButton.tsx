"use client";

import React, { useState, useRef, useCallback } from "react";
import { soundEngine } from "@/lib/client/procedural-audio";
import { generateUUID } from "@/lib/utils";

interface SalawatButtonProps {
  onOptimisticIncrement: (count: number) => void;
  onSubmissionRejected?: (count: number) => void;
  disabled?: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface Orb {
  id: number;
  x: number;
  y: number;
  dx: number;
}

export default function SalawatButton({
  onOptimisticIncrement,
  onSubmissionRejected,
  disabled = false,
}: SalawatButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [pressScale, setPressScale] = useState(false);

  const rippleIdRef = useRef(0);
  const orbIdRef = useRef(0);
  const lastVibrateTimeRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const tapStreakRef = useRef(0);

  // Throttled haptic feedback to prevent motor blur
  const vibrate = useCallback(() => {
    const now = performance.now();
    if (now - lastVibrateTimeRef.current < 280) return;
    lastVibrateTimeRef.current = now;
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15);
      }
    } catch {}
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const now = performance.now();
      // Manage progressive tone pitch on rapid tapping
      if (now - lastTapTimeRef.current < 1100) {
        tapStreakRef.current += 1;
      } else {
        tapStreakRef.current = 0;
      }
      lastTapTimeRef.current = now;

      // 1. Procedural audio with rising chorus progression
      soundEngine.playSalawatTone(tapStreakRef.current);
      vibrate();

      // 2. Click coordinates for ripple & particle burst
      const rect = e.currentTarget.getBoundingClientRect();
      let clientX = rect.left + rect.width / 2;
      let clientY = rect.top + rect.height / 2;
      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e && e.clientX !== 0) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // 3. Subtle touch ripple
      const newRipple: Ripple = {
        id: ++rippleIdRef.current,
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
      setRipples((prev) => [...prev.slice(-2), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);

      // 4. Single refined +۱ spiritual light orb
      const newOrb: Orb = {
        id: ++orbIdRef.current,
        x: clientX - rect.left,
        y: clientY - rect.top,
        dx: (Math.random() - 0.5) * 24,
      };
      setOrbs((prev) => [...prev.slice(-3), newOrb]);
      setTimeout(() => {
        setOrbs((prev) => prev.filter((o) => o.id !== newOrb.id));
      }, 1200);

      // 5. Announce to background atmosphere canvas
      try {
        window.dispatchEvent(
          new CustomEvent("salawat:burst", { detail: { x: clientX, y: clientY } })
        );
      } catch {}

      // 6. Immediate optimistic local update (0ms perceived latency)
      onOptimisticIncrement(1);

      // 7. Background idempotent network dispatch
      const idempotencyKey = generateUUID();
      fetch("/api/salawat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey, count: 1 }),
      })
        .then((res) => {
          if (!res.ok) {
            onSubmissionRejected?.(1);
          }
        })
        .catch(() => {
          try {
            const queue = JSON.parse(localStorage.getItem("offline_salawat_queue") || "[]");
            queue.push({ idempotencyKey, count: 1, timestamp: Date.now() });
            localStorage.setItem("offline_salawat_queue", JSON.stringify(queue.slice(-50)));
          } catch {}
        });
    },
    [disabled, onOptimisticIncrement, onSubmissionRejected, vibrate]
  );

  return (
    <div className="relative flex flex-col items-center justify-center my-1 select-none">
      <div className="relative">
        {/* Soft, calm golden halo behind the button */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[108%] h-20 rounded-full blur-2xl pointer-events-none z-0 transition-opacity duration-700 ${
            disabled ? "opacity-15" : "opacity-45"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(251,191,36,0.3) 0%, rgba(245,158,11,0.1) 45%, transparent 70%)",
          }}
        />

        {/* +۱ rising orbs */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {orbs.map((orb) => (
            <span
              key={orb.id}
              className="absolute animate-orb-rise text-amber-100 font-extrabold text-sm drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
              style={{
                left: orb.x,
                top: orb.y,
                marginLeft: orb.dx,
              }}
            >
              +۱
            </span>
          ))}
        </div>

        {/* Main CTA Button — compact, ergonomic (~64px height) */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          onMouseDown={() => setPressScale(true)}
          onMouseUp={() => setPressScale(false)}
          onMouseLeave={() => setPressScale(false)}
          onTouchStart={() => setPressScale(true)}
          onTouchEnd={() => setPressScale(false)}
          className={`relative z-10 group overflow-hidden w-68 sm:w-76 min-h-[64px] py-3.5 px-8 rounded-2xl font-bold cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.25)] ${
            pressScale ? "scale-[0.97]" : "hover:scale-[1.01] active:scale-[0.97]"
          } ${
            disabled
              ? "bg-gradient-to-b from-slate-700 to-slate-800 text-slate-400 border border-slate-600/60 shadow-none"
              : "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 border border-amber-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(180,83,9,0.3)]"
          }`}
          style={{
            transitionProperty: "transform, filter",
            transitionDuration: "180ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          aria-label="فرستادن صلوات و مشارکت در پویش معنوی یادواره شهدا"
        >
          {/* Subtle Shimmer */}
          {!disabled && (
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/15 to-transparent translate-x-[-160%] group-hover:translate-x-[160%] transition-transform duration-1000 ease-out pointer-events-none" />
          )}

          {/* Ripples */}
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/35 pointer-events-none"
              style={{
                left: ripple.x - 14,
                top: ripple.y - 14,
                width: 28,
                height: 28,
                animation: "shockwaveRing 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
              }}
            />
          ))}

          <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
            <span
              className={`text-xl sm:text-2xl font-extrabold tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.2)] ${
                disabled ? "text-slate-300" : "text-slate-950"
              }`}
            >
              صلوات
            </span>
            <span className={`text-[11px] font-medium ${disabled ? "text-slate-500" : "text-amber-950/90"}`}>
              اللّهُمَّ صَلِّ عَلی مُحَمَّدٍ وَ آلِ مُحَمَّد
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

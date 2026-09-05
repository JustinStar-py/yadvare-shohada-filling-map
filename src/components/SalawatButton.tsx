"use client";

import React, { useState, useRef, useCallback } from "react";
import { soundEngine } from "@/lib/client/procedural-audio";
import { generateUUID } from "@/lib/utils";

interface SalawatButtonProps {
  onOptimisticIncrement: (count: number) => void;
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
  delay: number;
  dx: number;
}

export default function SalawatButton({
  onOptimisticIncrement,
  disabled = false,
}: SalawatButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [pressScale, setPressScale] = useState(false);
  const rippleIdRef = useRef(0);
  const orbIdRef = useRef(0);

  const vibrate = useCallback(() => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    } catch {}
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      if (disabled) return;

      // 1. Sound + haptic — same frame as the touch
      soundEngine.playSalawatTone();
      vibrate();

      // 2. Ripple from the exact touch point
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

      const newRipple: Ripple = { id: ++rippleIdRef.current, x: clientX - rect.left, y: clientY - rect.top };
      setRipples((prev) => [...prev.slice(-3), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 700);

      // 3. +۱ light orbs rising from the exact press point
      const newOrbs: Orb[] = [];
      for (let i = 0; i < 2; i++) {
        newOrbs.push({
          id: ++orbIdRef.current,
          x: clientX - rect.left,
          y: clientY - rect.top,
          delay: i * 110,
          dx: (Math.random() - 0.5) * 30,
        });
      }
      setOrbs((prev) => [...prev.slice(-5), ...newOrbs]);
      const orbIds = newOrbs.map((o) => o.id);
      setTimeout(() => {
        setOrbs((prev) => prev.filter((o) => !orbIds.includes(o.id)));
      }, 1500);

      // 4. Announce to the atmosphere engine: golden stream from THIS point
      try {
        window.dispatchEvent(
          new CustomEvent("salawat:burst", { detail: { x: clientX, y: clientY } })
        );
      } catch {}

      // 5. Optimistic local state — 0ms perceived latency
      onOptimisticIncrement(1);

      // 6. Background idempotent submission
      const idempotencyKey = generateUUID();
      fetch("/api/salawat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey, count: 1 }),
      }).catch(() => {
        try {
          const queue = JSON.parse(localStorage.getItem("offline_salawat_queue") || "[]");
          queue.push({ idempotencyKey, count: 1, timestamp: Date.now() });
          localStorage.setItem("offline_salawat_queue", JSON.stringify(queue));
        } catch {}
      });
    },
    [disabled, onOptimisticIncrement, vibrate]
  );

  return (
    <div className="relative flex flex-col items-center justify-center my-2.5 select-none">
      {/* Button-bounds wrapper — orbs originate exactly at the press point */}
      <div className="relative">
        {/* Radiant halo beneath the button */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-24 rounded-full blur-2xl pointer-events-none z-0 transition-opacity duration-700 ${
            disabled ? "opacity-20" : "opacity-60"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(251,191,36,0.38) 0%, rgba(245,158,11,0.15) 45%, transparent 70%)",
          }}
        />

        {/* +۱ orbs — spawn at press point, float up over the button */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {orbs.map((orb) => (
            <span
              key={orb.id}
              className="absolute animate-orb-rise text-amber-100 font-extrabold text-base drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]"
              style={{
                left: orb.x,
                top: orb.y,
                marginLeft: orb.dx,
                animationDelay: `${orb.delay}ms`,
              }}
            >
              +۱
            </span>
          ))}
        </div>

        {/* Main CTA — ≥56px touch target, iOS-soft press */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          onMouseDown={() => setPressScale(true)}
          onMouseUp={() => setPressScale(false)}
          onMouseLeave={() => setPressScale(false)}
          onTouchStart={() => setPressScale(true)}
          onTouchEnd={() => setPressScale(false)}
          className={`relative z-10 group overflow-hidden w-72 sm:w-80 min-h-[76px] py-4 sm:py-5 px-10 rounded-2xl font-bold cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d16] animate-breathe ${
            pressScale ? "scale-[0.965]" : "hover:scale-[1.012] active:scale-[0.96]"
          } ${
            disabled
              ? "bg-gradient-to-b from-slate-700 to-slate-800 text-slate-400 border border-slate-600/60"
              : "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 text-slate-950 border border-amber-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(120,53,15,0.35)]"
          }`}
          style={{
            transitionProperty: "transform",
            transitionDuration: "220ms",
            transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          }}
          aria-label="فرستادن صلوات و مشارکت در پرواز معنوی امروز"
        >
          {/* Shimmer */}
          {!disabled && (
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/20 to-transparent translate-x-[-160%] group-hover:translate-x-[160%] transition-transform duration-1000 ease-out pointer-events-none" />
          )}

          {/* Ripples */}
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/45 pointer-events-none"
              style={{
                left: ripple.x - 16,
                top: ripple.y - 16,
                width: 32,
                height: 32,
                animation: "shockwaveRing 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
              }}
            />
          ))}

          <div className="relative z-10 flex flex-col items-center justify-center gap-1">
            <span
              className={`text-2xl sm:text-[26px] font-extrabold tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.25)] ${
                disabled ? "text-slate-300" : "text-slate-950"
              }`}
            >
              صلوات
            </span>
            <span className={`text-[11px] sm:text-xs font-medium ${disabled ? "text-slate-500" : "text-amber-950/85"}`}>
              اللّهُمَّ صَلِّ عَلی مُحَمَّدٍ وَ آلِ مُحَمَّد
            </span>
          </div>
        </button>
      </div>

      <span className="text-[11px] text-slate-400/90 mt-2.5 tracking-wide">
        «هر صلوات، یک گام تا پرواز»
      </span>
    </div>
  );
}

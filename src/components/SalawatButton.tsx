"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { soundEngine } from "@/lib/client/procedural-audio";
import { generateUUID, toPersianDigits } from "@/lib/utils";
import { Sparkles, ShieldAlert } from "lucide-react";
import { SalawatSubmissionResponse } from "@/types/campaign";
import { getOrCreateVisitorId } from "@/lib/client/visitor-id";

interface SalawatButtonProps {
  onOptimisticIncrement: (count: number) => void;
  onSubmissionSuccess?: (data: SalawatSubmissionResponse, flushedCount: number) => void;
  onSubmissionRejected?: (count: number) => void;
  /** Inline retries exhausted — hand the batch (with its idempotency key) to the durable outbox. */
  onSubmissionDeferred?: (idempotencyKey: string, count: number) => void;
  disabled?: boolean;
  isLoading3D?: boolean;
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

const COOLDOWN_MS = 2000; // 2 seconds per salawat as specified
const BATCH_SIZE = 5; // Batch of 5 salawat before network dispatch

export default function SalawatButton({
  onOptimisticIncrement,
  onSubmissionSuccess,
  onSubmissionRejected,
  onSubmissionDeferred,
  disabled = false,
  isLoading3D = false,
}: SalawatButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [pressScale, setPressScale] = useState(false);

  // Anti-spam & batch states
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [pendingBatchCount, setPendingBatchCount] = useState(0);
  const [spamWarning, setSpamWarning] = useState<string | null>(null);
  const [batchSuccessToast, setBatchSuccessToast] = useState(false);

  const rippleIdRef = useRef(0);
  const orbIdRef = useRef(0);
  const lastVibrateTimeRef = useRef(0);
  const lastReciteTimeRef = useRef(0);
  const pendingBatchCountRef = useRef(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spamWarningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled haptic feedback
  const vibrate = useCallback(() => {
    const now = performance.now();
    if (now - lastVibrateTimeRef.current < 280) return;
    lastVibrateTimeRef.current = now;
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(18);
      }
    } catch {}
  }, []);

  const vibrateWarning = useCallback(() => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {}
  }, []);

  // Flush pending batch to server with resilient soft retry on 429/network errors
  const flushBatch = useCallback(
    async (countToFlush: number, existingIdempotencyKey?: string) => {
      if (countToFlush <= 0) return;
      const idempotencyKey = existingIdempotencyKey || generateUUID();
      const visitorId = getOrCreateVisitorId();

      for (let attempt = 0; ; attempt++) {
        let networkError = false;
        try {
          const res = await fetch("/api/salawat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idempotencyKey, count: countToFlush, visitorId }),
            keepalive: true,
          });

          if (res.ok) {
            const data = (await res.json().catch(() => null)) as SalawatSubmissionResponse | null;
            if (data) {
              onSubmissionSuccess?.(data, countToFlush);
            }
            return;
          }

          if (res.status === 400 || res.status === 409) {
            // Terminal failure (bad input or day already launched) -> rollback
            onSubmissionRejected?.(countToFlush);
            return;
          }
          // 429 / 5xx: transient — retry below with the SAME idempotencyKey
        } catch {
          networkError = true;
        }

        const maxAttempts = networkError ? 2 : 3;
        if (attempt >= maxAttempts) {
          // Transient failures exhausted — defer to the durable outbox with
          // the same key so the recitation syncs exactly once later.
          onSubmissionDeferred?.(idempotencyKey, countToFlush);
          return;
        }

        const delay = networkError
          ? 1200 * Math.pow(2, attempt) + Math.random() * 300
          : Math.min(8000, 1000 * Math.pow(2, attempt) + Math.random() * 400);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    },
    [onSubmissionDeferred, onSubmissionRejected, onSubmissionSuccess]
  );

  // Flush remaining salawat on unload so no recitation is lost
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingBatchCountRef.current > 0) {
        const idempotencyKey = generateUUID();
        const countToFlush = pendingBatchCountRef.current;
        pendingBatchCountRef.current = 0;
        // Best-effort immediate sync via keepalive POST, plus a durable
        // outbox entry with the SAME key: if the POST is lost the outbox
        // drains it on the next visit; if both land the server dedupes by key.
        flushBatch(countToFlush, idempotencyKey);
        onSubmissionDeferred?.(idempotencyKey, countToFlush);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (spamWarningTimerRef.current) clearTimeout(spamWarningTimerRef.current);
    };
  }, [flushBatch, onSubmissionDeferred]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      if (disabled) return;

      // 1. Anti-bot synthetic event check
      if (e.isTrusted === false) {
        setSpamWarning("درخواست غیرمجاز شناسایی شد.");
        return;
      }

      const now = performance.now();
      const elapsedSinceLast = now - lastReciteTimeRef.current;

      // 2. Anti-spam 2-second cooldown check
      if (elapsedSinceLast < COOLDOWN_MS) {
        const remainingSeconds = Math.max(0.1, (COOLDOWN_MS - elapsedSinceLast) / 1000).toFixed(1);
        setSpamWarning(`لطفاً با طمأنینه ذکر بگویید (${toPersianDigits(remainingSeconds)} ثانیه مانده)`);
        vibrateWarning();
        if (spamWarningTimerRef.current) clearTimeout(spamWarningTimerRef.current);
        spamWarningTimerRef.current = setTimeout(() => setSpamWarning(null), 1800);
        return;
      }

      // Valid recitation!
      lastReciteTimeRef.current = now;
      setIsCoolingDown(true);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        setIsCoolingDown(false);
      }, COOLDOWN_MS);

      setSpamWarning(null);

      // Sound and haptic
      soundEngine.playSalawatTone(pendingBatchCountRef.current);
      vibrate();

      // Coordinates for visual ripple & orbs
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

      // Ripple
      const newRipple: Ripple = {
        id: ++rippleIdRef.current,
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
      setRipples((prev) => [...prev.slice(-2), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);

      // +۱ Orb
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

      // Burst event to celestial sky
      try {
        window.dispatchEvent(
          new CustomEvent("salawat:burst", { detail: { x: clientX, y: clientY } })
        );
      } catch {}

      // Immediate optimistic update on client counter
      onOptimisticIncrement(1);

      // Update pending batch count
      const nextBatchCount = pendingBatchCountRef.current + 1;
      pendingBatchCountRef.current = nextBatchCount;
      setPendingBatchCount(nextBatchCount);

      // Clear any pending idle flush timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      // Check if batch of 5 is reached!
      if (nextBatchCount >= BATCH_SIZE) {
        // Send batch of 5 to server!
        flushBatch(BATCH_SIZE);
        pendingBatchCountRef.current = 0;
        setPendingBatchCount(0);
        setBatchSuccessToast(true);
        setTimeout(() => setBatchSuccessToast(false), 2400);
      } else {
        // Idle flush timer: if user stops clicking for 8s, flush partial batch
        idleTimerRef.current = setTimeout(() => {
          if (pendingBatchCountRef.current > 0) {
            flushBatch(pendingBatchCountRef.current);
            pendingBatchCountRef.current = 0;
            setPendingBatchCount(0);
          }
        }, 8000);
      }
    },
    [disabled, flushBatch, onOptimisticIncrement, vibrate, vibrateWarning]
  );

  return (
    <div className="relative flex flex-col items-center justify-center my-1 select-none">
      {/* Floating anti-spam toast (only appears on rapid spam clicks) */}
      {spamWarning && (
        <div className="absolute -top-7 z-30 px-3 py-1 rounded-full bg-slate-900/95 border border-rose-500/50 text-[11px] font-bold text-rose-300 shadow-xl pointer-events-none flex items-center gap-1 whitespace-nowrap animate-bounce">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>{spamWarning}</span>
        </div>
      )}

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

        {/* Main CTA Button — Apple Liquid Glass interactive surface */}
        <button
          type="button"
          disabled={disabled || isLoading3D}
          onClick={handleClick}
          onMouseDown={() => setPressScale(true)}
          onMouseUp={() => setPressScale(false)}
          onMouseLeave={() => setPressScale(false)}
          onTouchStart={() => setPressScale(true)}
          onTouchEnd={() => setPressScale(false)}
          className={`relative z-10 group overflow-hidden w-72 sm:w-84 max-w-[calc(100vw-2rem)] min-h-[50px] sm:min-h-[54px] py-2.5 sm:py-3 rounded-2xl font-bold cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/90 ${
            pressScale ? "scale-[0.96]" : "hover:scale-[1.01] active:scale-[0.96]"
          } ${
            isLoading3D
              ? "liquid-glass text-amber-200/80 border border-amber-500/35 shadow-none cursor-not-allowed"
              : disabled
              ? "bg-gradient-to-b from-slate-800 to-slate-900 text-slate-400 border border-slate-700/60 shadow-none cursor-not-allowed"
              : isCoolingDown
              ? "bg-gradient-to-b from-amber-500/90 via-amber-600/90 to-amber-700/90 text-slate-950 border border-amber-400/70 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_8px_24px_rgba(245,158,11,0.3)]"
              : "bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#d97706] text-slate-950 border border-white/60 shadow-[inset_0_2px_1.5px_0_rgba(255,255,255,0.75),inset_0_-2px_4px_0_rgba(180,83,9,0.45),0_10px_32px_-4px_rgba(245,158,11,0.55),0_4px_12px_rgba(0,0,0,0.35)]"
          }`}
          style={{
            transitionProperty: "transform, filter, background-color, border-color, box-shadow",
            transitionDuration: "240ms",
            transitionTimingFunction: "cubic-bezier(0.34, 1.4, 0.64, 1)",
          }}
          aria-label="فرستادن صلوات و مشارکت در پویش معنوی یادواره ۷۶ شهید شهیدیه میبد"
        >
          {/* Subtle Liquid Optical Shimmer */}
          {!disabled && !isLoading3D && !isCoolingDown && (
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/30 to-transparent translate-x-[-160%] group-hover:translate-x-[160%] transition-transform duration-1000 ease-out pointer-events-none" />
          )}

          {/* 2-Second Recitation Cooldown Progress Bar */}
          {isCoolingDown && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-950/60 overflow-hidden rounded-b-2xl">
              <div className="h-full bg-amber-300 animate-salawat-cooldown" />
            </div>
          )}

          {/* Ripples */}
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/40 pointer-events-none"
              style={{
                left: ripple.x - 14,
                top: ripple.y - 14,
                width: 28,
                height: 28,
                animation: "shockwaveRing 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
              }}
            />
          ))}

          <div className="relative z-10 flex items-center justify-center gap-2">
            {isLoading3D ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-amber-200/90 tracking-wide">
                  در حال آماده‌سازی صحنه پرواز...
                </span>
              </>
            ) : (
              <span
                className={`text-sm sm:text-base font-black tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.35)] ${
                  disabled ? "text-slate-400" : "text-slate-950"
                }`}
              >
           اللّهُمَّ صَلِّ عَلی مُحَمَّدٍ وَ آلِ مُحَمَّدٍ وَ عَجِّل فَرَجَهُم
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

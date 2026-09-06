"use client";

import React, { useEffect, useState, useRef } from "react";
import { toPersianDigits } from "@/lib/utils";
import { soundEngine } from "@/lib/client/procedural-audio";
import { Shield, X } from "lucide-react";

interface LaunchOverlayProps {
  isOpen: boolean;
  martyrName: string;
  onComplete: () => void;
  /** Fired at T-0: the countdown reached zero and the rocket physically lifts off. */
  onLiftOff?: () => void;
  onClose?: () => void;
}

const COUNT_START = 3;

export default function LaunchOverlay({
  isOpen,
  martyrName,
  onComplete,
  onLiftOff,
  onClose,
}: LaunchOverlayProps) {
  const [count, setCount] = useState(COUNT_START);
  const [phase, setPhase] = useState<"countdown" | "flight" | "completed" | "fading">("countdown");
  const [contentVisible, setContentVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  const onLiftOffRef = useRef(onLiftOff);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onLiftOffRef.current = onLiftOff;
  }, [onLiftOff]);

  useEffect(() => {
    if (!isOpen) {
      setCount(COUNT_START);
      setPhase("countdown");
      setContentVisible(true);
      return;
    }

    soundEngine.playTick();

    let current = COUNT_START;
    const timer = setInterval(() => {
      current--;
      if (current > 0) {
        setCount(current);
        soundEngine.playTick();
      } else {
        clearInterval(timer);
        // T-0: Countdown finished — fade text immediately so user sees full ascent
        setContentVisible(false);

        setTimeout(() => {
          setPhase("flight");
          onLiftOffRef.current?.();
          soundEngine.playLaunchAscent();

          const COMPLETION_MS = 28800;
          setTimeout(() => {
            setPhase("completed");
            setContentVisible(true);
            soundEngine.playStarBirth();

            // Hold completion celebration card for 3.5s so user can appreciate the moment, then fade
            setTimeout(() => {
              setPhase("fading");
              setTimeout(() => {
                onCompleteRef.current();
              }, 800);
            }, 3500);
          }, COMPLETION_MS);
        }, 400);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        // Completely transparent during flight so the rocket is 100% visible without any blue screen or blur
        background:
          phase === "countdown"
            ? "radial-gradient(ellipse at 50% 25%, rgba(2,4,9,0.35) 0%, rgba(2,4,9,0.65) 100%)"
            : phase === "completed"
            ? "radial-gradient(ellipse at 50% 50%, rgba(2,4,9,0.4) 0%, rgba(2,4,9,0.7) 100%)"
            : "transparent",
      }}
      role="dialog"
      aria-label="مراحل پرواز معنوی"
    >
      {/* Optional dismiss button with safe-area support */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-[max(1rem,calc(env(safe-area-inset-left)+0.5rem))] z-50 p-2 rounded-full bg-slate-900/80 border border-slate-700/70 text-slate-400 hover:text-white pointer-events-auto transition-colors"
          aria-label="بستن پنجره پرواز"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Ascending light streaks only during flight */}
      {phase === "flight" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[16, 34, 52, 70, 84].map((left, i) => (
            <div
              key={left}
              className="absolute w-px bg-gradient-to-t from-transparent via-amber-300/30 to-transparent animate-ascend-line"
              style={{
                left: `${left}%`,
                height: 160 + (i % 3) * 60,
                bottom: "-10%",
                animationDuration: `${1.1 + (i % 3) * 0.25}s`,
                animationDelay: `${(i % 3) * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`relative max-w-md w-full text-center flex flex-col items-center gap-6 px-6 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          contentVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-8 scale-90"
        }`}
      >
        {phase === "countdown" && (
          <div className="flex flex-col items-center gap-4 bg-slate-950/70 border border-amber-500/25 p-7 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              آماده‌سازی پرواز معنوی امروز به یاد
            </p>
            <h3 className="text-xl font-bold text-amber-200">{martyrName || "شهدای والامقام"}</h3>

            {/* Countdown numeral with progress ring */}
            <div className="relative w-40 h-40 my-1">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="2.5" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#lo-ring)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - count / COUNT_START)}
                  style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 0.8, 0.35, 1)" }}
                />
                <defs>
                  <linearGradient id="lo-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fde68a" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  key={count}
                  className="text-7xl font-black text-amber-300 tracking-wider animate-count-pop drop-shadow-[0_0_35px_rgba(245,158,11,0.55)] tabular-nums"
                >
                  {toPersianDigits(count)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              اللهم صل علی محمد و آل محمد و عجل فرجهم
            </p>
          </div>
        )}

        {/* During flight: ZERO blocking text or blue screen! Rocket is completely unobstructed */}

        {(phase === "completed" || phase === "fading") && (
          <div
            className={`flex flex-col items-center gap-5 bg-slate-950/80 border border-amber-400/30 p-8 rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.7)] backdrop-blur-md transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              contentVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
            }`}
          >
            {/* Star birth celebration */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-amber-300/60 animate-shockwave" />
              <svg viewBox="0 0 40 40" className="w-16 h-16 animate-star-birth drop-shadow-[0_0_25px_rgba(251,191,36,0.9)]">
                <path
                  d="M20 0 L22.5 17.5 L40 20 L22.5 22.5 L20 40 L17.5 22.5 L0 20 L17.5 17.5 Z"
                  fill="#fef3c7"
                />
                <circle cx="20" cy="20" r="3" fill="#ffffff" />
              </svg>
            </div>

            <p className="text-base sm:text-lg text-amber-200 font-bold">
              یک ستاره جدید در آسمان پویش روشن شد
            </p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              ستاره امروز به یاد {martyrName || "شهدای والامقام"}، برای همیشه در صورت‌فلکی یادواره می‌درخشد.
            </p>
            <div className="text-amber-400/90 text-sm font-medium pt-1">
              قبول حق • صلوات‌های امروز ماندگار شد
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useRef } from "react";
import { toPersianDigits } from "@/lib/utils";
import { soundEngine } from "@/lib/client/procedural-audio";
import { X } from "lucide-react";

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

    soundEngine.onMissileLaunchStart();
    soundEngine.playTick();

    let current = COUNT_START;
    const timer = setInterval(() => {
      current--;
      if (current > 0) {
        setCount(current);
        soundEngine.playTick();
      } else {
        clearInterval(timer);
        // T-0: شمارش معکوس تمام شد، متن محو می‌شود تا پرواز کامل دیده شود
        setContentVisible(false);

        setTimeout(() => {
          setPhase("flight");
          onLiftOffRef.current?.();
          soundEngine.playLaunchAscent();

          // مدت زمان پرواز تا لحظه نشستن و قفل نهایی موشک (۳۸ ثانیه)
          const COMPLETION_MS = 38000;
          setTimeout(() => {
            setPhase("completed");
            setContentVisible(true);
            soundEngine.playStarBirth();

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

    return () => {
      clearInterval(timer);
      soundEngine.onMissileLaunchEnd();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      } ${
        phase === "countdown" ? "backdrop-blur-md bg-slate-950/45" : ""
      }`}
      style={{
        background:
          phase === "countdown"
            ? "radial-gradient(ellipse at 50% 50%, rgba(2,4,9,0.3) 0%, rgba(2,4,9,0.6) 100%)"
            : phase === "completed"
            ? "radial-gradient(ellipse at 50% 50%, rgba(2,4,9,0.4) 0%, rgba(2,4,9,0.7) 100%)"
            : "transparent",
      }}
      role="dialog"
      aria-label="مراحل پرواز معنوی"
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] right-[max(1rem,calc(env(safe-area-inset-right)+0.5rem))] z-50 w-9 h-9 rounded-full liquid-glass-pill text-slate-300 hover:text-white flex items-center justify-center pointer-events-auto cursor-pointer ios-press"
          aria-label="بستن پنجره پرواز"
        >
          <X className="w-4 h-4" />
        </button>
      )}

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
        className={`relative max-w-md w-full text-center flex flex-col items-center gap-6 px-6 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          contentVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"
        }`}
      >
        {phase === "countdown" && (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-amber-500/20 blur-3xl pointer-events-none animate-pulse" />
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_24px_rgba(245,158,11,0.6)]">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#lo-ring)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - count / COUNT_START)}
                  style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 0.8, 0.35, 1)" }}
                />
                <defs>
                  <linearGradient id="lo-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fef08a" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="relative z-10 flex items-center justify-center">
                <span
                  key={count}
                  className="text-8xl sm:text-9xl font-black text-amber-300 tracking-wider animate-count-pop drop-shadow-[0_0_40px_rgba(245,158,11,0.85)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] tabular-nums select-none"
                >
                  {toPersianDigits(count)}
                </span>
              </div>
            </div>
          </div>
        )}

        {(phase === "completed" || phase === "fading") && (
          <div
            className={`flex flex-col items-center gap-5 liquid-glass border border-amber-400/35 p-8 sm:p-9 rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.25)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              contentVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
            }`}
          >
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

            <p className="text-base sm:text-lg text-amber-200 font-black">
              یک ستاره جدید در آسمان پویش روشن شد
            </p>
            <p className="text-xs sm:text-[13px] text-slate-300 max-w-xs leading-relaxed font-medium">
              ستاره امروز به یاد {martyrName || "شهدای والامقام"}، برای همیشه در صورت‌فلکی یادواره می‌درخشد.
            </p>
            <div className="liquid-glass-pill-gold px-4 py-1.5 rounded-full text-amber-200 text-xs sm:text-sm font-bold">
              قبول حق • صلوات‌های امروز ماندگار شد
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState, useRef } from "react";
import { toPersianDigits } from "@/lib/utils";
import { soundEngine } from "@/lib/client/procedural-audio";
import { Sparkles, Shield } from "lucide-react";

interface LaunchOverlayProps {
  isOpen: boolean;
  martyrName: string;
  onComplete: () => void;
}

const COUNT_START = 5;

export default function LaunchOverlay({
  isOpen,
  martyrName,
  onComplete,
}: LaunchOverlayProps) {
  const [count, setCount] = useState(COUNT_START);
  const [phase, setPhase] = useState<"countdown" | "ascent" | "completed">("countdown");
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      setCount(COUNT_START);
      setPhase("countdown");
      return;
    }

    soundEngine.playLaunchAscent();

    let current = COUNT_START;
    const timer = setInterval(() => {
      current--;
      if (current > 0) {
        setCount(current);
        soundEngine.playTick();
      } else {
        clearInterval(timer);
        setPhase("ascent");

        setTimeout(() => {
          setPhase("completed");
          soundEngine.playStarBirth();
          setTimeout(() => {
            onCompleteRef.current();
          }, 3600);
        }, 3200);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-700 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 38%, rgba(0,0,0,0.25) 0%, rgba(2,4,9,0.72) 55%, rgba(2,4,9,0.94) 100%)",
        backdropFilter: "blur(2px)",
      }}
      role="dialog"
      aria-label="مراحل پرواز معنوی"
    >
      {/* Ascending light lines during ascent */}
      {phase === "ascent" && (
        <div className="absolute inset-0 overflow-hidden">
          {[14, 32, 51, 68, 86].map((left, i) => (
            <div
              key={left}
              className="absolute w-px bg-gradient-to-t from-transparent via-amber-200/25 to-transparent animate-ascend-line"
              style={{
                left: `${left}%`,
                height: 140 + (i % 3) * 60,
                bottom: "-5%",
                animationDuration: `${1.3 + (i % 3) * 0.3}s`,
                animationDelay: `${(i % 3) * 0.25}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative max-w-md w-full text-center flex flex-col items-center gap-6 px-6 pb-16 sm:pb-0 pt-10">
        {phase === "countdown" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              آماده‌سازی پرواز معنوی امروز به یاد
            </p>
            <h3 className="text-xl font-bold text-amber-200">{martyrName || "شهدای والامقام"}</h3>

            {/* Countdown numeral with progress ring */}
            <div className="relative w-44 h-44 my-2">
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

        {phase === "ascent" && (
          <div className="flex flex-col items-center gap-5 animate-in zoom-in-95 duration-700">
            <div className="w-20 h-20 rounded-full bg-amber-400/15 border border-amber-300/70 flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.7)]">
              <Sparkles className="w-9 h-9 text-amber-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-wide">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </h2>
            <p className="text-base sm:text-lg text-amber-200 font-semibold">
              پرواز به سوی آسمان یادواره در حال اوج است
            </p>
            <div className="w-40 h-px bg-gradient-to-l from-transparent via-amber-400/60 to-transparent" />
          </div>
        )}

        {phase === "completed" && (
          <div className="flex flex-col items-center gap-5 animate-in fade-in duration-500">
            {/* Star birth */}
            <div className="relative w-28 h-28 flex items-center justify-center">
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

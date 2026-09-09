"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toPersianDigits } from "@/lib/utils";
import { Calendar, Flame, MoonStar, Clock, Radio } from "lucide-react";

interface MemorialCountdownProps {
  daysRemaining?: number;
  campaignPhase?:
    | "distant"
    | "momentum"
    | "approaching"
    | "culmination"
    | "memorial_day"
    | "archived";
  targetDate?: string; // ISO string e.g. "2026-09-17T19:00:00+03:30"
  variant?: "badge" | "timer";
  className?: string;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

const DEFAULT_MEMORIAL_ISO = "2026-09-17T19:00:00+03:30";

function calculateTimeRemaining(targetIso: string): TimeRemaining {
  const targetTime = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = targetTime - now;

  if (isNaN(targetTime) || diff <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { totalMs: diff, days, hours, minutes, seconds, isPast: false };
}

export default function MemorialCountdown({
  daysRemaining,
  campaignPhase,
  targetDate = DEFAULT_MEMORIAL_ISO,
  variant = "badge",
  className = "",
}: MemorialCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    setMounted(true);
    setTimeRemaining(calculateTimeRemaining(targetDate));

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const effectiveDays = useMemo(() => {
    if (typeof daysRemaining === "number") return daysRemaining;
    return timeRemaining.days;
  }, [daysRemaining, timeRemaining.days]);

  // ── Timer View (Full multi-unit live countdown) ──
  if (variant === "timer") {
    if (timeRemaining.isPast || campaignPhase === "archived") {
      return (
        <div className={`w-full flex flex-col items-center gap-3 text-center ${className}`}>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>یادواره شهدای والامقام برگزار گردید • گرامی‌داشت یاد و خاطره شهدا</span>
          </div>
        </div>
      );
    }

    if (
      campaignPhase === "memorial_day" ||
      (timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes <= 30)
    ) {
      return (
        <div className={`w-full flex flex-col items-center gap-3 text-center ${className}`}>
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-gradient-to-l from-amber-500/20 via-amber-400/25 to-amber-500/20 border border-amber-300/50 shadow-[0_0_25px_rgba(245,158,11,0.25)] animate-pulse">
            <Radio className="w-4 h-4 text-amber-300" />
            <span className="text-sm sm:text-base font-bold text-amber-100">
              امروز: روز برگزاری یادواره شهدای والامقام (ساعت ۱۹:۰۰)
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={`w-full flex flex-col items-center gap-4 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-black text-amber-300 tracking-wide liquid-glass-pill-gold px-4 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5 text-amber-300" />
          <span>شمارش معکوس تا آغاز یادواره شهدای والامقام</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 w-full max-w-sm sm:max-w-md mx-auto" dir="rtl">
          {/* روز */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-[24px] liquid-glass border border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <span className="text-xl sm:text-3xl font-black text-amber-300 tabular-nums">
              {mounted ? toPersianDigits(timeRemaining.days) : toPersianDigits(effectiveDays)}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-1">روز</span>
          </div>

          {/* ساعت */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-[24px] liquid-glass border border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <span className="text-xl sm:text-3xl font-black text-amber-300 tabular-nums">
              {mounted ? toPersianDigits(String(timeRemaining.hours).padStart(2, "0")) : "۰۰"}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-1">ساعت</span>
          </div>

          {/* دقیقه */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-[24px] liquid-glass border border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <span className="text-xl sm:text-3xl font-black text-amber-300 tabular-nums">
              {mounted ? toPersianDigits(String(timeRemaining.minutes).padStart(2, "0")) : "۰۰"}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-1">دقیقه</span>
          </div>

          {/* ثانیه */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-[24px] liquid-glass border border-rose-400/35 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(244,63,94,0.15)]">
            <span className="text-xl sm:text-3xl font-black text-rose-400 tabular-nums">
              {mounted ? toPersianDigits(String(timeRemaining.seconds).padStart(2, "0")) : "۰۰"}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-1">ثانیه</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Badge View (Compact pill) ──
  if (campaignPhase === "memorial_day" || effectiveDays === 0) {
    return (
      <div
        className={`relative inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full overflow-hidden animate-gentle-fade liquid-glass-pill-gold ${className}`}
      >
        <MoonStar className="relative w-4 h-4 text-amber-200" />
        <span className="relative text-sm sm:text-base font-black text-amber-100 tracking-wide">
          امروز: روز برگزاری یادواره شهدای والامقام
        </span>
      </div>
    );
  }

  if (campaignPhase === "archived") {
    return (
      <div
        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass-pill text-slate-400 text-xs sm:text-sm animate-gentle-fade ${className}`}
      >
        <Calendar className="w-4 h-4 text-slate-500" />
        <span>یادواره شهدا برگزار گردید • آرشیو ماندگار پویش</span>
      </div>
    );
  }

  const isApproaching = campaignPhase === "approaching" || effectiveDays <= 7;
  const isCulmination = campaignPhase === "culmination" || effectiveDays <= 3;

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full animate-gentle-fade overflow-hidden ${
        isCulmination || isApproaching
          ? "liquid-glass-pill-gold"
          : "liquid-glass-pill text-slate-200"
      } ${className}`}
    >
      {isApproaching || isCulmination ? (
        <Flame
          className={`w-4 h-4 ${isCulmination ? "text-amber-300" : "text-amber-400"}`}
        />
      ) : (
        <Calendar className="w-4 h-4 text-amber-400/80" />
      )}

      <div className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
        <span
          className={`font-black text-base sm:text-lg tabular-nums ${
            isCulmination ? "text-amber-200" : "text-amber-300"
          }`}
        >
          {toPersianDigits(effectiveDays)}
        </span>
        <span className="text-slate-100 font-semibold">روز مانده تا یادواره شهدا</span>
      </div>
    </div>
  );
}

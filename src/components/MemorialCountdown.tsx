"use client";

import React from "react";
import { toPersianDigits } from "@/lib/utils";
import { Calendar, Flame, MoonStar } from "lucide-react";

interface MemorialCountdownProps {
  daysRemaining: number;
  campaignPhase:
    | "distant"
    | "momentum"
    | "approaching"
    | "culmination"
    | "memorial_day"
    | "archived";
}

export default function MemorialCountdown({
  daysRemaining,
  campaignPhase,
}: MemorialCountdownProps) {
  if (campaignPhase === "memorial_day") {
    return (
      <div className="relative inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full overflow-hidden animate-gentle-fade">
        <div className="absolute inset-0 bg-gradient-to-l from-amber-500/25 via-amber-300/30 to-amber-500/25" />
        <div className="absolute inset-0 rounded-full border border-amber-300/60" />
        <MoonStar className="relative w-4 h-4 text-amber-200" />
        <span className="relative text-sm sm:text-base font-bold text-amber-100 tracking-wide">
          امروز: روز برگزاری یادواره شهدای والامقام
        </span>
      </div>
    );
  }

  if (campaignPhase === "archived") {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/70 border border-slate-800 text-slate-400 text-xs sm:text-sm animate-gentle-fade">
        <Calendar className="w-4 h-4 text-slate-500" />
        <span>یادواره شهدا برگزار گردید • آرشیو ماندگار پویش</span>
      </div>
    );
  }

  const isApproaching = campaignPhase === "approaching";
  const isCulmination = campaignPhase === "culmination";

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full animate-gentle-fade overflow-hidden ${
        isCulmination
          ? "border border-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.28)]"
          : isApproaching
          ? "border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.16)]"
          : "border border-slate-700/70 shadow-sm"
      }`}
    >
      <div
        className={`absolute inset-0 ${
          isCulmination
            ? "bg-gradient-to-l from-amber-950/80 via-amber-900/50 to-amber-950/80"
            : isApproaching
            ? "bg-gradient-to-l from-amber-950/50 via-slate-900/80 to-amber-950/50"
            : "bg-slate-900/70"
        }`}
      />

      {isApproaching || isCulmination ? (
        <Flame
          className={`relative w-4 h-4 ${isCulmination ? "text-amber-300" : "text-amber-400"}`}
        />
      ) : (
        <Calendar className="relative w-4 h-4 text-amber-400/80" />
      )}

      <div className="relative text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1.5">
        <span
          className={`font-extrabold text-base sm:text-lg tabular-nums ${
            isCulmination ? "text-amber-200" : "text-amber-300"
          }`}
        >
          {toPersianDigits(daysRemaining)}
        </span>
        <span className="text-slate-200">روز مانده تا یادواره شهدا</span>
      </div>
    </div>
  );
}

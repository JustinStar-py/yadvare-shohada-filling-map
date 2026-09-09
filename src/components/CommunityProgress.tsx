"use client";

import React from "react";
import { DailyMission } from "@/types/campaign";
import { CheckCircle, Sparkles } from "lucide-react";

interface CommunityProgressProps {
  mission: DailyMission;
  animatedCount: number;
  fillPercentage: number;
  onReplayLaunch?: () => void;
  disabled?: boolean;
}

export default function CommunityProgress({
  mission,
  fillPercentage,
  onReplayLaunch,
  disabled = false,
}: CommunityProgressProps) {
  const { state } = mission;
  const percentage = Math.min(100, Math.max(0, fillPercentage));
  const isReady = state === "READY_TO_LAUNCH" || percentage >= 100;
  const isLaunched = state === "LAUNCHED";

  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto px-2 flex flex-col items-center gap-1 sm:gap-1.5 text-center">
      {/* Actionable status line only when ready or launched (Placed on top) */}
      {(isLaunched || isReady) && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 min-h-[18px] mb-0.5">
          {isLaunched ? (
            <div className="flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 shadow-[0_4px_16px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-md">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-bold text-[11px] sm:text-xs leading-relaxed text-center">
                 سوخت پرواز امروز با صلوات‌های پرمهرتان تأمین شد؛ سپاسگزاریم  
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full liquid-glass-pill-gold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-200 font-bold text-xs">آماده پرواز</span>
            </div>
          )}
        </div>
      )}

      {/* Progress track — identical width to SalawatButton (Placed below status line) */}
      <div className="w-72 sm:w-84 max-w-[calc(100vw-2rem)] relative h-5 sm:h-6 py-0.5 sm:py-1">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3.5 sm:h-4.5 rounded-full bg-slate-950/90 border border-white/[0.14] shadow-[inset_0_2px_5px_rgba(0,0,0,0.95),0_1px_2px_rgba(255,255,255,0.08)] overflow-hidden" />

        <div
          className="absolute top-1/2 -translate-y-1/2 right-0 h-3.5 sm:h-4.5 rounded-full"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(to left, #d97706, #f59e0b 35%, #fbbf24 70%, #fef08a)",
            boxShadow: isReady
              ? "0 0 24px rgba(245,158,11,0.9), inset 0 1.5px 2px rgba(255,255,255,0.75)"
              : "0 0 14px rgba(245,158,11,0.55), inset 0 1.5px 2px rgba(255,255,255,0.55)",
            transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Leading edge — prominent bold white left arrow */}
        {percentage > 1 && !isLaunched && (
          <div
            className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 flex items-center justify-center pointer-events-none z-10"
            style={{
              right: `${percentage}%`,
              transition: "right 0.2s ease-out",
            }}
          >
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.95)] drop-shadow-[0_0_4px_#ffffff] -translate-x-1"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16.5 4L6.5 12L16.5 20L14 12L16.5 4Z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

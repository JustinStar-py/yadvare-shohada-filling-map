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
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-bold text-[11px] sm:text-xs leading-relaxed text-center">
                عزیزان، سوخت پرواز امروز با صلوات‌های پرمهرتان تأمین شد؛ سپاسگزاریم ✨
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-200 font-bold text-xs">آماده پرواز</span>
            </div>
          )}
        </div>
      )}

      {/* Progress track — significantly thicker, luminous golden energy beam (Placed below status line) */}
      <div className="w-full relative h-5 sm:h-6 py-0.5 sm:py-1">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3.5 sm:h-4.5 rounded-full bg-slate-950/80 border border-amber-500/25 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] overflow-hidden" />

        <div
          className="absolute top-1/2 -translate-y-1/2 right-0 h-3.5 sm:h-4.5 rounded-full"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(to left, #d97706, #f59e0b 35%, #fbbf24 70%, #fef08a)",
            boxShadow: isReady
              ? "0 0 20px rgba(245,158,11,0.85), inset 0 1px 2px rgba(255,255,255,0.6)"
              : "0 0 12px rgba(245,158,11,0.5), inset 0 1px 2px rgba(255,255,255,0.45)",
            transition: "width 0.2s ease-out",
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

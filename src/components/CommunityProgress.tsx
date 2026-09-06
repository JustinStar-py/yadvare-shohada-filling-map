"use client";

import React from "react";
import { DailyMission } from "@/types/campaign";
import { CheckCircle, Sparkles } from "lucide-react";

interface CommunityProgressProps {
  mission: DailyMission;
  animatedCount: number;
  fillPercentage: number;
  onReplayLaunch?: () => void;
}

export default function CommunityProgress({
  mission,
  fillPercentage,
  onReplayLaunch,
}: CommunityProgressProps) {
  const { state } = mission;
  const percentage = Math.min(100, Math.max(0, fillPercentage));
  const isReady = state === "READY_TO_LAUNCH" || percentage >= 100;
  const isLaunched = state === "LAUNCHED";

  return (
    <div className="w-full max-w-md mx-auto px-2 flex flex-col items-center gap-1.5 text-center">
      {/* Progress track — significantly thicker, luminous golden energy beam */}
      <div className="w-full relative h-6 sm:h-7 py-1">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 sm:h-5 rounded-full bg-slate-950/80 border border-amber-500/25 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] overflow-hidden" />

        <div
          className="absolute top-1/2 -translate-y-1/2 right-0 h-4 sm:h-5 rounded-full"
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
              className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.95)] drop-shadow-[0_0_4px_#ffffff] -translate-x-1"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16.5 4L6.5 12L16.5 20L14 12L16.5 4Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Actionable status line only when ready or launched */}
      {(isLaunched || isReady) && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 min-h-[18px]">
          {isLaunched ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                پرواز امروز به آسمان پیوست
              </span>
              {onReplayLaunch && (
                <button
                  type="button"
                  onClick={onReplayLaunch}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  title="مشاهده دوباره مراحل پرواز"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>مشاهده دوباره پرواز</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-amber-200 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>آماده پرواز</span>
              </span>
              {onReplayLaunch && (
                <button
                  type="button"
                  onClick={onReplayLaunch}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full transition-colors cursor-pointer animate-pulse"
                  title="آغاز یا مشاهده پرواز معنوی"
                >
                  <span>مشاهده پرواز</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

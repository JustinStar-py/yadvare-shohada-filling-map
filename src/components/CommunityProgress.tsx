"use client";

import React from "react";
import { formatPersianNumber, toPersianDigits } from "@/lib/utils";
import { useCountUp } from "@/lib/client/use-count-up";
import { DailyMission } from "@/types/campaign";
import { Users, CheckCircle, Sparkles } from "lucide-react";

interface CommunityProgressProps {
  mission: DailyMission;
  animatedCount: number;
  fillPercentage: number;
  onReplayLaunch?: () => void;
}

export default function CommunityProgress({
  mission,
  animatedCount,
  fillPercentage,
  onReplayLaunch,
}: CommunityProgressProps) {
  const { target, state, participantsCount } = mission;
  const percentage = Math.min(100, Math.max(0, fillPercentage));
  const remaining = Math.max(0, target - animatedCount);
  const isReady = state === "READY_TO_LAUNCH" || percentage >= 100;
  const isLaunched = state === "LAUNCHED";

  const animatedParticipants = useCountUp(participantsCount, 650);

  return (
    <div className="w-full max-w-md mx-auto px-2 flex flex-col items-center gap-1.5 text-center">
      {/* Progress track — clean, calm golden track */}
      <div className="w-full relative h-3">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-900/90 border border-slate-800/80 overflow-hidden" />

        <div
          className="absolute top-1/2 -translate-y-1/2 right-0 h-1.5 rounded-full"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(to left, #f59e0b, #fbbf24 70%, #fde68a)",
            boxShadow: isReady
              ? "0 0 10px rgba(245,158,11,0.6)"
              : "0 0 5px rgba(245,158,11,0.25)",
            transition: "width 0.2s ease-out",
          }}
        />

        {/* Comet head dot */}
        {percentage > 1 && !isLaunched && (
          <div
            className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#fffbeb] shadow-[0_0_8px_rgba(251,191,36,0.9)]"
            style={{
              right: `${percentage}%`,
              transition: "right 0.2s ease-out",
            }}
          />
        )}
      </div>

      {/* Status line — exactly in sync with animatedCount */}
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
        ) : isReady ? (
          <div className="flex items-center gap-2">
            <span className="text-amber-200 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ظرفیت نور کامل شد</span>
              <span className="text-amber-300 font-semibold tabular-nums">({formatPersianNumber(mission.currentCount)} صلوات)</span>
              <span>• آماده پرواز</span>
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
        ) : (
          <span>
            <strong className="text-amber-300 font-bold ml-1 tabular-nums">
              {formatPersianNumber(remaining)}
            </strong>
            صلوات تا تکمیل پرواز
          </span>
        )}

        <span className="text-slate-600">•</span>

        <span className="flex items-center gap-1 text-slate-500 tabular-nums">
          <Users className="w-3 h-3 text-slate-600" />
          {toPersianDigits(animatedParticipants)} همراه
        </span>
      </div>
    </div>
  );
}

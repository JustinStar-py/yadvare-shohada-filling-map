"use client";

import React from "react";
import { formatPersianNumber, toPersianDigits } from "@/lib/utils";
import { useCountUp } from "@/lib/client/use-count-up";
import { DailyMission } from "@/types/campaign";
import { Users, CheckCircle, Sparkles } from "lucide-react";

interface CommunityProgressProps {
  mission: DailyMission;
}

export default function CommunityProgress({ mission }: CommunityProgressProps) {
  const { currentCount, target, state, participantsCount } = mission;
  const percentage = Math.min(100, Math.max(0, (currentCount / (target || 1)) * 100));
  const remaining = Math.max(0, target - currentCount);
  const isReady = state === "READY_TO_LAUNCH" || currentCount >= target;
  const isLaunched = state === "LAUNCHED";

  const animatedCount = useCountUp(currentCount, 850);
  const animatedParticipants = useCountUp(participantsCount, 650);

  return (
    <div className="w-full max-w-md mx-auto px-2 flex flex-col items-center gap-2 text-center">
      {/* Counts — single compact line */}
      <div className="flex items-baseline justify-center gap-1.5">
        <span className="text-2xl sm:text-3xl font-extrabold gold-text tracking-tight tabular-nums">
          {formatPersianNumber(animatedCount)}
        </span>
        <span className="text-[11px] sm:text-xs font-medium text-slate-400">
          از {formatPersianNumber(target)} صلوات هدف امروز
        </span>
      </div>

      {/* Comet progress track */}
      <div className="w-full relative h-3.5">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-slate-900/90 border border-slate-800/90 overflow-hidden">
          {percentage > 2 && percentage < 98 && (
            <div
              className="absolute top-0 bottom-0 w-px bg-slate-700/50"
              style={{ right: "50%" }}
            />
          )}
        </div>

        <div
          className="absolute top-1/2 -translate-y-1/2 right-0 h-2 rounded-full"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(to left, #f59e0b, #fbbf24 70%, #fde68a)",
            boxShadow: isReady
              ? "0 0 14px rgba(245,158,11,0.7)"
              : "0 0 7px rgba(245,158,11,0.3)",
            transition: "width 0.85s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.6s",
          }}
        />

        {/* Comet head */}
        {percentage > 1 && !isLaunched && (
          <div
            className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full"
            style={{
              right: `${percentage}%`,
              background: "radial-gradient(circle, #fffbeb 0%, #fbbf24 55%, rgba(251,191,36,0) 75%)",
              boxShadow: "0 0 12px rgba(251,191,36,0.85)",
              transition: "right 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        )}

        {isReady && !isLaunched && (
          <div
            className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-7 rounded-full animate-aura pointer-events-none"
            style={{
              right: "100%",
              background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
            }}
          />
        )}
      </div>

      {/* Status line */}
      <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 min-h-[18px]">
        {isLaunched ? (
          <span className="text-emerald-300 font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            پرواز امروز به آسمان پیوست
          </span>
        ) : isReady ? (
          <span className="text-amber-200 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            ظرفیت نور کامل شد • آماده پرواز
          </span>
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
          {toPersianDigits(animatedParticipants)} نفر
        </span>
      </div>
    </div>
  );
}

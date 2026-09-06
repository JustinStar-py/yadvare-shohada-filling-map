"use client";

import React from "react";
import ParallaxRocket from "./engine/ParallaxRocket";
import CommunityProgress from "./CommunityProgress";
import SalawatButton from "./SalawatButton";
import OdometerNumber from "./ui/OdometerNumber";
import { PublicCampaignState } from "@/types/campaign";
import { toPersianDigits } from "@/lib/utils";
import { useCountUp } from "@/lib/client/use-count-up";
import { Calendar, ChevronDown } from "lucide-react";

interface HeroSectionProps {
  campaignState: PublicCampaignState;
  isLaunching: boolean;
  hasLiftedOff: boolean;
  onSalawatPress: (count: number) => void;
  onSalawatRejected: (count: number) => void;
  onOpenShareModal: () => void;
  onReplayLaunch?: () => void;
  onFlightComplete?: () => void;
  energyBurstTrigger: number;
}

export default function HeroSection({
  campaignState,
  isLaunching,
  hasLiftedOff,
  onSalawatPress,
  onSalawatRejected,
  onReplayLaunch,
  onFlightComplete,
  energyBurstTrigger,
}: HeroSectionProps) {
  const { mission, daysRemaining, campaignPhase } = campaignState;

  // Single source of animation truth: both counter and rocket liquid lock to this value
  const animatedCount = useCountUp(mission.currentCount, 850, true);
  const fillPercentage = Math.min(
    100,
    Math.max(0, (animatedCount / (mission.target || 1)) * 100)
  );

  return (
    /* First viewport: Seamless 100dvh continuous celestial canvas across all viewports */
    <section className="relative w-full h-[100dvh] min-h-[100dvh] flex flex-col items-center justify-between px-3 pt-[max(3.75rem,calc(env(safe-area-inset-top)+3.25rem))] pb-[max(0.75rem,env(safe-area-inset-bottom))] z-10">
      {/* ── Top: Unified Memorial Context Ribbon ── */}
      <div
        className={`flex flex-col items-center gap-1 text-center shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasLiftedOff
            ? "-translate-y-20 opacity-0 pointer-events-none scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-amber-500/25 shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200">
            {campaignPhase === "memorial_day" ? (
              <strong className="text-amber-300">امروز، روز برگزاری یادواره شهدا</strong>
            ) : daysRemaining === 1 ? (
              <strong className="text-amber-300">فردا، روز یادواره شهدای والامقام</strong>
            ) : (
              <>
                <strong className="text-amber-300 tabular-nums">{toPersianDigits(daysRemaining)}</strong> روز مانده تا یادواره شهدا
              </>
            )}
          </span>
          <span className="text-slate-600 text-xs">•</span>
          <span className="text-[11px] text-slate-400 font-medium">
            روز {toPersianDigits(mission.dayNumber)} پویش
          </span>
        </div>
      </div>

      {/* ── Full-Viewport 3D Rocket Stage Canvas ── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <ParallaxRocket
          fillPercentage={fillPercentage}
          missionState={mission.state}
          isLaunching={isLaunching}
          hasLiftedOff={hasLiftedOff}
          pulseTrigger={energyBurstTrigger}
          onFlightComplete={onFlightComplete}
        />
      </div>

      {/* ── Mid-Stage: Balanced Vertical Framing Counters (Goal on Left, Live Salawat on Right) ── */}
      <div
        className={`absolute inset-x-0 top-[33%] sm:top-[34%] md:top-[35%] -translate-y-1/2 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto px-4 sm:px-8 md:px-12 flex items-stretch justify-between pointer-events-none z-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasLiftedOff
            ? "-translate-y-16 opacity-0 scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
        style={{ direction: "ltr" }}
      >
        {/* Left Side: Target Goal (Vertical Column Box) */}
        <div className="flex flex-col items-center justify-between px-3 py-3.5 sm:px-3.5 sm:py-4 rounded-2xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.45)] w-[76px] sm:w-[88px] md:w-[96px] min-h-[250px] sm:min-h-[270px] md:min-h-[290px] pointer-events-auto select-none">
          <div className="w-full flex flex-col items-center pb-2 border-b border-white/[0.08] text-center">
            <span className="text-sm sm:text-base md:text-lg font-bold text-slate-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              هدف
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-100 tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] py-1">
            <OdometerNumber value={mission.target} vertical />
          </div>
        </div>

        {/* Right Side: Live Salawat Counter (Vertical Column Box, Dominant with Rolling Odometer) */}
        <div className="flex flex-col items-center justify-between px-3 py-3.5 sm:px-3.5 sm:py-4 rounded-2xl bg-slate-900/70 border border-amber-500/35 backdrop-blur-md shadow-[0_8px_28px_rgba(245,158,11,0.22),0_4px_16px_rgba(0,0,0,0.5)] w-[76px] sm:w-[88px] md:w-[96px] min-h-[250px] sm:min-h-[270px] md:min-h-[290px] pointer-events-auto select-none">
          <div className="w-full flex flex-col items-center pb-2 border-b border-amber-500/20 text-center">
            <span className="text-sm sm:text-base md:text-lg font-black text-amber-300 drop-shadow-[0_1px_6px_rgba(245,158,11,0.6)]">
              صلوات
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-black text-amber-300 tracking-tight drop-shadow-[0_2px_22px_rgba(245,158,11,0.75)] drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] py-1">
            <OdometerNumber value={mission.currentCount} vertical />
          </div>
        </div>
      </div>

      {/* ── Bottom: Synchronized Progress + Salawat CTA ── */}
      <div
        className={`w-full flex flex-col items-center gap-1 shrink-0 pb-1 z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasLiftedOff
            ? "translate-y-28 opacity-0 pointer-events-none scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
      >
        <CommunityProgress
          mission={mission}
          animatedCount={animatedCount}
          fillPercentage={fillPercentage}
          onReplayLaunch={onReplayLaunch}
        />

        <SalawatButton
          onOptimisticIncrement={onSalawatPress}
          onSubmissionRejected={onSalawatRejected}
          disabled={isLaunching || campaignPhase === "archived"}
        />

        {/* Subtle, respectful scroll indicator */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500/80 pt-1 pointer-events-none">
          <span>روایت امروز و جزئیات یادواره</span>
          <ChevronDown className="w-3 h-3 animate-bounce" />
        </div>
      </div>
    </section>
  );
}

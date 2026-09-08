"use client";

import React, { useState, useEffect } from "react";
import ParallaxRocket from "./engine/ParallaxRocket";
import CommunityProgress from "./CommunityProgress";
import SalawatButton from "./SalawatButton";
import OdometerNumber from "./ui/OdometerNumber";
import { PublicCampaignState, SalawatSubmissionResponse } from "@/types/campaign";
import { toPersianDigits } from "@/lib/utils";
import { useCountUp } from "@/lib/client/use-count-up";
import { Calendar, Target, Sparkles, Check } from "lucide-react";
import MartyrTulipIcon from "@/components/ui/MartyrTulipIcon";
import { UserDailyMission } from "@/components/DailyMissionTourModal";
import MemorialDialogModal from "./MemorialDialogModal";

interface HeroSectionProps {
  campaignState: PublicCampaignState;
  isLaunching: boolean;
  hasLiftedOff: boolean;
  onSalawatPress: (count: number) => void;
  onSalawatSuccess?: (data: SalawatSubmissionResponse, flushedCount: number) => void;
  onSalawatRejected: (count: number) => void;
  onOpenShareModal: () => void;
  onReplayLaunch?: () => void;
  onFlightComplete?: () => void;
  energyBurstTrigger: number;
  userMission?: UserDailyMission | null;
  onOpenMissionCard?: () => void;
  onRenewMission?: () => void;
}

export default function HeroSection({
  campaignState,
  isLaunching,
  hasLiftedOff,
  onSalawatPress,
  onSalawatSuccess,
  onSalawatRejected,
  onReplayLaunch,
  onFlightComplete,
  energyBurstTrigger,
  userMission,
  onOpenMissionCard,
  onRenewMission,
}: HeroSectionProps) {
  const { mission, daysRemaining, campaignPhase } = campaignState;
  const [isRocketReady, setIsRocketReady] = useState(false);
  const [showMemorialModal, setShowMemorialModal] = useState(false);

  // Safety fallback: unlock after 3.5s if WebGL takes longer or is disabled
  useEffect(() => {
    if (isRocketReady) return;
    const timer = setTimeout(() => {
      setIsRocketReady(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isRocketReady]);

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
        <button
          type="button"
          onClick={() => setShowMemorialModal(true)}
          className="group inline-flex items-center gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-slate-900/85 border border-amber-500/35 hover:border-amber-400/70 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.25)] backdrop-blur-md cursor-pointer emil-btn"
          title="مشاهده اطلاعات و شمارشگر معکوس یادواره شهدا"
        >
          <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-transform duration-160 shrink-0" />
          <span className="text-sm sm:text-base font-bold text-slate-100">
            {campaignPhase === "memorial_day" ? (
              <strong className="text-amber-300 font-black">امروز، روز برگزاری یادواره شهدا</strong>
            ) : daysRemaining === 1 ? (
              <strong className="text-amber-300 font-black">فردا، روز یادواره شهدای والامقام</strong>
            ) : (
              <>
                <strong className="text-amber-300 text-base sm:text-lg font-black tabular-nums">{toPersianDigits(daysRemaining)}</strong> روز مانده تا یادواره شهدا
              </>
            )}
          </span>
          <span className="text-amber-500/40 text-sm">•</span>
          <span className="text-xs sm:text-sm text-slate-300 font-semibold">
            روز {toPersianDigits(mission.dayNumber)} پویش
          </span>
          <span className="text-[10px] text-amber-400/80 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium hidden sm:inline-flex items-center gap-1 group-hover:bg-amber-500/25 transition-colors duration-160">
            اطلاعات مراسم ↗
          </span>
        </button>

        {userMission && (
          userMission.userContributed >= userMission.suggestedCount ? (
            <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-emerald-950/85 border border-emerald-500/45 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-fade-in">
              {/* Tap to view completed martyr letter */}
              <button
                type="button"
                onClick={onOpenMissionCard}
                className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-emerald-300 cursor-pointer emil-btn"
                title="مشاهده نامه شهید"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>عهد شما تمام شد</span>
              </button>

              {onRenewMission && (
                <>
                  <span className="w-px h-3.5 bg-emerald-500/35" />
                  <button
                    type="button"
                    onClick={onRenewMission}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-[0_0_10px_rgba(245,158,11,0.3)] cursor-pointer emil-btn"
                    title="شروع یک عهد معنوی جدید با شهیدی دیگر"
                  >
                    <Sparkles className="w-3 h-3 text-slate-950" />
                    <span>تجدید عهد</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenMissionCard}
              className="mt-1.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-md shadow-sm bg-slate-900/85 border border-rose-500/30 text-slate-200 hover:border-amber-500/45 hover:bg-slate-900 cursor-pointer emil-btn"
              title="مشاهده نامه و عهد معنوی امروز"
            >
              <MartyrTulipIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-slate-300">عهد امروز:</span>
              <span className="font-bold text-amber-300">{userMission.martyr.name}</span>
              <span className="text-slate-500">•</span>
              <span className="tabular-nums font-bold text-slate-100 inline-flex items-center gap-1">
                <span className="text-amber-300 font-black transition-all duration-200">
                  {toPersianDigits(userMission.userContributed)}
                </span>
                <span className="text-slate-400 font-medium text-[11px]">از</span>
                <span>{toPersianDigits(userMission.suggestedCount)}</span>
                <span className="text-slate-300">صلوات</span>
              </span>
            </button>
          )
        )}
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

{/* ── Mid-Stage: Mobile Vertical Framing Counters (< md) ── */}
      <div
        className={`md:hidden absolute inset-x-0 top-[34%] -translate-y-1/2 w-full max-w-sm mx-auto px-4 flex items-stretch justify-between pointer-events-none z-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasLiftedOff
            ? "-translate-y-16 opacity-0 scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
        style={{ direction: "ltr" }}
      >
        {/* Left Side: Target Goal (Vertical Column Box) */}
        <div className="flex flex-col items-center justify-between px-2.5 py-2.5 rounded-2xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.45)] w-[62px] min-h-[190px] pointer-events-auto select-none">
          <div className="w-full flex flex-col items-center pb-1.5 border-b border-white/[0.08] text-center">
            <span className="text-xs font-bold text-slate-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              هدف
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center text-2xl font-extrabold text-slate-100 tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] py-0.5">
            <OdometerNumber value={mission.target} vertical />
          </div>
        </div>

        {/* Right Side: Live Salawat Counter (Vertical Column Box) */}
        <div className="flex flex-col items-center justify-between px-2.5 py-2.5 rounded-2xl bg-slate-900/70 border border-amber-500/35 backdrop-blur-md shadow-[0_8px_28px_rgba(245,158,11,0.22),0_4px_16px_rgba(0,0,0,0.5)] w-[62px] min-h-[190px] pointer-events-auto select-none">
          <div className="w-full flex flex-col items-center pb-1.5 border-b border-amber-500/20 text-center">
            <span className="text-xs font-black text-amber-300 drop-shadow-[0_1px_6px_rgba(245,158,11,0.6)]">
              صلوات
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center text-2xl font-black text-amber-300 tracking-tight drop-shadow-[0_2px_22px_rgba(245,158,11,0.75)] drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] py-0.5">
            <OdometerNumber value={mission.currentCount} vertical />
          </div>
        </div>
      </div>

      {/* ── Mid-Stage: Desktop High-Precision Horizontal Telemetry Cards (>= md) ── */}
      <div
        className={`hidden md:flex absolute inset-x-0 top-[46%] -translate-y-1/2 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-6 lg:px-12 items-center justify-between pointer-events-none z-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasLiftedOff
            ? "-translate-y-16 opacity-0 scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
        style={{ direction: "rtl" }}
      >
        {/* Right Side on Screen in RTL (Right Flank: Live Salawat Counter) */}
        <div className="flex flex-col gap-1.5 p-3.5 lg:p-4 rounded-2xl bg-slate-900/80 border border-amber-500/35 backdrop-blur-md shadow-[0_8px_32px_rgba(245,158,11,0.18),0_4px_16px_rgba(0,0,0,0.5)] w-48 lg:w-56 pointer-events-auto select-none">
          <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs lg:text-sm font-black text-amber-300">
                صلوات‌های ثبت‌شده
              </span>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          </div>
          <div className="py-0.5 flex items-baseline gap-2">
            <OdometerNumber
              value={mission.currentCount}
              vertical={false}
              showCommas={true}
              className="text-2xl lg:text-3xl font-black text-amber-300 tracking-tight drop-shadow-[0_2px_16px_rgba(245,158,11,0.65)]"
            />
            <span className="text-xs font-semibold text-amber-300/80">صلوات</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>پویش زنده و جاری</span>
          </div>
        </div>

        {/* Left Side on Screen in RTL (Left Flank: Target Goal) */}
        <div className="flex flex-col gap-1.5 p-3.5 lg:p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-48 lg:w-56 pointer-events-auto select-none">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs lg:text-sm font-bold text-slate-300">
                هدف پویش
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold bg-slate-800/80 px-2 py-0.5 rounded-full">
              روز {toPersianDigits(mission.dayNumber)}
            </span>
          </div>
          <div className="py-0.5 flex items-baseline gap-2">
            <OdometerNumber
              value={mission.target}
              vertical={false}
              showCommas={true}
              className="text-xl lg:text-2xl font-extrabold text-slate-100 tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
            />
            <span className="text-xs font-medium text-slate-400">صلوات</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>عهد معنوی هدیه به شهدا</span>
          </div>
        </div>
      </div>

      {/* ── Bottom: Synchronized Progress + Salawat CTA ── */}
      <div
        className={`w-full flex flex-col items-center gap-1.5 md:gap-2.5 shrink-0 pb-2 md:pb-4 lg:pb-6 z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
          onSubmissionSuccess={onSalawatSuccess}
          onSubmissionRejected={onSalawatRejected}
          disabled={isLaunching || campaignPhase === "archived"}
        />
      </div>

      {/* Memorial Event Information & Countdown Dialog Modal */}
      <MemorialDialogModal
        isOpen={showMemorialModal}
        onClose={() => setShowMemorialModal(false)}
        memorialTitle={campaignState.settings.memorialTitle}
        memorialDate={campaignState.memorialDate}
        memorialTime={campaignState.memorialTime || campaignState.settings.memorialTime}
        memorialLocation={campaignState.settings.memorialLocation}
        daysRemaining={daysRemaining}
        dayNumber={mission.dayNumber}
        campaignPhase={campaignPhase}
      />
    </section>
  );
}

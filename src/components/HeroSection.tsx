"use client";

import React, { useState, useEffect } from "react";
import ParallaxRocket from "./engine/ParallaxRocket";
import CommunityProgress from "./CommunityProgress";
import SalawatButton from "./SalawatButton";
import OdometerNumber from "./ui/OdometerNumber";
import { PublicCampaignState, SalawatSubmissionResponse } from "@/types/campaign";
import { toPersianDigits } from "@/lib/utils";
import { useCountUp } from "@/lib/client/use-count-up";
import { Calendar, Target, Sparkles, Rocket } from "lucide-react";
import { UserDailyMission } from "@/components/DailyMissionTourModal";
import MemorialDialogModal from "./MemorialDialogModal";
import { MissileModel } from "./engine/missile-catalog";

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
  const activeMissile = campaignState.settings.activeMissileModel || "kheibar";
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
  const isLaunched = (mission.state as string) === "LAUNCHED";
  const isReadyToLaunch = mission.state === "READY_TO_LAUNCH" || fillPercentage >= 100;
  const canWatchFlight = Boolean(onReplayLaunch && (isLaunched || isReadyToLaunch));

  return (
    /* First viewport: Seamless 100dvh continuous celestial canvas across all viewports */
    <section className="relative w-full h-[100dvh] min-h-[100dvh] flex flex-col items-center justify-between px-3 pt-[max(5.25rem,calc(env(safe-area-inset-top)+4.75rem))] pb-[max(0.75rem,env(safe-area-inset-bottom))] z-10">
      {/* ── Top: Unified Memorial Context Ribbon ── */}
      <div
        className={`relative flex flex-col items-center gap-1 text-center shrink-0 z-30 pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasLiftedOff
            ? "-translate-y-20 opacity-0 pointer-events-none scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setShowMemorialModal(true);
          }}
          className="group inline-flex items-center gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full liquid-glass-pill-gold hover:border-amber-400/80 shadow-[0_8px_30px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_36px_rgba(245,158,11,0.4)] cursor-pointer ios-press pointer-events-auto"
          title="مشاهده اطلاعات و شمارشگر معکوس یادواره شهدا"
        >
          <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-transform duration-200 shrink-0" />
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
          <span className="text-[10px] text-amber-300/90 bg-amber-500/20 border border-amber-400/35 px-2 py-0.5 rounded-full font-bold hidden sm:inline-flex items-center gap-1 group-hover:bg-amber-500/30 transition-colors">
            اطلاعات مراسم ↗
          </span>
        </button>
      </div>

      {/* ── Full-Viewport 3D Rocket Stage Canvas ── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {/* Invisible tour anchor positioned right over the central rocket */}
        <div
          data-tour="rocket"
          className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-48 sm:w-56 md:w-64 h-[280px] sm:h-[340px] md:h-[400px] pointer-events-none"
        />
        <ParallaxRocket
          fillPercentage={fillPercentage}
          missionState={mission.state}
          isLaunching={isLaunching}
          hasLiftedOff={hasLiftedOff}
          pulseTrigger={energyBurstTrigger}
          missileModel={activeMissile}
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
        <div
          data-tour="target"
          className="flex flex-col items-center justify-between px-2.5 py-2.5 rounded-2xl liquid-glass w-[64px] min-h-[192px] pointer-events-auto select-none"
        >
          <div className="w-full flex flex-col items-center pb-1.5 border-b border-white/[0.12] text-center">
            <span className="text-xs font-bold text-slate-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              هدف
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center text-2xl font-extrabold text-slate-100 tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] py-0.5">
            <OdometerNumber value={mission.target} vertical />
          </div>
        </div>

        {/* Right Side: Live Salawat Counter (Vertical Column Box) */}
        <div
          data-tour="counter"
          className="flex flex-col items-center justify-between px-2.5 py-2.5 rounded-2xl liquid-glass-gold w-[64px] min-h-[192px] pointer-events-auto select-none"
        >
          <div className="w-full flex flex-col items-center pb-1.5 border-b border-amber-400/25 text-center">
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
        <div
          data-tour="counter"
          className="flex flex-col gap-1.5 p-3.5 lg:p-4 rounded-[26px] liquid-glass-gold w-48 lg:w-56 pointer-events-auto select-none"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-amber-400/25">
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
        <div
          data-tour="target"
          className="flex flex-col gap-1.5 p-3.5 lg:p-4 rounded-[26px] liquid-glass w-48 lg:w-56 pointer-events-auto select-none"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.12]">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs lg:text-sm font-bold text-slate-300">
                هدف پویش
              </span>
            </div>
            <span className="text-[11px] text-slate-300 font-bold bg-white/[0.08] px-2 py-0.5 rounded-full border border-white/[0.1]">
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

      {/* ── Southeast Tactical Square HUD Button: "مشاهده پرواز" ── */}
      {canWatchFlight && (
        <div
          className={`absolute left-[calc(50%+52px)] sm:left-[calc(50%+84px)] md:left-[calc(50%+120px)] top-[62%] sm:top-[59%] md:top-[57%] -translate-y-1/2 z-20 pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hasLiftedOff
              ? "opacity-0 pointer-events-none scale-90 translate-y-4"
              : "opacity-100 scale-100 translate-y-0"
          }`}
          style={{ direction: "ltr" }}
        >
          {/* Subtle golden atmospheric pulse aura */}
          <div className="absolute -inset-1.5 rounded-2xl bg-amber-500/25 blur-md animate-pulse pointer-events-none" />

          <button
            type="button"
            disabled={isLaunching}
            onClick={onReplayLaunch}
            className="group relative w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] md:w-[96px] md:h-[96px] rounded-2xl sm:rounded-3xl liquid-glass-gold hover:border-amber-300 flex flex-col items-center justify-between p-2 sm:p-2.5 cursor-pointer ios-press overflow-hidden select-none"
            title="مشاهده پرواز معنوی موشک به آسمان شهدا"
            aria-label="مشاهده پرواز"
          >
            {/* Holographic light scan on hover */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-300/15 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-700 ease-out pointer-events-none" />

            {/* Tactical 4-Corner HUD Brackets */}
            <span className="absolute top-1 right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 border-t-2 border-r-2 border-amber-400/80 rounded-tr-xs group-hover:border-amber-300 pointer-events-none" />
            <span className="absolute top-1 left-1 w-2.5 h-2.5 sm:w-3 sm:h-3 border-t-2 border-l-2 border-amber-400/80 rounded-tl-xs group-hover:border-amber-300 pointer-events-none" />
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 border-b-2 border-r-2 border-amber-400/80 rounded-br-xs group-hover:border-amber-300 pointer-events-none" />
            <span className="absolute bottom-1 left-1 w-2.5 h-2.5 sm:w-3 sm:h-3 border-b-2 border-l-2 border-amber-400/80 rounded-bl-xs group-hover:border-amber-300 pointer-events-none" />

            {/* Top Micro-HUD Telemetry Header */}
            <div className="w-full flex items-center justify-between px-0.5 text-[8px] sm:text-[9px] font-mono text-amber-400/80 pointer-events-none">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 tracking-tighter">LIVE</span>
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-amber-400/90 tracking-wider">۳D</span>
            </div>

            {/* Center Angled Rocket Launch Icon with Flame Glow */}
            <div className="relative flex items-center justify-center my-0.5">
              <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:translate-x-0.5 group-hover:scale-110">
                <Rocket className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-amber-400 group-hover:text-amber-300 drop-shadow-[0_0_14px_rgba(245,158,11,0.7)]" />
                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 bg-amber-400 rounded-full blur-2xs opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
              </div>
            </div>

            {/* Bottom Persian Label: "مشاهده پرواز" */}
            <div className="w-full text-center" style={{ direction: "rtl" }}>
              <span className="block text-[9.5px] sm:text-[11px] md:text-xs font-black text-amber-300 group-hover:text-amber-200 tracking-tight leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">
                مشاهده پرواز
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── Bottom: Synchronized Progress + Salawat CTA ── */}
      <div
        className={`w-full flex flex-col items-center gap-1.5 md:gap-2.5 shrink-0 pb-2 md:pb-4 lg:pb-6 z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasLiftedOff
            ? "translate-y-28 opacity-0 pointer-events-none scale-95"
            : "translate-y-0 opacity-100 scale-100"
        }`}
      >
        <div data-tour="progress" className="w-full flex justify-center">
          <CommunityProgress
            mission={mission}
            animatedCount={animatedCount}
            fillPercentage={fillPercentage}
            onReplayLaunch={onReplayLaunch}
          />
        </div>

        <div data-tour="salawat-button" className="flex justify-center">
          <SalawatButton
            onOptimisticIncrement={onSalawatPress}
            onSubmissionSuccess={onSalawatSuccess}
            onSubmissionRejected={onSalawatRejected}
            disabled={isLaunching || campaignPhase === "archived"}
          />
        </div>
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

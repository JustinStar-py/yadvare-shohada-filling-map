"use client";

import React from "react";
import MemorialCountdown from "./MemorialCountdown";
import ParallaxRocket from "./engine/ParallaxRocket";
import CommunityProgress from "./CommunityProgress";
import SalawatButton from "./SalawatButton";
import { PublicCampaignState } from "@/types/campaign";
import { toPersianDigits } from "@/lib/utils";
import { Share2 } from "lucide-react";

interface HeroSectionProps {
  campaignState: PublicCampaignState;
  isLaunching: boolean;
  onSalawatPress: (count: number) => void;
  onOpenShareModal: () => void;
  energyBurstTrigger: number;
}

export default function HeroSection({
  campaignState,
  isLaunching,
  onSalawatPress,
  onOpenShareModal,
  energyBurstTrigger,
}: HeroSectionProps) {
  const { mission, daysRemaining, campaignPhase, settings } = campaignState;
  const fuelPercentage = Math.min(
    100,
    Math.round((mission.currentCount / (mission.target || 1)) * 100)
  );

  return (
    /* First viewport: everything essential (countdown → rocket → button) fits
       without scrolling. Rocket stage is the flexible element that yields. */
    <section className="relative w-full min-h-[calc(100dvh-68px)] flex flex-col items-center px-4 pt-2 pb-5 z-10">
      {/* ── Top (compact): countdown + invocation ── */}
      <div className="flex flex-col items-center gap-1.5 text-center shrink-0">
        <MemorialCountdown daysRemaining={daysRemaining} campaignPhase={campaignPhase} />

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-6 h-px bg-slate-700/70" />
          <span>روز {toPersianDigits(mission.dayNumber)} پویش</span>
          <span className="w-6 h-px bg-slate-700/70" />
        </div>

        <h2 className="text-xs sm:text-sm text-slate-300/90 font-medium max-w-md leading-relaxed">
          {settings.campaignSubtitle || "«هر صلوات، یک قدم تا پرواز»"}
        </h2>
      </div>

      {/* ── Middle (flexible): rocket stage — yields to keep the CTA on-screen ── */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center py-1.5">
        {/* Celestial light shaft — brightens with daily fuel */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-36 sm:w-52 h-[108%] pointer-events-none animate-beam"
          style={{
            opacity: 0.16 + (fuelPercentage / 100) * 0.42,
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(251,191,36,0.12) 30%, rgba(252,211,77,0.18) 55%, rgba(251,191,36,0.09) 75%, transparent 100%)",
            clipPath: "polygon(38% 0%, 62% 0%, 88% 100%, 12% 100%)",
            filter: "blur(6px)",
            transition: "opacity 1s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />

        <ParallaxRocket
          currentCount={mission.currentCount}
          target={mission.target}
          missionState={mission.state}
          isLaunching={isLaunching}
          pulseTrigger={energyBurstTrigger}
        />
      </div>

      {/* ── Bottom (compact): progress + CTA + share ── */}
      <div className="w-full flex flex-col items-center gap-1.5 shrink-0">
        <CommunityProgress mission={mission} />

        <SalawatButton
          onOptimisticIncrement={onSalawatPress}
          disabled={isLaunching || campaignPhase === "archived"}
        />

        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-amber-300 transition-colors py-1.5 px-4 rounded-full"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>اشتراک‌گذاری سهم امروز پویش</span>
        </button>
      </div>
    </section>
  );
}

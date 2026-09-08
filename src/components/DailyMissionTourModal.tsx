"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MartyrProfile } from "@/types/campaign";
import { toPersianDigits } from "@/lib/utils";
import { soundEngine } from "@/lib/client/procedural-audio";
import MartyrTulipIcon from "@/components/ui/MartyrTulipIcon";
import YadvareLogo from "@/components/ui/YadvareLogo";
import { Mail, Check, X } from "lucide-react";

// WebGL budget optimization: Load 3D Envelope dynamically on client only when modal is mounted
const Envelope3DCanvas = dynamic(() => import("./engine/Envelope3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-72 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
    </div>
  ),
});

export interface UserDailyMission {
  date: string;
  martyr: MartyrProfile;
  suggestedCount: number;
  userContributed: number;
  completedTour: boolean;
}

interface DailyMissionTourModalProps {
  isOpen: boolean;
  date: string;
  mission: { martyr: MartyrProfile; suggestedCount: number } | null;
  onComplete: (mission: UserDailyMission) => void;
  onClose?: () => void;
  startRevealed?: boolean;
}

export default function DailyMissionTourModal({
  isOpen,
  date,
  mission,
  onComplete,
  onClose,
  startRevealed = false,
}: DailyMissionTourModalProps) {
  // 3D readiness: disables buttons while WebGL is compiling or downloading chunks
  const [is3DReady, setIs3DReady] = useState(startRevealed);
  const [isOpeningEnvelope, setIsOpeningEnvelope] = useState(startRevealed);
  // Stages: "closed" -> "emerging" (rising out of envelope) -> "revealed" (flying forward to camera)
  const [letterStage, setLetterStage] = useState<"closed" | "emerging" | "revealed">(
    startRevealed ? "revealed" : "closed"
  );

  useEffect(() => {
    if (isOpen) {
      if (startRevealed) {
        setIs3DReady(true);
        setIsOpeningEnvelope(true);
        setLetterStage("revealed");
      } else {
        setIs3DReady(false);
        setIsOpeningEnvelope(false);
        setLetterStage("closed");
      }
    }
  }, [isOpen, startRevealed]);

  // Safety fallback: ensure button unlocks even on low-end devices or slow networks
  useEffect(() => {
    if (!isOpen || is3DReady || startRevealed) return;
    const timer = setTimeout(() => {
      setIs3DReady(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isOpen, is3DReady, startRevealed]);

  if (!isOpen || !mission) return null;

  const handleOpenEnvelope = () => {
    if (!is3DReady || isOpeningEnvelope) return;

    try {
      soundEngine.playTick();
    } catch {}

    setIsOpeningEnvelope(true);

    // 1. At 320ms, flap is half-open: letter emerges upwards from inside envelope pocket
    setTimeout(() => {
      setLetterStage("emerging");
    }, 320);

    // 2. At 750ms, letter swoops smoothly forward toward the camera into focal view
    setTimeout(() => {
      setLetterStage("revealed");
      try {
        soundEngine.playStarBirth();
      } catch {}
    }, 750);
  };

  const handleConfirmMission = () => {
    try {
      soundEngine.playReadyChime();
    } catch {}

    const completed: UserDailyMission = {
      date,
      martyr: mission.martyr,
      suggestedCount: mission.suggestedCount,
      userContributed: 0,
      completedTour: true,
    };

    onComplete(completed);
  };

  const martyrDisplayName =
    mission.martyr.name.startsWith("شهید") ||
    mission.martyr.name.startsWith("سردار") ||
    mission.martyr.name.startsWith("جانباز")
      ? mission.martyr.name
      : `شهید ${mission.martyr.name}`;

  const martyrSubtitle = mission.martyr.name.includes("سردار")
    ? "به یاد سردار سرافراز"
    : mission.martyr.name.includes("جانباز")
    ? "به یاد جانباز شهید والامقام"
    : "به یاد شهید والامقام";

  const isLetterActive = letterStage === "emerging" || letterStage === "revealed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#050811]/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/[0.08] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/[0.07] rounded-full blur-[90px] pointer-events-none" />

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="fixed top-4 left-4 sm:top-6 sm:left-6 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer z-50 shadow-lg backdrop-blur-md"
          title="بستن"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Main Container with 3D Perspective - Becomes completely transparent when letter is revealed */}
      <div
        className={`relative w-full max-w-sm sm:max-w-md my-auto flex flex-col items-center text-center [perspective:1200px] transition-all duration-700 ${
          isLetterActive
            ? "p-0 min-h-0 bg-transparent border-transparent shadow-none"
            : "rounded-3xl bg-gradient-to-b from-slate-900/95 via-[#0b101d]/95 to-slate-950/98 border border-amber-500/25 p-5 sm:p-6 shadow-[0_12px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(245,158,11,0.15)] min-h-[480px] sm:min-h-[510px]"
        }`}
      >
        {/* ── Background Layer: Header Title (fades out completely when letter is revealed) ── */}
        <div
          className={`w-full flex flex-col items-center transition-all duration-500 ${
            isLetterActive ? "opacity-0 blur-sm pointer-events-none scale-90 hidden" : "opacity-100"
          }`}
        >
          <div className="relative w-12 h-12 mx-auto rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0">
            <YadvareLogo className="w-8 h-8 drop-shadow-sm" />
          </div>

          <span className="text-xs font-bold text-amber-400/90 mb-0.5">
            عهد معنوی امروز شما
          </span>
          <p className="text-[11px] text-slate-400 mb-1">
            با گشودن نامه، شهید همراه امروز و سهم صلوات شما مشخص خواهد شد
          </p>
        </div>

        {/* ── Background Layer: 3D Envelope Canvas (fades out completely when letter is revealed) ── */}
        <div
          className={`w-full h-64 sm:h-72 my-1 relative transition-all duration-500 ${
            isLetterActive
              ? "opacity-0 blur-sm scale-90 pointer-events-none hidden"
              : "opacity-100 scale-100 cursor-pointer"
          }`}
        >
          <Envelope3DCanvas
            isOpen={isOpeningEnvelope}
            onOpen={handleOpenEnvelope}
            onReady={() => setIs3DReady(true)}
          />

          {/* Loading placeholder spinner before 3D initializes */}
          {!is3DReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-slate-950/50 backdrop-blur-sm rounded-2xl z-20 pointer-events-none">
              <div className="w-9 h-9 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
              <span className="text-[11px] text-amber-300/80 font-medium">
                در حال آماده‌سازی پاکت نورانی...
              </span>
            </div>
          )}
        </div>

        {/* ── Background Layer: "Open Letter" Button (disabled while 3D is initializing) ── */}
        <div
          className={`w-full mt-2 flex flex-col items-center gap-1.5 transition-all duration-300 ${
            isOpeningEnvelope || isLetterActive ? "opacity-0 pointer-events-none translate-y-3 hidden" : "opacity-100"
          }`}
        >
          <button
            type="button"
            disabled={!is3DReady || isOpeningEnvelope}
            onClick={(e) => {
              e.stopPropagation();
              if (!is3DReady) return;
              handleOpenEnvelope();
            }}
            className={`w-full max-w-xs py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 relative z-30 select-none ${
              !is3DReady
                ? "bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed shadow-none"
                : isOpeningEnvelope
                ? "bg-slate-800 text-slate-400 cursor-not-allowed scale-95 shadow-none"
                : "bg-gradient-to-l from-rose-600 via-rose-500 to-rose-600 text-white hover:brightness-110 active:scale-[0.98] shadow-[0_0_25px_rgba(225,29,72,0.4)] hover:shadow-[0_0_35px_rgba(225,29,72,0.6)] cursor-pointer"
            }`}
          >
            {!is3DReady ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin shrink-0" />
                <span>در حال آماده‌سازی پاکت...</span>
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                <span>گشودن نامه</span>
              </>
            )}
          </button>
          <span className="text-[10px] sm:text-[11px] text-amber-400/70 select-none">
            {is3DReady
              ? "(می‌توانید روی خود پاکت نامه نیز ضربه بزنید)"
              : "لطفاً چند لحظه تا بارگذاری کامل پاکت شکیبا باشید"}
          </span>
        </div>

        {/* ── Foreground Layer: Absolute Cinematic Flying Parchment Letter ── */}
        <div
          className={`w-full max-w-sm sm:max-w-md flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            letterStage === "closed"
              ? "opacity-0 pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
              : letterStage === "emerging"
              ? "opacity-90 pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
              : "opacity-100 pointer-events-auto relative z-40"
          }`}
          style={{
            transform:
              letterStage === "closed"
                ? "translateY(55px) translateZ(-220px) scale(0.42)"
                : letterStage === "emerging"
                ? "translateY(-20px) translateZ(-90px) scale(0.7)"
                : "translateY(0px) translateZ(0px) scale(1)",
          }}
        >
          {/* The Illuminated Parchment Letter with Overlapping Martyr Portrait */}
          <div className="relative w-full pt-12 sm:pt-14 pb-5 sm:pb-6 px-5 sm:px-7 rounded-3xl bg-gradient-to-b from-[#fffef9] via-[#faf4e6] to-[#f4ecdc] text-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(245,158,11,0.25)] border-2 border-amber-500/50 text-center">
            {/* Absolute Overlapping Martyr Portrait Badge (50% outside top edge, 50% resting on letter) */}
            <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center pointer-events-none">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_12px_28px_rgba(0,0,0,0.65),0_0_20px_rgba(245,158,11,0.45)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 border-2 border-amber-100 flex items-center justify-center relative">
                  {mission.martyr.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mission.martyr.photoUrl}
                      alt={martyrDisplayName}
                      className="w-full h-full object-cover object-top scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-rose-950 to-slate-950">
                      <MartyrTulipIcon className="w-8 h-8 text-rose-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parchment inner delicate border */}
            <div className="absolute inset-2 sm:inset-2.5 rounded-2xl border border-amber-600/25 pointer-events-none" />

            <span className="relative z-10 text-xs sm:text-sm font-semibold text-amber-900/80 block mb-0.5 mt-1">
              {martyrSubtitle}
            </span>

            {/* Prominent, Clearly Visible Martyr Name */}
            <h2 className="relative z-10 text-2xl sm:text-3xl font-black text-slate-950 tracking-tight my-1.5">
              {martyrDisplayName}
            </h2>

            <div className="relative z-10 w-16 h-0.5 mx-auto bg-gradient-to-l from-transparent via-amber-700/35 to-transparent my-3" />

            {/* Assigned Salawat Share */}
            <div className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-2 rounded-2xl bg-amber-500/10 border border-amber-600/20">
              <span className="text-sm sm:text-base font-bold text-amber-950">سهم شما:</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-700 tabular-nums">
                {toPersianDigits(mission.suggestedCount)}
              </span>
              <span className="text-sm sm:text-base font-bold text-amber-950">صلوات</span>
            </div>
          </div>

          {/* Accept Button */}
          <button
            type="button"
            onClick={handleConfirmMission}
            className="mt-4 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-l from-emerald-600 via-emerald-500 to-emerald-600 text-white font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-50"
          >
            <Check className="w-5 h-5" />
            <span>پذیرش عهد</span>
          </button>
        </div>
      </div>
    </div>
  );
}

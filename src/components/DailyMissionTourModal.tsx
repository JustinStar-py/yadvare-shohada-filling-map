"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MartyrProfile } from "@/types/campaign";
import { toPersianDigits } from "@/lib/utils";
import { soundEngine } from "@/lib/client/procedural-audio";
import MartyrTulipIcon from "@/components/ui/MartyrTulipIcon";
import { Mail, Check, X } from "lucide-react";

// WebGL budget optimization: Load 3D Envelope dynamically on client only when modal is mounted
const Envelope3DCanvas = dynamic(() => import("./engine/Envelope3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-72 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
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
  const [phase, setPhase] = useState<"envelope" | "revealed">(
    startRevealed ? "revealed" : "envelope"
  );
  const [isOpeningEnvelope, setIsOpeningEnvelope] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhase(startRevealed ? "revealed" : "envelope");
      setIsOpeningEnvelope(false);
    }
  }, [isOpen, startRevealed]);

  if (!isOpen || !mission) return null;

  const handleOpenEnvelope = () => {
    if (isOpeningEnvelope) return;

    try {
      soundEngine.playTick();
    } catch {}

    setIsOpeningEnvelope(true);

    // Fallback safety timeout if 3D animation callback is delayed
    setTimeout(() => {
      setPhase("revealed");
    }, 1250);
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

  const martyrDisplayName = mission.martyr.name.startsWith("شهید")
    ? mission.martyr.name
    : `شهید ${mission.martyr.name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#070b14]/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/[0.08] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/[0.07] rounded-full blur-[90px] pointer-events-none" />

      <div className="relative w-full max-w-sm sm:max-w-md my-auto rounded-3xl bg-gradient-to-b from-slate-900/95 via-[#0b101d]/95 to-slate-950/98 border border-amber-500/25 p-5 sm:p-7 shadow-[0_12px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center max-h-[94vh] overflow-y-auto z-10">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer z-30"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── Sequence 1: 3D Envelope Waiting to be Opened ── */}
        {phase === "envelope" && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Top Tulip Emblem */}
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-rose-500/20 to-amber-500/10 border border-rose-500/30 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(244,63,94,0.25)] shrink-0">
              <MartyrTulipIcon className="w-7 h-7" />
            </div>

            <span className="text-xs font-bold text-amber-400/90 mb-0.5">
              عهد معنوی امروز شما
            </span>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-2">
              با گشودن نامه، شهید همراه امروز و سهم صلوات شما مشخص خواهد شد
            </p>

            {/* Three.js 3D Envelope Canvas */}
            <div className="w-full h-64 sm:h-72 my-1 relative overflow-hidden rounded-2xl flex items-center justify-center cursor-pointer">
              <Envelope3DCanvas
                isOpen={isOpeningEnvelope}
                martyrName={mission.martyr.name}
                suggestedCount={mission.suggestedCount}
                onOpen={handleOpenEnvelope}
                onLetterEmerged={() => {
                  setPhase("revealed");
                }}
              />
            </div>

            <div className="w-full mt-3 flex flex-col items-center gap-1.5 relative z-30">
              <button
                type="button"
                disabled={isOpeningEnvelope}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEnvelope();
                }}
                className={`w-full max-w-xs py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 shadow-[0_0_25px_rgba(225,29,72,0.4)] cursor-pointer select-none pointer-events-auto relative z-30 ${
                  isOpeningEnvelope
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed scale-95 shadow-none"
                    : "bg-gradient-to-l from-rose-600 via-rose-500 to-rose-600 text-white hover:brightness-110 active:scale-[0.98] hover:shadow-[0_0_35px_rgba(225,29,72,0.6)]"
                }`}
              >
                <Mail className="w-5 h-5" />
                <span>{isOpeningEnvelope ? "در حال گشودن نامه..." : "گشودن نامه"}</span>
              </button>
              <span className="text-[10px] sm:text-[11px] text-amber-400/70 select-none">
                (می‌توانید روی خود پاکت نامه نیز ضربه بزنید)
              </span>
            </div>
          </div>
        )}

        {/* ── Sequence 2: Minimalist, Pure Letter Revealed ── */}
        {phase === "revealed" && (
          <div className="w-full flex flex-col items-center animate-scale-up">
            {/* The Illuminated Parchment Letter */}
            <div className="relative w-full p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#fffef9] via-[#faf4e6] to-[#f4ecdc] text-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.65),0_0_40px_rgba(245,158,11,0.25)] border-2 border-amber-500/50 text-center overflow-hidden">
              {/* Parchment inner delicate border */}
              <div className="absolute inset-2 sm:inset-2.5 rounded-2xl border border-amber-600/25 pointer-events-none" />

              {/* Tulip Watermark Crest */}
              <div className="relative z-10 w-11 h-11 mx-auto rounded-2xl bg-gradient-to-b from-rose-500/15 to-amber-500/10 border border-rose-500/25 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <MartyrTulipIcon className="w-7 h-7" />
              </div>

              <span className="relative z-10 text-xs sm:text-sm font-semibold text-amber-900/80 block mb-1">
                به یاد شهید والامقام
              </span>

              {/* Prominent, Clearly Visible Martyr Name */}
              <h2 className="relative z-10 text-2xl sm:text-3xl font-black text-slate-950 tracking-tight my-2">
                {martyrDisplayName}
              </h2>

              <div className="relative z-10 w-16 h-0.5 mx-auto bg-gradient-to-l from-transparent via-amber-700/35 to-transparent my-4" />

              {/* Assigned Salawat Share */}
              <div className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-600/20">
                <span className="text-sm sm:text-base font-bold text-amber-950">سهم شما:</span>
                <span className="text-2xl sm:text-3xl font-black text-rose-700 tabular-nums">
                  {toPersianDigits(mission.suggestedCount)}
                </span>
                <span className="text-sm sm:text-base font-bold text-amber-950">صلوات</span>
              </div>
            </div>

            {/* Confirm and enter rocket experience */}
            <button
              type="button"
              onClick={handleConfirmMission}
              className="mt-5 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-l from-emerald-600 via-emerald-500 to-emerald-600 text-white font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-30"
            >
              <Check className="w-5 h-5" />
              <span>یا علی — پذیرش عهد و ورود به پویش</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MartyrProfile } from "@/types/campaign";
import { toPersianDigits } from "@/lib/utils";
import { soundEngine } from "@/lib/client/procedural-audio";
import MartyrTulipIcon from "@/components/ui/MartyrTulipIcon";
import { Mail, Sparkles, ArrowLeft, Check, X } from "lucide-react";

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
  const [phase, setPhase] = useState<"welcome" | "envelope" | "revealed">(
    startRevealed ? "revealed" : "welcome"
  );
  const [isOpeningEnvelope, setIsOpeningEnvelope] = useState(false);
  const [hasEmerged, setHasEmerged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhase(startRevealed ? "revealed" : "welcome");
      setIsOpeningEnvelope(false);
      setHasEmerged(false);
    }
  }, [isOpen, startRevealed]);

  if (!isOpen || !mission) return null;

  const handleOpenEnvelope = () => {
    if (isOpeningEnvelope) return;

    // User gesture initializes / unlocks audio safely on mobile browsers
    try {
      soundEngine.playTick();
    } catch {}

    setIsOpeningEnvelope(true);

    // Fallback timer if 3D animation callback takes longer
    setTimeout(() => {
      setHasEmerged(true);
      setPhase("revealed");
    }, 1500);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#070b14]/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/[0.08] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/[0.07] rounded-full blur-[90px] pointer-events-none" />

      <div className="relative w-full max-w-md my-auto rounded-3xl bg-gradient-to-b from-slate-900/95 via-[#0b101d]/95 to-slate-950/98 border border-amber-500/25 p-5 sm:p-6 shadow-[0_12px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center max-h-[94vh] overflow-y-auto z-10">
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

        {/* Top Martyr Tulip Emblem */}
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-rose-500/20 to-amber-500/10 border border-rose-500/30 flex items-center justify-center mb-3 sm:mb-4 shadow-[0_0_20px_rgba(244,63,94,0.25)] shrink-0">
          <MartyrTulipIcon className="w-8 h-8 sm:w-9 sm:h-9" />
        </div>

        {/* ── Phase 1: Warm Welcome Message ── */}
        {phase === "welcome" && (
          <div className="flex flex-col items-center animate-fade-in w-full">
            <span className="text-[11px] sm:text-xs font-bold text-amber-400/90 tracking-widest uppercase mb-1">
              پویش معنوی یادواره شهدای شهیدیه
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 mb-2 sm:mb-3">
              سلام بر شما زائر و همراه گرامی شهدا
            </h2>

            <div className="w-12 h-0.5 bg-gradient-to-l from-transparent via-amber-500/60 to-transparent mb-3" />

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-center mb-5 max-w-md">
              به این محفل معنوی و عهد آسمانی خوش آمدید. هر روز، با عهدی معنوی به یاد یکی از شهدای والامقام گرد هم می‌آییم تا با نثار صلوات، در مسیر پرواز معنوی و تکمیل ظرفیت روزانه سهیم باشیم.
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-xs text-amber-200/90 flex items-center gap-2.5 mb-6 text-right w-full">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                یک پاکت عهد ویژه امروز برای شما آماده شده است تا شهید همراه امروزتان را بشناسید.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPhase("envelope")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-l from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold text-sm shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.5)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-30"
            >
              <span>دریافت عهد معنوی امروز</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Phase 2: 3D Envelope & "Open Envelope" ── */}
        {phase === "envelope" && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <span className="text-xs font-semibold text-amber-400/90 mb-1">
              پاکت عهد معنوی اختصاصی شما
            </span>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-1">
              با گشودن این پاکت، شهید همراه امروز و سهم پیشنهادی صلوات شما مشخص خواهد شد.
            </p>

            {/* Three.js 3D Envelope Canvas */}
            <div className="w-full h-64 sm:h-72 my-1 relative overflow-hidden rounded-2xl flex items-center justify-center cursor-pointer">
              <Envelope3DCanvas
                isOpen={isOpeningEnvelope}
                onOpen={handleOpenEnvelope}
                onLetterEmerged={() => {
                  setHasEmerged(true);
                  setPhase("revealed");
                }}
              />
            </div>

            <div className="w-full mt-2 flex flex-col items-center gap-1.5 relative z-30">
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
                <span>{isOpeningEnvelope ? "در حال گشودن پاکت..." : "گشودن پاکت عهد معنوی"}</span>
              </button>
              <span className="text-[10px] sm:text-[11px] text-amber-400/70 select-none">
                (می‌توانید روی خود پاکت نامه نیز ضربه بزنید)
              </span>
            </div>
          </div>
        )}

        {/* ── Phase 3: Letter Revealed (Martyr Name & Suggested Salawat) ── */}
        {phase === "revealed" && (
          <div className="w-full flex flex-col items-center animate-scale-up">
            <div className="w-full p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#1a141e]/90 to-[#0e0c14]/90 border border-amber-500/35 shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(245,158,11,0.15)] mb-4 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.08] rounded-full blur-2xl pointer-events-none" />

              <span className="text-xs font-semibold text-amber-400/90 block mb-2">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </span>

              <p className="text-xs sm:text-sm text-slate-300 mb-1.5">
                امروز، عهد معنوی شما متبرک است به نام والامقام:
              </p>

              <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-l from-amber-200 via-amber-300 to-rose-300 my-1.5">
                {mission.martyr.name}
              </h3>

              <span className="inline-block text-[11px] text-amber-400/80 bg-amber-500/10 px-3 py-0.5 rounded-full border border-amber-500/20 mb-3">
                {mission.martyr.title}
              </span>

              <div className="w-16 h-px mx-auto bg-gradient-to-l from-transparent via-amber-500/50 to-transparent my-2" />

              <div className="my-2.5 py-2.5 px-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] sm:text-xs text-slate-400 block mb-1">
                  سهم پیشنهادی صلوات شما برای امروز:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums flex items-center justify-center gap-1.5">
                  <span>{toPersianDigits(mission.suggestedCount)}</span>
                  <span className="text-sm font-semibold text-slate-300">صلوات</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed mt-2.5">
                این عدد صرفاً سهم پیشنهادی و عهد روزانه شماست. ارسال صلوات بیشتر آزاد و نامحدود است و تمامی صلوات‌های شما در شمارش سراسری و پرواز موشک ثبت می‌گردد.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirmMission}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-600 via-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative z-30"
            >
              <Check className="w-4 h-4" />
              <span>یا علی — پذیرش عهد و ورود به پرواز معنوی</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, HelpCircle } from "lucide-react";
import YadvareLogo from "@/components/ui/YadvareLogo";
import { soundEngine } from "@/lib/client/procedural-audio";
import { formatShortJalaliDate } from "@/lib/utils";

interface HeaderProps {
  tehranDate: string;
  onStartTour?: () => void;
}

export default function Header({ tehranDate, onStartTour }: HeaderProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMuted(soundEngine.getMuted());
    soundEngine.setupAutoPlayListeners();

    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Discreet admin hotkey (Ctrl + Shift + A or Alt + A)
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) ||
        (e.altKey && (e.key === "a" || e.key === "A"))
      ) {
        window.location.href = "/admin";
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleToggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundEngine.playSalawatTone();
    }
  };

  return (
    <header
      className={`w-full max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between z-20 relative pointer-events-auto transition-all duration-500 ${
        scrolled ? "backdrop-blur-md bg-[#090d16]/72 border-b border-white/[0.04]" : ""
      }`}
    >
      {/* Brand identity */}
      <div className="flex items-center gap-3">
        <YadvareLogo className="w-11 h-11 drop-shadow-[0_2px_12px_rgba(245,158,11,0.25)]" priority />
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
            پویش معنوی یادواره ۷۶ شهید شهیدیه 
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {mounted && tehranDate ? `امروز ${formatShortJalaliDate(tehranDate)}` : "یادواره شهدای والامقام"}
          </p>
        </div>
      </div>

      {/* Actions: Stacked vertically with Tour button on top and Sound button below */}
      <div className="flex flex-col items-center justify-center gap-1.5 shrink-0">
        {onStartTour && (
          <button
            type="button"
            onClick={onStartTour}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all shadow-sm emil-btn"
            title="مشاهده راهنمای پویش"
            aria-label="مشاهده راهنمای پویش"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleAudio}
          className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all shadow-sm emil-btn"
          title={isMuted ? "روشن کردن صدای محیطی" : "قطع صدای محیطی"}
          aria-label={isMuted ? "روشن کردن صدای محیطی" : "قطع صدای محیطی"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-slate-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}

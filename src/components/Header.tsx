"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import YadvareLogo from "@/components/ui/YadvareLogo";
import { soundEngine } from "@/lib/client/procedural-audio";
import { formatShortJalaliDate } from "@/lib/utils";

interface HeaderProps {
  tehranDate: string;
}

export default function Header({ tehranDate }: HeaderProps) {
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
            پویش معنوی یادواره ۷۶ شهید شهیدیه میبد
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {mounted && tehranDate ? `امروز ${formatShortJalaliDate(tehranDate)}` : "یادواره شهدای والامقام"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleAudio}
          className="flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800 transition-colors"
          title={isMuted ? "روشن کردن صدای محیطی" : "قطع صدای محیطی"}
          aria-label={isMuted ? "روشن کردن صدای محیطی" : "قطع صدای محیطی"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-slate-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
          )}
          <span className="hidden md:inline">{isMuted ? "صدا: خاموش" : "صدا: روشن"}</span>
        </button>


      </div>
    </header>
  );
}

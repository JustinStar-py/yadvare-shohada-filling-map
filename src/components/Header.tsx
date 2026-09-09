"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, HelpCircle, Gauge } from "lucide-react";
import YadvareLogo from "@/components/ui/YadvareLogo";
import { soundEngine } from "@/lib/client/procedural-audio";
import { setLiteModeOverride, useLiteMode } from "@/lib/client/quality";
import { formatShortJalaliDate } from "@/lib/utils";

interface HeaderProps {
  tehranDate: string;
  onStartTour?: () => void;
}

export default function Header({ tehranDate, onStartTour }: HeaderProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const liteMode = useLiteMode();

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
      className={`w-full max-w-5xl mx-auto px-4 py-2 flex items-center justify-between z-20 relative pointer-events-none transition-all duration-500 ${
        scrolled
          ? "liquid-glass sm:rounded-full mt-1 sm:mt-2 border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.65)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      {/* Brand identity */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <YadvareLogo className="w-11 h-11 drop-shadow-[0_2px_14px_rgba(245,158,11,0.35)]" priority />
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide drop-shadow-sm">
            پویش معنوی یادواره ۷۶ شهید شهیدیه 
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {mounted && tehranDate ? `امروز ${formatShortJalaliDate(tehranDate)}` : "یادواره شهدای والامقام"}
          </p>
        </div>
      </div>

      {/* Actions: Stacked vertically with Tour button on top and Sound button below */}
      <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 pointer-events-auto">
        {onStartTour && (
          <button
            type="button"
            onClick={onStartTour}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full liquid-glass-pill hover:border-amber-400/60 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer ios-press shadow-sm group"
            title="مشاهده راهنمای پویش"
            aria-label="مشاهده راهنمای پویش"
          >
            <HelpCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform duration-200" />
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleAudio}
          className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full liquid-glass-pill hover:border-amber-400/50 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ios-press shadow-sm group"
          title={isMuted ? "روشن کردن صدای محیطی" : "قطع صدای محیطی"}
          aria-label={isMuted ? "روشن کردن صدای محیطی" : "قطع صدای محیطی"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400 animate-pulse group-hover:scale-110 transition-transform duration-200" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setLiteModeOverride(!liteMode)}
          className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full liquid-glass-pill hover:border-amber-400/50 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ios-press shadow-sm group"
          title={liteMode ? "خروج از حالت سبک (نمایش سه‌بعدی)" : "حالت سبک (صرفه‌جویی در مصرف باتری و داده)"}
          aria-label={liteMode ? "خروج از حالت سبک" : "فعال‌سازی حالت سبک"}
          aria-pressed={liteMode}
        >
          <Gauge className={`w-4 h-4 transition-colors ${liteMode ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
        </button>
      </div>
    </header>
  );
}

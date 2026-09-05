"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Shield, Compass } from "lucide-react";
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

    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      className={`w-full max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between z-20 relative transition-all duration-500 ${
        scrolled ? "backdrop-blur-md bg-[#090d16]/72 border-b border-white/[0.04]" : ""
      }`}
    >
      {/* Brand identity */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-[1.5px] shadow-[0_0_18px_rgba(245,158,11,0.35)]">
          <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
            پویش معنوی یادواره شهدا
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

        <Link
          href="/admin"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-400 hover:text-amber-400 hover:border-slate-600 transition-colors"
          title="پنل مدیریت پویش"
          aria-label="پنل مدیریت پویش"
        >
          <Compass className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

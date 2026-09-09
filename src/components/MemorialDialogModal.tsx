"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Radio,
  X,
  Share2,
  Navigation,
  CalendarPlus,
  Check,
  Sparkles,
  Copy,
} from "lucide-react";
import YadvareLogo from "@/components/ui/YadvareLogo";
import { formatJalaliDate, toPersianDigits } from "@/lib/utils";
import { useModalTransition } from "@/lib/client/use-modal-transition";
import { DEFAULT_SHARE_MESSAGE } from "@/types/campaign";

interface MemorialDialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorialTitle: string;
  memorialDate: string; // e.g. "2026-09-17"
  memorialTime?: string; // e.g. "19:00"
  memorialLocation: string;
  daysRemaining: number;
  dayNumber?: number;
  campaignPhase?: string;
  customShareMessage?: string;
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function computeTimeParts(targetIso: string): TimeParts {
  const targetTime = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = targetTime - now;

  if (isNaN(targetTime) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}

export default function MemorialDialogModal({
  isOpen,
  onClose,
  memorialTitle,
  memorialDate,
  memorialTime = "19:00",
  memorialLocation,
  daysRemaining,
  dayNumber,
  campaignPhase,
  customShareMessage,
}: MemorialDialogModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { mounted: isModalMounted, visible: isModalVisible } = useModalTransition(isOpen, 180);

  const targetIso = useMemo(() => {
    return `${memorialDate || "2026-09-17"}T${memorialTime || "19:00"}:00+03:30`;
  }, [memorialDate, memorialTime]);

  const [timeParts, setTimeParts] = useState<TimeParts>(() => computeTimeParts(targetIso));

  useEffect(() => {
    setMounted(true);
    setTimeParts(computeTimeParts(targetIso));

    const interval = setInterval(() => {
      setTimeParts(computeTimeParts(targetIso));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetIso]);

  // Handle escape key and scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const formattedDate = useMemo(() => {
    return memorialDate ? formatJalaliDate(memorialDate) : "به زودی اعلام می‌شود";
  }, [memorialDate]);

  // Copy invitation details
  const handleCopyInvite = useCallback(async () => {
    const text =
      customShareMessage && customShareMessage.trim().length > 0
        ? customShareMessage
        : DEFAULT_SHARE_MESSAGE;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  }, [customShareMessage]);

  // Google Calendar quick link
  const googleCalendarUrl = useMemo(() => {
    try {
      const start = new Date(targetIso);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hours duration
      const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
      const datesParam = `${fmt(start)}/${fmt(end)}`;
      const title = memorialTitle || "یادواره ۷۶ شهید والامقام شهیدیه میبد";
      const details = "مراسم بزرگداشت سرداران و ۷۶ شهید والامقام شهیدیه میبد";
      const loc = memorialLocation || "یزد، میبد، شهیدیه، مسجد امام (عج)";

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}&dates=${datesParam}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
        loc
      )}`;
    } catch {
      return "#";
    }
  }, [targetIso, memorialTitle, memorialLocation]);

  // Map directions url (Google Maps / Neshan)
  const mapUrl = useMemo(() => {
    const query = encodeURIComponent(`${memorialLocation || "یزد میبد شهیدیه مسجد امام"}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [memorialLocation]);

  if (!isModalMounted || typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memorial-dialog-title"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#050811]/90 backdrop-blur-2xl overflow-y-auto emil-modal-backdrop ${
        isModalVisible ? "opacity-100" : "emil-modal-backdrop-hidden"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dynamic atmospheric radial glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/[0.08] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/[0.06] rounded-full blur-[90px] pointer-events-none" />

      <div
        className={`relative w-full max-w-lg rounded-[32px] liquid-glass border border-amber-500/35 p-5 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.2)] text-center my-auto overflow-hidden emil-modal-content ${
          isModalVisible ? "opacity-100 scale-100" : "emil-modal-content-hidden"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner Islamic floral accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-amber-500/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-radial from-teal-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Prominent, touch-friendly close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-5 sm:left-5 w-9 h-9 rounded-full liquid-glass-pill text-slate-300 hover:text-white flex items-center justify-center cursor-pointer z-30 shadow-lg ios-press"
          aria-label="بستن پنجره"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="flex flex-col items-center pt-1">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/15 border border-amber-500/30 animate-pulse" />
            <YadvareLogo className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_16px_rgba(245,158,11,0.35)] z-10" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full liquid-glass-pill-gold text-amber-300 text-[11px] font-bold mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>اطلاعیه رسمی برگزاری مراسم یادواره شهدا</span>
          </div>

          <h3
            id="memorial-dialog-title"
            className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight leading-snug max-w-md mx-auto"
          >
            {memorialTitle || "یادواره ۷۶ شهید والامقام شهیدیه میبد"}
          </h3>

          <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
            گرامی‌داشت یاد و خاطره سرداران سرافراز و ۷۶ لاله گلگون‌کفن شهیدیه میبد
          </p>
        </div>

        <div className="w-24 h-px mx-auto my-5 bg-gradient-to-l from-transparent via-amber-500/50 to-transparent" />

        {/* ── Live Countdown Display ── */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400/90 mb-3">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>شمارش معکوس لحظه‌به‌لحظه تا آغاز مراسم</span>
          </div>

          {timeParts.isPast || campaignPhase === "archived" ? (
            <div className="p-4 rounded-2xl liquid-glass text-slate-300 text-xs sm:text-sm">
              مراسم یادواره شهدای والامقام برگزار گردیده است. یادشان جاودان و راهشان پر رهرو باد.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto" dir="rtl">
              {/* روز */}
              <div className="flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-2 rounded-2xl liquid-glass-gold shadow-[0_4px_16px_rgba(0,0,0,0.5)] emil-stagger-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
                  {mounted ? toPersianDigits(timeParts.days) : toPersianDigits(daysRemaining)}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-200/80 font-bold mt-0.5">روز</span>
              </div>

              {/* ساعت */}
              <div className="flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-2 rounded-2xl liquid-glass shadow-[0_4px_16px_rgba(0,0,0,0.5)] emil-stagger-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-100 tabular-nums">
                  {mounted ? toPersianDigits(String(timeParts.hours).padStart(2, "0")) : "۰۰"}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">ساعت</span>
              </div>

              {/* دقیقه */}
              <div className="flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-2 rounded-2xl liquid-glass shadow-[0_4px_16px_rgba(0,0,0,0.5)] emil-stagger-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-100 tabular-nums">
                  {mounted ? toPersianDigits(String(timeParts.minutes).padStart(2, "0")) : "۰۰"}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">دقیقه</span>
              </div>

              {/* ثانیه */}
              <div className="flex flex-col items-center justify-center py-2.5 sm:py-3.5 px-2 rounded-2xl liquid-glass border-rose-500/40 shadow-[0_4px_16px_rgba(244,63,94,0.15)] emil-stagger-4">
                <span className="text-2xl sm:text-3xl font-black text-rose-400 tabular-nums animate-pulse">
                  {mounted ? toPersianDigits(String(timeParts.seconds).padStart(2, "0")) : "۰۰"}
                </span>
                <span className="text-[10px] sm:text-xs text-rose-300/80 font-medium mt-0.5">ثانیه</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Event Details Cards ── */}
        <div className="flex flex-col gap-3 text-right">
          {/* Time & Date */}
          <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 hover:border-amber-500/30 transition-[border-color,background-color] duration-180">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-400 block mb-0.5">
                زمان برگزاری یادواره
              </span>
              <p className="text-sm font-bold text-amber-200 leading-snug">
                {formattedDate}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  ساعت {toPersianDigits(memorialTime)} (۷ شب) — همزمان با نماز مغرب و عشاء
                </span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 hover:border-amber-500/30 transition-[border-color,background-color] duration-180">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-400 block mb-0.5">
                مکان برگزاری مراسم
              </span>
              <p className="text-sm font-bold text-slate-100 leading-snug">
                {memorialLocation || "میبد، شهیدیه، مسجد امام (ره)"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Interactive Utility Actions ── */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2.5">
          {/* Add to Google Calendar */}
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-2xl liquid-glass text-xs font-bold text-slate-200 hover:text-white cursor-pointer shadow-sm ios-press"
            title="افزودن این مراسم به تقویم گوگل"
          >
            <CalendarPlus className="w-4 h-4 text-amber-400" />
            <span>افزودن به تقویم</span>
          </a>

          {/* Map navigation */}
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-2xl liquid-glass text-xs font-bold text-slate-200 hover:text-white cursor-pointer shadow-sm ios-press"
            title="مسیریابی محل مراسم روی نقشه"
          >
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>مسیریابی روی نقشه</span>
          </a>

          {/* Copy invitation text */}
          <button
            type="button"
            onClick={handleCopyInvite}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:brightness-110 shadow-[0_6px_24px_rgba(245,158,11,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.6)] cursor-pointer ios-press"
            title="کپی متن دعوت‌نامه برای ارسال به دوستان و بستگان"
          >
            <span className="inline-flex items-center gap-1.5 transition-opacity duration-150">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>متن دعوت‌نامه کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>کپی متن دعوت‌نامه برای ارسال در ایتا و پیام‌رسان‌ها</span>
                </>
              )}
            </span>
          </button>

          {/* Dismiss button for quick thumb access on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-2xl liquid-glass-pill text-slate-400 hover:text-slate-200 font-bold text-xs transition-colors cursor-pointer ios-press"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


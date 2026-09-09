"use client";

import React, { useEffect, useState, useCallback } from "react";
import { formatPersianNumber, toPersianDigits, formatShortJalaliDate } from "@/lib/utils";
import { Share2, X, Check, Copy, Send } from "lucide-react";
import YadvareLogo from "@/components/ui/YadvareLogo";
import { useModalTransition } from "@/lib/client/use-modal-transition";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  salawatCount: number;
  daysRemaining: number;
  tehranDate: string;
}

export default function ShareCardModal({
  isOpen,
  onClose,
  salawatCount,
  daysRemaining,
  tehranDate,
}: ShareCardModalProps) {
  const [copied, setCopied] = useState(false);
  const { mounted, visible } = useModalTransition(isOpen, 180);

  const shareText = `«پویش معنوی یادواره ۷۶ شهید شهیدیه میبد»
🕊️ هر صلوات، یک قدم تا پرواز

با فرستادن صلوات در این پویش معنوی، در سوخت‌گیری پرواز نمادین موشک امروز و درخشش ستاره‌ای ماندگار در آسمان شهدا سهیم شوید.

✨ صلوات‌های ثبت‌شده تا این لحظه: ${formatPersianNumber(salawatCount)} صلوات
⏳ زمان باقی‌مانده تا یادواره بزرگ شهدا: ${toPersianDigits(daysRemaining)} روز

📌 دعوتنامه حضور در مراسم یادواره شهدای والامقام:
📅 زمان: پنجشنبه ۲۶ شهریور ۱۴۰۵ - ساعت ۱۹:۰۰ (همزمان با نماز مغرب و عشاء)
📍 مکان: یزد، میبد، شهیدیه، مسجد امام (عج)
📡 همراه با پخش زنده مراسم

🔗 ثبت صلوات و همراهی در پویش:
👉 https://yar67.ir

«اللّهُمَّ صَلِّ عَلی مُحَمَّدٍ وَ آلِ مُحَمَّدٍ وَ عَجِّل فَرَجَهُم»`;

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "پویش معنوی یادواره ۷۶ شهید شهیدیه میبد",
          text: shareText,
          url: "https://yar67.ir",
        });
      } else {
        handleCopy();
      }
    } catch {}
  }, [shareText, handleCopy]);

  // Escape to close + scroll lock
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

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/80 backdrop-blur-xl p-4 emil-modal-backdrop ${
        visible ? "opacity-100" : "emil-modal-backdrop-hidden"
      }`}
      onClick={onClose}
      role="dialog"
      aria-label="اشتراک‌گذاری سهم امروز پویش"
    >
      <div
        className={`liquid-glass rounded-[32px] p-6 sm:p-7 max-w-sm w-full relative flex flex-col items-center gap-5 border border-white/[0.14] shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.15)] emil-modal-content ${
          visible ? "opacity-100 scale-100" : "emil-modal-content-hidden"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full liquid-glass-pill text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ios-press"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 pt-1">
          <span className="liquid-glass-pill-gold px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-amber-300" />
            <span>اشتراک‌گذاری سهم امروز پویش</span>
          </span>
        </div>

        {/* Visual preview card — Apple Squircle with optical refraction */}
        <div className="w-full rounded-[24px] p-7 text-center relative overflow-hidden border border-amber-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_12px_36px_rgba(0,0,0,0.5)] bg-gradient-to-b from-[#0a1120]/90 via-[#0c1526]/90 to-[#090d16]/90 backdrop-blur-md">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          {/* Mini constellation dots */}
          <div className="absolute top-5 right-6 w-1.5 h-1.5 rounded-full bg-amber-300/70 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <div className="absolute top-10 left-8 w-1 h-1 rounded-full bg-slate-300/60" />
          <div className="absolute top-16 right-16 w-1 h-1 rounded-full bg-slate-300/40" />

          <div className="flex justify-center mb-2.5">
            <YadvareLogo className="w-12 h-12 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]" />
          </div>

          <span className="relative text-xs text-amber-300/90 font-bold tracking-wide">
            پویش معنوی یادواره ۷۶ شهید شهیدیه میبد
          </span>

          <div className="relative my-5">
            <span className="text-[44px] leading-none font-extrabold gold-text block tabular-nums">
              {formatPersianNumber(salawatCount)}
            </span>
            <span className="text-xs text-slate-300/90 mt-2.5 block font-medium">
              صلوات فرستاده‌شده تا این لحظه
            </span>
          </div>

          <div className="relative pt-3.5 border-t border-white/[0.08] text-[11px] text-slate-400 flex items-center justify-between font-medium">
            <span>{formatShortJalaliDate(tehranDate)}</span>
            <span className="text-amber-300 font-black tracking-wider px-2.5 py-0.5 rounded-full liquid-glass text-[10px] dir-ltr">
              yar67.ir
            </span>
            <span className="text-amber-300 font-bold">{toPersianDigits(daysRemaining)} روز تا یادواره</span>
          </div>
        </div>

        {/* Actions — iOS Tactile Spring Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={handleNativeShare}
            className="flex-1 min-h-[48px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-xs font-black text-slate-950 flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(245,158,11,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.6)] cursor-pointer ios-press"
          >
            <Send className="w-4 h-4" />
            <span>اشتراک‌گذاری</span>
          </button>
          <button
            onClick={handleCopy}
            className="min-h-[48px] py-2.5 px-4.5 rounded-2xl liquid-glass text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer ios-press"
            aria-label="کپی متن پیام"
          >
            <span className="inline-flex items-center gap-1.5 transition-opacity duration-150">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-black">کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>کپی</span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

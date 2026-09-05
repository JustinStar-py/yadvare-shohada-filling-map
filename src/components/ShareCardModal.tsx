"use client";

import React, { useEffect, useState, useCallback } from "react";
import { formatPersianNumber, toPersianDigits, formatShortJalaliDate } from "@/lib/utils";
import { Share2, X, Check, Copy, Send } from "lucide-react";

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

  const shareText = `«هر صلوات، یک قدم تا پرواز»\nامروز مردم در پویش یادواره شهدا با هم ${formatPersianNumber(
    salawatCount
  )} صلوات فرستاده‌اند.\n${toPersianDigits(daysRemaining)} روز مانده تا یادواره شهدای والامقام.`;

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
        await navigator.share({ title: "پویش معنوی یادواره شهدا", text: shareText });
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/85 backdrop-blur-md p-4 animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-label="اشتراک‌گذاری سهم امروز پویش"
    >
      <div
        className="glass-panel rounded-3xl p-6 sm:p-7 max-w-sm w-full relative flex flex-col items-center gap-5 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-500 hover:text-slate-200 transition-colors p-1.5"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 pt-1">
          <Share2 className="w-4 h-4 text-amber-400" />
          <span>اشتراک‌گذاری سهم امروز پویش</span>
        </h3>

        {/* Visual preview card */}
        <div className="w-full rounded-2xl p-7 text-center relative overflow-hidden border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] bg-gradient-to-b from-[#0a1120] via-[#0c1526] to-[#090d16]">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          {/* Mini constellation dots */}
          <div className="absolute top-5 right-6 w-1.5 h-1.5 rounded-full bg-amber-300/70 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <div className="absolute top-10 left-8 w-1 h-1 rounded-full bg-slate-300/60" />
          <div className="absolute top-16 right-16 w-1 h-1 rounded-full bg-slate-300/40" />

          <span className="relative text-[11px] text-amber-400/90 font-semibold tracking-wide">
            پویش معنوی یادواره شهدا
          </span>

          <div className="relative my-5">
            <span className="text-[44px] leading-none font-extrabold gold-text block tabular-nums">
              {formatPersianNumber(salawatCount)}
            </span>
            <span className="text-xs text-slate-300/80 mt-2.5 block">
              صلوات فرستاده‌شده تا این لحظه
            </span>
          </div>

          <div className="relative pt-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{formatShortJalaliDate(tehranDate)}</span>
            <span className="text-amber-400/80">{toPersianDigits(daysRemaining)} روز تا یادواره</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={handleNativeShare}
            className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-xs font-bold text-slate-950 hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-[0_6px_18px_rgba(245,158,11,0.3)]"
          >
            <Send className="w-4 h-4" />
            <span>اشتراک‌گذاری</span>
          </button>
          <button
            onClick={handleCopy}
            className="min-h-[46px] py-2.5 px-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
            aria-label="کپی متن پیام"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">کپی شد!</span>
              </>
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

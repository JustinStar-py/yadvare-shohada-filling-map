"use client";

import React from "react";
import { formatJalaliDate } from "@/lib/utils";
import { Calendar, MapPin, Radio, Clock } from "lucide-react";
import MemorialCountdown from "./MemorialCountdown";

interface MemorialInfoProps {
  memorialTitle: string;
  memorialDate: string;
  memorialTime?: string;
  memorialLocation: string;
}

export default function MemorialInfo({
  memorialTitle,
  memorialDate,
  memorialTime = "19:00",
  memorialLocation,
}: MemorialInfoProps) {
  const targetIso = `${memorialDate || "2026-09-17"}T${memorialTime || "19:00"}:00+03:30`;

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-12 relative z-10">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-96 h-64 bg-amber-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-9">
          <span className="text-xs font-semibold text-amber-400/90 tracking-wide">
            اطلاعیه برگزاری مراسم
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2">
            {memorialTitle}
          </h2>
          <div className="w-16 h-px mx-auto mt-5 bg-gradient-to-l from-transparent via-amber-500/60 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-amber-500/25 transition-colors duration-500">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-amber-500/15 to-amber-500/[0.04] border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-1.5">زمان برگزاری مراسم</h4>
              <p className="text-sm font-bold text-amber-200 leading-relaxed">
                {memorialDate ? formatJalaliDate(memorialDate) : "به زودی اعلام می‌شود"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>ساعت ۱۹:۰۰ (۷ شب) — همزمان با نماز مغرب و عشاء</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-amber-500/25 transition-colors duration-500">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-amber-500/15 to-amber-500/[0.04] border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200 mb-1.5">محل برگزاری مراسم</h4>
              <p className="text-xs text-slate-300/90 leading-relaxed">
                {memorialLocation || "مصلای بزرگ امام خمینی (ره)"}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 mt-2.5">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>همراه با پخش زنده اینترنتی</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live countdown timer until the memorial event */}
        <div className="mt-8 pt-7 border-t border-slate-800/80">
          <MemorialCountdown
            targetDate={targetIso}
            variant="timer"
          />
        </div>
      </div>
    </section>
  );
}

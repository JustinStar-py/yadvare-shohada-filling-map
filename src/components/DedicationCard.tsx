"use client";

import React, { useState } from "react";
import { MartyrProfile } from "@/types/campaign";
import { Quote, MapPin, Calendar, Award, Sparkles, ChevronRight, ChevronLeft, Users } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";

interface DedicationCardProps {
  martyr?: MartyrProfile | null;
  martyrs?: MartyrProfile[];
}

export default function DedicationCard({ martyr, martyrs }: DedicationCardProps) {
  // Normalize martyrs list: prefer martyrs array, fallback to single martyr
  const martyrsList = React.useMemo(() => {
    if (martyrs && martyrs.length > 0) return martyrs;
    if (martyr) return [martyr];
    return [];
  }, [martyr, martyrs]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Clamp index if list changes
  const activeIndex = Math.min(selectedIndex, Math.max(0, martyrsList.length - 1));
  const activeMartyr = martyrsList[activeIndex] || null;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : martyrsList.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < martyrsList.length - 1 ? prev + 1 : 0));
  };

  if (!activeMartyr || martyrsList.length === 0) {
    return (
      <section className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 text-sm leading-relaxed">
          <Award className="w-8 h-8 text-amber-400/50 mx-auto mb-3" />
          <p>
            هنوز هیچ پروازی به یاد شهدای والامقام امروز ثبت نشده است. شما می‌توانید با
            ثبت صلوات، پرواز معنوی امروز را به یاد شهدای والامقام ثبت کنید.
          </p>
        </div>
      </section>
    );
  }

  const isMulti = martyrsList.length > 1;

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8 relative z-10" style={{ direction: "rtl" }}>
      <div className="relative overflow-hidden glass-panel rounded-3xl p-5 sm:p-8 md:p-9 border border-amber-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        {/* Corner celestial glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/[0.08] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 bg-blue-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        {/* Section Header: Dedication Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-amber-500/15">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wide">
              <span className="w-6 h-px bg-amber-500/50" />
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">پویش معنوی یادواره ۷۶ شهید دیار شهیدیه میبد</span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
              <span>پرواز معنوی امروز تقدیم به</span>
              <span className="text-amber-300 font-extrabold underline decoration-amber-500/40 decoration-2 underline-offset-4">
                {isMulti ? (toPersianDigits(martyrsList.length) + " شهید والامقام") : activeMartyr.name}
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
              صلوات‌های اهدایی امروز شما نثار ارواح مطهر و والای این شهدای سرافراز خواهد شد.
            </p>
          </div>

          {/* Quick counter badge & navigation */}
          {isMulti && (
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <span className="text-[11px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full">
                شهید {toPersianDigits(activeIndex + 1)} از {toPersianDigits(martyrsList.length)} امروز
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 transition-colors cursor-pointer"
                  title="شهید بعدی"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 transition-colors cursor-pointer"
                  title="شهید قبلی"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Martyrs Ribbon / Selector (when multiple martyrs) */}
        {isMulti && (
          <div className="mb-7">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2.5">
              <Users className="w-3.5 h-3.5 text-amber-400/80" />
              <span>شهدای پرواز امروز (برای مشاهده زندگی‌نامه، روی هر شهید کلیک کنید):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-slate-900/40 select-none">
              {martyrsList.map((m, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={m.id || idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl shrink-0 transition-all duration-300 cursor-pointer text-right ${
                      isSelected
                        ? "bg-amber-500/20 border border-amber-400/70 shadow-[0_0_16px_rgba(245,158,11,0.25)] text-amber-200 scale-[1.02]"
                        : "bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/40 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-800 border border-amber-400/40 shrink-0">
                      {m.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.photoUrl}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-400 text-xs">
                          {toPersianDigits(idx + 1)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] sm:text-xs font-bold leading-snug whitespace-nowrap">
                        {m.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Spotlight Profile of Selected Martyr */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start bg-slate-950/40 border border-amber-500/10 rounded-2xl p-4 sm:p-6 transition-all duration-500">
          {/* Portrait */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/35 shadow-[0_0_30px_rgba(245,158,11,0.14)] shrink-0 self-center sm:self-start relative group">
            {activeMartyr.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={activeMartyr.photoUrl}
                src={activeMartyr.photoUrl}
                alt={activeMartyr.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-amber-400/50 bg-gradient-to-tr from-slate-900 to-slate-800">
                <Award className="w-12 h-12" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#090d16]/90 to-transparent pointer-events-none" />
          </div>

          {/* Information */}
          <div className="flex-1 flex flex-col gap-3 text-right w-full">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  شهید والامقام دیار شهیدیه
                </span>
                {isMulti && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    #{toPersianDigits(activeIndex + 1)}
                  </span>
                )}
              </div>
              <h3 className="text-2xl sm:text-[28px] font-black text-slate-100 mb-1">
                {activeMartyr.name}
              </h3>
              <p className="text-xs sm:text-sm text-amber-400/90 font-medium tracking-wide">
                {activeMartyr.title}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-slate-400 pt-0.5">
              {activeMartyr.martyrdomDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                  <span>شهادت: {activeMartyr.martyrdomDate}</span>
                </div>
              )}
              {activeMartyr.martyrdomLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                  <span>{activeMartyr.martyrdomLocation}</span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300/90 leading-[1.9] text-justify mt-1">
              {activeMartyr.biography}
            </p>

            {activeMartyr.quote && (
              <div className="mt-2 p-3.5 rounded-xl bg-amber-500/[0.07] border-r-2 border-amber-400/80 text-xs sm:text-sm text-amber-100/90 leading-relaxed flex items-start gap-2.5">
                <Quote className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
                <span className="italic">«{activeMartyr.quote}»</span>
              </div>
            )}
          </div>
        </div>

        {/* Collective Dedication Footer: List of all martyrs honored in today's flight */}
        {isMulti && (
          <div className="mt-6 pt-4 border-t border-white/[0.05] flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="font-bold text-amber-300/90 shrink-0">اسامی شهدای امروز:</span>
            {martyrsList.map((m, idx) => (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`transition-colors cursor-pointer px-1.5 py-0.5 rounded ${
                  idx === activeIndex
                    ? "text-amber-300 font-bold bg-amber-500/15"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m.name}
                {idx < martyrsList.length - 1 && <span className="text-slate-600 mr-1.5">•</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

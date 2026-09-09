"use client";

import React, { useState } from "react";
import { MartyrProfile } from "@/types/campaign";
import { Sparkles, Calendar, MapPin, Quote, X, Award } from "lucide-react";
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

  const [selectedMartyr, setSelectedMartyr] = useState<MartyrProfile | null>(null);

  if (martyrsList.length === 0) {
    return null;
  }

  const count = martyrsList.length;

  return (
    <section className="w-full max-w-2xl sm:max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 relative z-10" style={{ direction: "rtl" }}>
      <div
        data-tour="dedication"
        className="relative overflow-hidden glass-panel rounded-[32px] p-4 sm:p-6 md:p-8 border border-amber-500/25 shadow-[0_16px_50px_rgba(0,0,0,0.65)]"
      >
        {/* Ambient celestial glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/[0.1] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 bg-blue-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        {/* Header: Clean & direct */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full liquid-glass-pill-gold text-amber-300 text-[11px] sm:text-xs font-bold mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>پویش معنوی یادواره شهدای شهیدیه میبد</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-100 flex items-center justify-center gap-1.5 drop-shadow-md">
            <span>پرواز امروز به یاد</span>
            <span className="text-amber-300 underline decoration-amber-500/50 decoration-2 underline-offset-4">
              {toPersianDigits(count)} شهید والامقام
            </span>
            <span>:</span>
          </h2>
        </div>

        {/* 3x3 + 1 centered grid (3 تا ردیف سه تایی با یکی ردیف یکی) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3.5 md:gap-4.5 w-full">
          {martyrsList.map((m, idx) => {
            // If total is 10, the 10th item (idx === 9) sits in the center column
            const isTenthInTen = count === 10 && idx === 9;
            return (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => setSelectedMartyr(m)}
                className={`flex flex-col items-center justify-between h-full px-1.5 py-2.5 sm:px-2.5 sm:py-3.5 rounded-2xl liquid-glass hover:border-amber-400/60 shadow-sm hover:shadow-[0_0_22px_rgba(245,158,11,0.3)] cursor-pointer ios-press group select-none ${
                  isTenthInTen ? "col-start-2" : ""
                }`}
                title="مشاهده مشخصات و زندگی‌نامه"
              >
                {/* Photo */}
                <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/40 shadow-[0_4px_14px_rgba(0,0,0,0.65)] group-hover:scale-105 transition-transform duration-300 shrink-0 relative">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photoUrl}
                      alt={m.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400/70 bg-gradient-to-tr from-slate-900 to-slate-800">
                      <Award className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
                </div>

                {/* Name: 100% visible, no ellipsis, comfortable font size & spacing */}
                <div className="w-full mt-2 min-h-[2.4rem] sm:min-h-[2.75rem] flex items-center justify-center">
                  <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-slate-100 group-hover:text-amber-300 text-center leading-[1.35] break-words drop-shadow-xs transition-colors">
                    {m.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lightweight modal when a martyr is clicked to read their bio */}
      {selectedMartyr && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in"
          onClick={() => setSelectedMartyr(null)}
        >
          <div
            className="relative w-full max-w-lg liquid-glass rounded-[32px] p-6 sm:p-8 border border-amber-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-right"
            onClick={(e) => e.stopPropagation()}
            style={{ direction: "rtl" }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedMartyr(null)}
              className="absolute top-4 left-4 w-8.5 h-8.5 rounded-full liquid-glass-pill text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ios-press"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/40 shadow-lg shrink-0 self-center sm:self-start">
                {selectedMartyr.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedMartyr.photoUrl}
                    alt={selectedMartyr.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400">
                    <Award className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2 w-full">
                <h3 className="text-xl sm:text-2xl font-black text-slate-100">
                  {selectedMartyr.name}
                </h3>
                <p className="text-xs text-amber-400/90 font-medium">
                  {selectedMartyr.title || "از شهدای والامقام دیار شهیدیه"}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 pt-1">
                  {selectedMartyr.martyrdomDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500/70" />
                      <span>شهادت: {selectedMartyr.martyrdomDate}</span>
                    </div>
                  )}
                  {selectedMartyr.martyrdomLocation && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500/70" />
                      <span>{selectedMartyr.martyrdomLocation}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify mt-2">
                  {selectedMartyr.biography}
                </p>

                {selectedMartyr.quote && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border-r-2 border-amber-400 text-xs text-amber-100 flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="italic">«{selectedMartyr.quote}»</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

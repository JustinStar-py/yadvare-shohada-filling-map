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
    <section data-tour="dedication" className="w-full max-w-2xl mx-auto px-4 py-8 relative z-10" style={{ direction: "rtl" }}>
      <div className="relative overflow-hidden glass-panel rounded-3xl p-5 sm:p-7 md:p-8 border border-amber-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        {/* Ambient celestial glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/[0.08] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        {/* Header: Clean & direct */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] sm:text-xs font-bold mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>پویش معنوی یادواره شهدای شهیدیه میبد</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-100 flex items-center justify-center gap-1.5 drop-shadow-md">
            <span>پرواز امروز به یاد</span>
            <span className="text-amber-300 underline decoration-amber-500/40 decoration-2 underline-offset-4">
              {toPersianDigits(count)} شهید والامقام
            </span>
            <span>:</span>
          </h2>
        </div>

        {/* 3x3 + 1 centered grid (3 تا ردیف سه تایی با یکی ردیف یکی) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4.5 w-full">
          {martyrsList.map((m, idx) => {
            // If total is 10, the 10th item (idx === 9) sits in the center column
            const isTenthInTen = count === 10 && idx === 9;
            return (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => setSelectedMartyr(m)}
                className={`flex flex-col items-center p-2 sm:p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-850 border border-amber-500/20 hover:border-amber-400/50 shadow-sm hover:shadow-[0_0_18px_rgba(245,158,11,0.25)] transition-all duration-300 cursor-pointer group select-none ${
                  isTenthInTen ? "col-start-2" : ""
                }`}
                title="مشاهده مشخصات و زندگی‌نامه"
              >
                {/* Photo */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-2xl overflow-hidden bg-slate-800 border border-amber-500/35 shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-300 shrink-0 relative">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photoUrl}
                      alt={m.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400/60 bg-gradient-to-tr from-slate-900 to-slate-800">
                      <Award className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
                </div>

                {/* Name */}
                <span className="mt-2 text-[11.5px] sm:text-xs md:text-sm font-bold text-slate-200 group-hover:text-amber-300 text-center leading-snug line-clamp-2 drop-shadow-xs transition-colors">
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lightweight modal when a martyr is clicked to read their bio */}
      {selectedMartyr && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedMartyr(null)}
        >
          <div
            className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-7 border border-amber-500/30 shadow-[0_16px_50px_rgba(0,0,0,0.8)] text-right"
            onClick={(e) => e.stopPropagation()}
            style={{ direction: "rtl" }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedMartyr(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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

"use client";

import React from "react";
import { MartyrProfile } from "@/types/campaign";
import { Quote, MapPin, Calendar, Award } from "lucide-react";

interface DedicationCardProps {
  martyr: MartyrProfile | null;
}

export default function DedicationCard({ martyr }: DedicationCardProps) {
  if (!martyr) {
    return (
      <section className="w-full max-w-3xl mx-auto px-4 py-8">
        <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 text-sm leading-relaxed">
          <Award className="w-8 h-8 text-amber-400/50 mx-auto mb-3" />
          پرواز امروز به یاد تمامی شهدای والامقام میهن اسلامی تقدیم می‌شود.
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-8 relative z-10">
      <div className="relative overflow-hidden glass-panel rounded-3xl p-6 sm:p-9">
        {/* Corner celestial glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        {/* Section header */}
        <div className="flex items-center gap-2.5 text-xs font-semibold text-amber-400 mb-7 tracking-wide">
          <span className="w-7 h-px bg-amber-500/50" />
          <Award className="w-4 h-4" />
          <span>پرواز معنوی امروز به یاد شهید والامقام</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-7 items-start">
          {/* Portrait */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/35 shadow-[0_0_30px_rgba(245,158,11,0.14)] shrink-0 self-center sm:self-start relative group">
            {martyr.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={martyr.photoUrl}
                alt={martyr.name}
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
          <div className="flex-1 flex flex-col gap-3.5 text-right">
            <div>
              <h3 className="text-2xl sm:text-[28px] font-bold text-slate-100 mb-1.5">
                {martyr.name}
              </h3>
              <p className="text-xs sm:text-sm text-amber-400/90 font-medium tracking-wide">
                {martyr.title}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-slate-400 pt-1">
              {martyr.martyrdomDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500/70" />
                  <span>شهادت: {martyr.martyrdomDate}</span>
                </div>
              )}
              {martyr.martyrdomLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500/70" />
                  <span>{martyr.martyrdomLocation}</span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300/90 leading-[1.9] text-justify mt-1">
              {martyr.biography}
            </p>

            {martyr.quote && (
              <div className="mt-2 p-4 rounded-xl bg-amber-500/[0.07] border-r-2 border-amber-400/80 text-xs sm:text-sm text-amber-100/90 leading-relaxed flex items-start gap-2.5">
                <Quote className="w-4 h-4 text-amber-400/80 shrink-0 mt-1" />
                <span className="italic">«{martyr.quote}»</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

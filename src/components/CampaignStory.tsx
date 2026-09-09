"use client";

import React from "react";
import { Heart, Rocket, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: Heart,
    title: "۱. صلوات جمعی",
    text: "مردم در سراسر کشور با فرستادن صلوات، سهم معنوی خود را در پویش روزانه ثبت می‌کنند.",
  },
  {
    icon: Rocket,
    title: "۲. تجمیع نور و تکمیل پرواز",
    text: "با هر صلوات، مخزن نورانی راکت روز پر می‌شود تا به ظرفیت کامل پرواز معنوی برسد.",
  },
  {
    icon: Sparkles,
    title: "۳. ستاره‌ای ماندگار در آسمان",
    text: "پس از پرواز، هر روز به صورت یک ستاره نورانی در صورت‌فلکی دائمی یادواره شهدا می‌درخشد.",
  },
];

export default function CampaignStory() {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-14 relative z-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-black text-amber-300 mb-3 tracking-wide liquid-glass-pill-gold px-4 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>داستان پویش</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mb-3 tracking-tight">
          داستان این پویش معنوی
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="liquid-glass rounded-[28px] p-6 sm:p-7 flex flex-col items-center text-center gap-4 relative overflow-hidden group border border-white/[0.12] hover:border-amber-400/40 transition-all duration-500 hover:-translate-y-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
            style={{ animation: `gentleFade 0.8s cubic-bezier(0.22,0.8,0.35,1) ${i * 0.15}s both` }}
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/[0.08] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="w-14 h-14 rounded-[20px] liquid-glass-gold flex items-center justify-center text-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.25)]">
              <step.icon className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-100">{step.title}</h3>
            <p className="text-xs sm:text-[13px] text-slate-300/90 leading-[1.9] font-medium">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

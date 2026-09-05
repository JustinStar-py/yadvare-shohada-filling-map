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
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400/90 mb-3 tracking-wide">
          <span className="w-7 h-px bg-amber-500/50" />
          <span>داستان پویش</span>
          <span className="w-7 h-px bg-amber-500/50" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
          داستان این پویش معنوی
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          «هر صلوات، یک قدم تا پرواز به سوی افق روشن شهادت»
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center gap-3.5 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-500 hover:-translate-y-1"
            style={{ animation: `gentleFade 0.8s cubic-bezier(0.22,0.8,0.35,1) ${i * 0.15}s both` }}
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/[0.06] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/[0.04] border border-amber-500/25 flex items-center justify-center text-amber-400">
              <step.icon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">{step.title}</h3>
            <p className="text-xs text-slate-400 leading-[1.9]">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

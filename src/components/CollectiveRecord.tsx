"use client";

import React from "react";
import { formatPersianNumber, toPersianDigits } from "@/lib/utils";
import { useCountUp } from "@/lib/client/use-count-up";
import { Sparkles, Rocket } from "lucide-react";

interface CollectiveRecordProps {
  totalSalawat: number;
  totalLaunches: number;
}

export default function CollectiveRecord({
  totalSalawat,
  totalLaunches,
}: CollectiveRecordProps) {
  const animatedSalawat = useCountUp(totalSalawat, 1400);
  const animatedLaunches = useCountUp(totalLaunches, 1200);

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8 relative z-10">
      <div className="liquid-glass rounded-[32px] p-8 sm:p-10 flex flex-col md:flex-row items-center justify-around gap-8 text-center border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
        {/* Total Salawat */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-[20px] liquid-glass-gold flex items-center justify-center text-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.25)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-3xl sm:text-[42px] font-black gold-text tracking-tight tabular-nums leading-none py-1">
            {formatPersianNumber(animatedSalawat)}
          </span>
          <span className="text-xs sm:text-sm text-slate-300 font-semibold">
            مجموع صلوات‌های ثبت‌شده در پویش
          </span>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-24 bg-gradient-to-b from-transparent via-white/15 to-transparent" />

        {/* Total Launches */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-[20px] liquid-glass-gold flex items-center justify-center text-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.25)]">
            <Rocket className="w-6 h-6" />
          </div>
          <span className="text-3xl sm:text-[42px] font-black gold-text tracking-tight tabular-nums leading-none py-1">
            {toPersianDigits(animatedLaunches)}
          </span>
          <span className="text-xs sm:text-sm text-slate-300 font-semibold">
            پرواز موفقیت‌آمیز به یاد شهدا
          </span>
        </div>
      </div>
    </section>
  );
}

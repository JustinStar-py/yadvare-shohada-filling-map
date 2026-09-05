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
      <div className="glass-panel rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-around gap-8 text-center">
        {/* Total Salawat */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/[0.04] border border-amber-500/25 flex items-center justify-center text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-3xl sm:text-[40px] font-extrabold gold-text tracking-tight tabular-nums leading-none py-1">
            {formatPersianNumber(animatedSalawat)}
          </span>
          <span className="text-xs sm:text-sm text-slate-300/90 font-medium">
            مجموع صلوات‌های ثبت‌شده در پویش
          </span>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-24 bg-gradient-to-b from-transparent via-slate-700 to-transparent" />

        {/* Total Launches */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/[0.04] border border-amber-500/25 flex items-center justify-center text-amber-400">
            <Rocket className="w-6 h-6" />
          </div>
          <span className="text-3xl sm:text-[40px] font-extrabold gold-text tracking-tight tabular-nums leading-none py-1">
            {toPersianDigits(animatedLaunches)}
          </span>
          <span className="text-xs sm:text-sm text-slate-300/90 font-medium">
            پرواز موفقیت‌آمیز به یاد شهدا
          </span>
        </div>
      </div>
    </section>
  );
}

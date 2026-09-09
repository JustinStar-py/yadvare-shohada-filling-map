"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, ChevronRight, ChevronLeft, X, Check } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  preferredPosition?: "top" | "bottom" | "auto";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "rocket",
    selector: '[data-tour="rocket"]',
    title: "موشک معنوی پرواز",
    description: "این موشک نماد عروج و همبستگی معنوی است که با صلوات‌های پرمهر شما گام‌به‌گام سوخت‌گیری شده و به آسمان پرواز می‌کند.",
    preferredPosition: "bottom",
  },
  {
    id: "counter",
    selector: '[data-tour="counter"]',
    title: "شمارنده صلوات‌ها و هدف روز",
    description: "تعداد صلوات‌های ثبت‌شده امروز و هدف تعیین‌شده برای آماده‌سازی پرواز در این بخش نمایش داده می‌شود.",
    preferredPosition: "auto",
  },
  {
    id: "progress",
    selector: '[data-tour="progress"]',
    title: "نوار پیشرفت سوخت موشک",
    description: "با ارسال هر صلوات، نوار سوخت پرتر می‌شود و با تکمیل ۱۰۰٪ مخزن، موشک آماده پرواز خواهد شد.",
    preferredPosition: "top",
  },
  {
    id: "salawat-button",
    selector: '[data-tour="salawat-button"]',
    title: "دکمه ثبت صلوات و مشارکت",
    description: "با فشردن این دکمه، صلوات شما بلافاصله ثبت شده و انرژی سوخت پرواز موشک را افزایش می‌دهد.",
    preferredPosition: "top",
  },
  {
    id: "dedication",
    selector: '[data-tour="dedication"]',
    title: "شهدای والامقام پرواز امروز",
    description: "پرواز هر روز به یاد و نام پاک گروهی از شهدای دیار شهیدیه تقدیم می‌شود؛ مشخصات و تصویر آن‌ها را در این بخش مشاهده فرمایید.",
    preferredPosition: "top",
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export default function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowSide: "top" | "bottom" } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Find visible element matching selector (handles mobile vs desktop alternatives)
  const findElement = useCallback((selector: string): HTMLElement | null => {
    if (typeof document === "undefined") return null;
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const el of Array.from(elements)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return el;
      }
    }
    return elements[0] || null;
  }, []);

  // Update spotlight & tooltip geometry
  const updateGeometry = useCallback(() => {
    if (!isOpen || !step) return;

    const el = findElement(step.selector);
    if (!el) {
      // Fallback center of screen
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setSpotlightRect({ x: cx - 120, y: cy - 120, width: 240, height: 240, radius: 24 });
      setTooltipPos({ top: cy + 140, left: Math.max(16, cx - 160), arrowSide: "top" });
      return;
    }

    const b = el.getBoundingClientRect();
    const padding = 10;
    const x = Math.max(6, b.left - padding);
    const y = Math.max(6, b.top - padding);
    const width = Math.min(window.innerWidth - 12, b.width + padding * 2);
    const height = Math.min(window.innerHeight - 12, b.height + padding * 2);
    const radius = 20;

    setSpotlightRect({ x, y, width, height, radius });

    // Calculate tooltip coordinates
    const tooltipWidth = Math.min(360, window.innerWidth - 32);
    const tooltipHeight = 190;
    const spaceBelow = window.innerHeight - (y + height);
    const spaceAbove = y;

    let arrowSide: "top" | "bottom" = "top";
    let top = y + height + 14;

    if (step.preferredPosition === "top") {
      if (spaceAbove >= tooltipHeight + 16) {
        top = y - tooltipHeight - 14;
        arrowSide = "bottom";
      } else {
        top = y + height + 14;
        arrowSide = "top";
      }
    } else if (step.preferredPosition === "bottom") {
      if (spaceBelow >= tooltipHeight + 16 || spaceBelow > spaceAbove) {
        top = y + height + 14;
        arrowSide = "top";
      } else {
        top = y - tooltipHeight - 14;
        arrowSide = "bottom";
      }
    } else {
      // Auto: pick the side with more space
      if (spaceBelow < tooltipHeight + 16 && spaceAbove > spaceBelow) {
        top = y - tooltipHeight - 14;
        arrowSide = "bottom";
      } else {
        top = y + height + 14;
        arrowSide = "top";
      }
    }

    // Clamp vertical position
    top = Math.max(12, Math.min(window.innerHeight - tooltipHeight - 12, top));

    // Horizontal centering
    let left = x + width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    setTooltipPos({ top, left, arrowSide });
  }, [findElement, isOpen, step]);

  // Navigate to step & auto-scroll
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOUR_STEPS.length) return;
      setCurrentStepIndex(index);

      const targetStep = TOUR_STEPS[index];
      const el = findElement(targetStep.selector);

      if (el) {
        const rect = el.getBoundingClientRect();
        const isInViewport =
          rect.top >= 70 &&
          rect.bottom <= window.innerHeight - 70;

        if (!isInViewport) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      // Track smooth scroll continuously for 550ms
      const startTime = performance.now();
      const followScroll = () => {
        updateGeometry();
        if (performance.now() - startTime < 550) {
          animFrameRef.current = requestAnimationFrame(followScroll);
        }
      };
      animFrameRef.current = requestAnimationFrame(followScroll);
    },
    [findElement, updateGeometry]
  );

  useEffect(() => {
    if (!isOpen) return;

    goToStep(currentStepIndex);

    const onScroll = () => updateGeometry();
    const onResize = () => updateGeometry();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowLeft") {
        // In Persian RTL, left arrow moves forward
        handleNext();
      } else if (e.key === "ArrowRight") {
        // Right arrow moves back
        handlePrev();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, currentStepIndex, goToStep, updateGeometry]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem("yadvare_tour_completed_v1", "true");
    } catch {}
    if (onComplete) onComplete();
    onClose();
  };

  const handleSkip = () => {
    try {
      localStorage.setItem("yadvare_tour_completed_v1", "true");
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] select-none pointer-events-none" style={{ direction: "rtl" }}>
      {/* ── 4-Rectangle Backdrop: Darkens & Blurs everything EXCEPT the spotlight region ── */}
      {/* This ensures the highlighted element is 100% visible and interactable with ZERO DOM obstruction */}
      {spotlightRect ? (
        <>
          {/* Top backdrop */}
          <div
            className="fixed top-0 left-0 right-0 bg-[#05080e]/75 backdrop-blur-[3.5px] pointer-events-auto transition-all duration-300 ease-out"
            style={{ height: Math.max(0, spotlightRect.y) }}
            onClick={handleSkip}
          />
          {/* Bottom backdrop */}
          <div
            className="fixed left-0 right-0 bottom-0 bg-[#05080e]/75 backdrop-blur-[3.5px] pointer-events-auto transition-all duration-300 ease-out"
            style={{ top: Math.max(0, spotlightRect.y + spotlightRect.height) }}
            onClick={handleSkip}
          />
          {/* Left backdrop */}
          <div
            className="fixed left-0 bg-[#05080e]/75 backdrop-blur-[3.5px] pointer-events-auto transition-all duration-300 ease-out"
            style={{
              top: Math.max(0, spotlightRect.y),
              width: Math.max(0, spotlightRect.x),
              height: Math.max(0, spotlightRect.height),
            }}
            onClick={handleSkip}
          />
          {/* Right backdrop */}
          <div
            className="fixed right-0 bg-[#05080e]/75 backdrop-blur-[3.5px] pointer-events-auto transition-all duration-300 ease-out"
            style={{
              top: Math.max(0, spotlightRect.y),
              left: Math.max(0, spotlightRect.x + spotlightRect.width),
              height: Math.max(0, spotlightRect.height),
            }}
            onClick={handleSkip}
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-[#05080e]/75 backdrop-blur-[3.5px] pointer-events-auto transition-opacity duration-300"
          onClick={handleSkip}
        />
      )}

      {/* Golden Glowing Focus Border around the active element */}
      {spotlightRect && (
        <div
          className="fixed pointer-events-none border-2 border-amber-400/85 shadow-[0_0_24px_rgba(245,158,11,0.55),inset_0_0_12px_rgba(245,158,11,0.2)] transition-all duration-300 ease-out z-[102]"
          style={{
            top: spotlightRect.y,
            left: spotlightRect.x,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: spotlightRect.radius,
          }}
        >
          {/* Subtle 4-corner holographic brackets */}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300" />
          <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300" />
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300" />
          <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300" />
        </div>
      )}

      {/* Guided Tooltip Card */}
      {tooltipPos && (
        <div
          className="fixed pointer-events-auto z-[105] w-[calc(100vw-32px)] max-w-[360px] p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-amber-500/40 backdrop-blur-xl shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(245,158,11,0.2)] transition-all duration-300 ease-out text-right animate-in fade-in zoom-in-95"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-amber-500/20">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                گام {toPersianDigits(currentStepIndex + 1)} از {toPersianDigits(TOUR_STEPS.length)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="بستن تور راهنما"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Body */}
          <div className="mb-4">
            <h3 className="text-sm sm:text-base font-black text-slate-100 mb-1.5">
              {step.title}
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-300/95 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToStep(idx)}
                className={`transition-all duration-300 cursor-pointer ${
                  idx === currentStepIndex
                    ? "w-5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    : "w-1.5 h-1.5 rounded-full bg-slate-700 hover:bg-slate-500"
                }`}
                title={`رفتن به گام ${toPersianDigits(idx + 1)}`}
              />
            ))}
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] sm:text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              رد کردن تور
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-bold transition-all cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>قبلی</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:shadow-[0_0_16px_rgba(245,158,11,0.6)] transition-all cursor-pointer"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? "پایان تور" : "بعدی"}</span>
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

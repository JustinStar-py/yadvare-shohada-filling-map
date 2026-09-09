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
    selector: '[data-tour="counter"], [data-tour="target"]',
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
  const [spotlightRects, setSpotlightRects] = useState<SpotlightRect[]>([]);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowSide: "top" | "bottom" } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Find all visible elements matching selector (supports multi-element steps like target + counter)
  const findElements = useCallback((selector: string): HTMLElement[] => {
    if (typeof document === "undefined") return [];
    const elements = document.querySelectorAll<HTMLElement>(selector);
    const visible: HTMLElement[] = [];
    for (const el of Array.from(elements)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        visible.push(el);
      }
    }
    return visible;
  }, []);

  // Update spotlight & tooltip geometry
  const updateGeometry = useCallback(() => {
    if (!isOpen || !step) return;

    const els = findElements(step.selector);
    if (els.length === 0) {
      // Fallback center of screen
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setSpotlightRects([{ x: cx - 120, y: cy - 120, width: 240, height: 240, radius: 24 }]);
      setTooltipPos({ top: cy + 140, left: Math.max(16, cx - 160), arrowSide: "top" });
      return;
    }

    const padding = 8;
    const rects: SpotlightRect[] = els.map((el) => {
      const b = el.getBoundingClientRect();
      const x = Math.max(4, b.left - padding);
      const y = Math.max(4, b.top - padding);
      const width = Math.min(window.innerWidth - 8, b.width + padding * 2);
      const height = Math.min(window.innerHeight - 8, b.height + padding * 2);
      const radius = 20;
      return { x, y, width, height, radius };
    });

    setSpotlightRects(rects);

    // Calculate combined bounding box across all highlighted elements
    const minX = Math.min(...rects.map((r) => r.x));
    const maxX = Math.max(...rects.map((r) => r.x + r.width));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxY = Math.max(...rects.map((r) => r.y + r.height));
    const combinedWidth = maxX - minX;

    const tooltipWidth = Math.min(360, window.innerWidth - 32);
    const tooltipHeight = 190;
    const spaceBelow = window.innerHeight - maxY;
    const spaceAbove = minY;

    let arrowSide: "top" | "bottom" = "top";
    let top = maxY + 14;

    if (step.preferredPosition === "top") {
      if (spaceAbove >= tooltipHeight + 16) {
        top = minY - tooltipHeight - 14;
        arrowSide = "bottom";
      } else {
        top = maxY + 14;
        arrowSide = "top";
      }
    } else if (step.preferredPosition === "bottom") {
      if (spaceBelow >= tooltipHeight + 16 || spaceBelow > spaceAbove) {
        top = maxY + 14;
        arrowSide = "top";
      } else {
        top = minY - tooltipHeight - 14;
        arrowSide = "bottom";
      }
    } else {
      // Auto: pick the side with more space
      if (spaceBelow < tooltipHeight + 16 && spaceAbove > spaceBelow) {
        top = minY - tooltipHeight - 14;
        arrowSide = "bottom";
      } else {
        top = maxY + 14;
        arrowSide = "top";
      }
    }

    // Clamp vertical position
    top = Math.max(12, Math.min(window.innerHeight - tooltipHeight - 12, top));

    // Horizontal centering over the combined bounding box (centers nicely between dual boxes)
    let left = minX + combinedWidth / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    setTooltipPos({ top, left, arrowSide });
  }, [findElements, isOpen, step]);

  // Navigate to step & auto-scroll
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOUR_STEPS.length) return;
      setCurrentStepIndex(index);

      const targetStep = TOUR_STEPS[index];
      const els = findElements(targetStep.selector);

      if (els.length > 0) {
        // Check if any element is out of viewport
        const outOfView = els.find((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top < 70 || rect.bottom > window.innerHeight - 70;
        });

        if (outOfView) {
          outOfView.scrollIntoView({ behavior: "smooth", block: "center" });
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
    [findElements, updateGeometry]
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
        handleNext();
      } else if (e.key === "ArrowRight") {
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
      {/* ── SVG Mask Definition: Punches holes for ALL active elements in the step ── */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <mask id="tour-spotlight-mask" maskContentUnits="userSpaceOnUse">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRects.map((rect, idx) => (
              <rect
                key={idx}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={rect.radius}
                fill="black"
              />
            ))}
          </mask>
        </defs>
      </svg>

      {/* Darkened Backdrop with cutout hole(s) for ALL active elements */}
      <div
        className="fixed inset-0 bg-[#05080e]/75 backdrop-blur-[3.5px] transition-opacity duration-300 pointer-events-auto"
        style={{
          mask: "url(#tour-spotlight-mask)",
          WebkitMask: "url(#tour-spotlight-mask)",
        }}
        onClick={(e) => {
          const { clientX, clientY } = e;
          const isInsideAnyCutout = spotlightRects.some(
            (r) =>
              clientX >= r.x &&
              clientX <= r.x + r.width &&
              clientY >= r.y &&
              clientY <= r.y + r.height
          );
          if (!isInsideAnyCutout) {
            handleSkip();
          }
        }}
      />

      {/* Golden Glowing Focus Border around EACH active element */}
      {spotlightRects.map((rect, idx) => (
        <div
          key={idx}
          className="fixed pointer-events-none border-2 border-amber-400/85 shadow-[0_0_24px_rgba(245,158,11,0.55),inset_0_0_12px_rgba(245,158,11,0.2)] transition-all duration-300 ease-out z-[102]"
          style={{
            top: rect.y,
            left: rect.x,
            width: rect.width,
            height: rect.height,
            borderRadius: rect.radius,
          }}
        >
          {/* Subtle 4-corner holographic brackets */}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300" />
          <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300" />
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300" />
          <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300" />
        </div>
      ))}

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

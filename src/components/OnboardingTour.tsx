"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
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
    preferredPosition: "bottom",
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

interface BackdropRect {
  key: string;
  top: number | string;
  left: number | string;
  width: number | string;
  height: number | string;
}

// Compute discrete backdrop tiles so that the interiors of the active yellow boxes
// have ZERO backdrop element covering them (100% unblurred and crisp on all browsers)
function computeBackdropRects(
  spotlightRects: SpotlightRect[],
  viewportW: number,
  viewportH: number
): BackdropRect[] {
  if (spotlightRects.length === 0) {
    return [{ key: "full", top: 0, left: 0, width: "100vw", height: "100vh" }];
  }

  if (spotlightRects.length === 1) {
    const r = spotlightRects[0];
    const topH = Math.max(0, r.y);
    const bottomTop = r.y + r.height;
    const bottomH = Math.max(0, viewportH - bottomTop);
    const leftW = Math.max(0, r.x);
    const rightLeft = r.x + r.width;
    const rightW = Math.max(0, viewportW - rightLeft);

    const rects: BackdropRect[] = [];
    if (topH > 0) {
      rects.push({ key: "top", top: 0, left: 0, width: "100vw", height: topH });
    }
    if (bottomH > 0) {
      rects.push({ key: "bottom", top: bottomTop, left: 0, width: "100vw", height: bottomH });
    }
    if (leftW > 0 && r.height > 0) {
      rects.push({ key: "left", top: r.y, left: 0, width: leftW, height: r.height });
    }
    if (rightW > 0 && r.height > 0) {
      rects.push({ key: "right", top: r.y, left: rightLeft, width: rightW, height: r.height });
    }
    return rects;
  }

  // Two or more spotlight rects (e.g. Target on left and Salawat on right)
  const sorted = [...spotlightRects].sort((a, b) => a.x - b.x);
  const r1 = sorted[0];
  const r2 = sorted[1];

  const topY = Math.max(0, Math.min(r1.y, r2.y));
  const bottomY = Math.min(viewportH, Math.max(r1.y + r1.height, r2.y + r2.height));

  const rects: BackdropRect[] = [];

  // Top region across full viewport
  if (topY > 0) {
    rects.push({ key: "top", top: 0, left: 0, width: "100vw", height: topY });
  }

  // Bottom region across full viewport
  if (viewportH - bottomY > 0) {
    rects.push({ key: "bottom", top: bottomY, left: 0, width: "100vw", height: viewportH - bottomY });
  }

  // Left of r1
  if (r1.x > 0) {
    rects.push({ key: "left-r1", top: r1.y, left: 0, width: r1.x, height: r1.height });
  }

  // Above r1 if r1 starts below topY
  if (r1.y > topY) {
    rects.push({ key: "above-r1", top: topY, left: r1.x, width: r1.width, height: r1.y - topY });
  }

  // Below r1 if r1 ends above bottomY
  if (r1.y + r1.height < bottomY) {
    rects.push({
      key: "below-r1",
      top: r1.y + r1.height,
      left: r1.x,
      width: r1.width,
      height: bottomY - (r1.y + r1.height),
    });
  }

  // Middle region between r1 and r2 (blurs the central area between the two boxes, like the rocket)
  const midLeft = r1.x + r1.width;
  const midW = r2.x - midLeft;
  if (midW > 0) {
    rects.push({
      key: "mid",
      top: topY,
      left: midLeft,
      width: midW,
      height: bottomY - topY,
    });
  }

  // Above r2 if r2 starts below topY
  if (r2.y > topY) {
    rects.push({ key: "above-r2", top: topY, left: r2.x, width: r2.width, height: r2.y - topY });
  }

  // Below r2 if r2 ends above bottomY
  if (r2.y + r2.height < bottomY) {
    rects.push({
      key: "below-r2",
      top: r2.y + r2.height,
      left: r2.x,
      width: r2.width,
      height: bottomY - (r2.y + r2.height),
    });
  }

  // Right of r2
  const r2Right = r2.x + r2.width;
  if (viewportW - r2Right > 0) {
    rects.push({
      key: "right-r2",
      top: r2.y,
      left: r2Right,
      width: viewportW - r2Right,
      height: r2.height,
    });
  }

  return rects;
}

// ── Tooltip placement ──────────────────────────────────────────────
// Minimum breathing room between the yellow spotlight rim and the card.
const TOOLTIP_GAP = 16;
// First-render guess until the real card height is measured (see below).
const FALLBACK_TOOLTIP_HEIGHT = 230;

interface SpotlightBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface TooltipPlacement {
  top: number;
  left: number;
  arrowSide: "top" | "bottom";
  /** True → dock as a bottom sheet (neither side fits a readable card). */
  docked: boolean;
}

/**
 * Places the tooltip fully outside the spotlight box with TOOLTIP_GAP clearance.
 * Never lets the card overlap the yellow rim: if the preferred side cannot fit
 * the (measured) card height, it tries the other side, then falls back to a
 * bottom sheet which is always readable on small screens.
 */
function placeTooltip(
  preferred: "top" | "bottom" | "auto",
  box: SpotlightBox,
  vw: number,
  vh: number,
  estH: number
): TooltipPlacement {
  const tooltipWidth = Math.min(360, vw - 32);
  const spaceBelow = vh - box.maxY;
  const spaceAbove = box.minY;
  const need = estH + TOOLTIP_GAP + 8; // +8 safe-area slack
  const fitsAbove = spaceAbove >= need;
  const fitsBelow = spaceBelow >= need;

  let side: "above" | "below" | "docked";
  if (preferred === "top") {
    side = fitsAbove ? "above" : fitsBelow ? "below" : "docked";
  } else if (preferred === "bottom") {
    side = fitsBelow ? "below" : fitsAbove ? "above" : "docked";
  } else {
    if (fitsBelow && fitsAbove) side = "below";
    else if (fitsBelow) side = "below";
    else if (fitsAbove) side = "above";
    else side = "docked";
  }

  // Horizontal centering over the combined spotlight box
  const combinedWidth = box.maxX - box.minX;
  const left = Math.max(14, Math.min(vw - tooltipWidth - 14, box.minX + combinedWidth / 2 - tooltipWidth / 2));

  if (side === "docked") return { top: 0, left, arrowSide: "top", docked: true };
  if (side === "above") {
    return {
      top: Math.max(8, box.minY - estH - TOOLTIP_GAP),
      left,
      arrowSide: "bottom",
      docked: false,
    };
  }
  return {
    top: Math.min(vh - estH - 8, box.maxY + TOOLTIP_GAP),
    left,
    arrowSide: "top",
    docked: false,
  };
}

export default function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRects, setSpotlightRects] = useState<SpotlightRect[]>([]);
  const [viewport, setViewport] = useState({ width: 1000, height: 800 });
  const [tooltipPos, setTooltipPos] = useState<TooltipPlacement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // Real measured card height per step (the card is ~2x taller than it looks
  // in code, so a hardcoded guess always misplaces it). Reposition attempts
  // are capped per step so measurement can never loop.
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const measuredHeightsRef = useRef<Record<number, number>>({});
  const repositionAttemptsRef = useRef<Record<number, number>>({});

  const step = TOUR_STEPS[currentStepIndex];

  // Find all visible elements matching selector
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

  // Update spotlight & tooltip geometry for any specific step index
  const updateGeometry = useCallback(
    (stepIdx: number) => {
      if (!isOpen) return;
      const currentStep = TOUR_STEPS[stepIdx];
      if (!currentStep) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ width: vw, height: vh });

      const els = findElements(currentStep.selector);
      if (els.length === 0) {
        const cx = vw / 2;
        const cy = vh / 2;
        setSpotlightRects([{ x: cx - 120, y: cy - 120, width: 240, height: 240, radius: 24 }]);
        const estH = measuredHeightsRef.current[stepIdx] ?? FALLBACK_TOOLTIP_HEIGHT;
        setTooltipPos(
          placeTooltip("auto", { minX: cx - 120, maxX: cx + 120, minY: cy - 120, maxY: cy + 120 }, vw, vh, estH)
        );
        return;
      }

      const padding = 8;
      const rects: SpotlightRect[] = els.map((el) => {
        const b = el.getBoundingClientRect();
        const x = Math.max(4, b.left - padding);
        const y = Math.max(4, b.top - padding);
        const width = Math.min(vw - 8, b.width + padding * 2);
        const height = Math.min(vh - 8, b.height + padding * 2);
        const radius = 20;
        return { x, y, width, height, radius };
      });

      setSpotlightRects(rects);

      // Calculate combined bounding box across all active elements
      const box: SpotlightBox = {
        minX: Math.min(...rects.map((r) => r.x)),
        maxX: Math.max(...rects.map((r) => r.x + r.width)),
        minY: Math.min(...rects.map((r) => r.y)),
        maxY: Math.max(...rects.map((r) => r.y + r.height)),
      };

      // Use the measured card height when known — a hardcoded guess is what
      // used to drop the card on top of the yellow spotlight rim.
      const estH = measuredHeightsRef.current[stepIdx] ?? FALLBACK_TOOLTIP_HEIGHT;
      setTooltipPos(placeTooltip(currentStep.preferredPosition ?? "auto", box, vw, vh, estH));
    },
    [findElements, isOpen]
  );

  // Navigate to step & auto-scroll
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOUR_STEPS.length) return;
      setCurrentStepIndex(index);

      const targetStep = TOUR_STEPS[index];
      const els = findElements(targetStep.selector);

      if (els.length > 0) {
        if (targetStep.id === "dedication") {
          const rect = els[0].getBoundingClientRect();
          // Position the 2-row spotlight card near top of viewport (y ≈ 56px),
          // leaving maximum free space below it for the tutorial box.
          const targetY = window.scrollY + rect.top - 56;
          window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
        } else {
          const outOfView = els.find((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top < 70 || rect.bottom > window.innerHeight - 70;
          });

          if (outOfView) {
            outOfView.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    },
    [findElements]
  );

  const prevIsOpenRef = useRef(false);

  // When tour opens (transition from false to true), ALWAYS restart from the very first step (Step 1) and scroll to top
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setCurrentStepIndex(0);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Whenever currentStepIndex changes or window resizes/scrolls, calculate geometry immediately
  useEffect(() => {
    if (!isOpen) return;

    // Immediately calculate geometry for current step
    updateGeometry(currentStepIndex);

    // Track during smooth scroll continuously for 550ms
    const startTime = performance.now();
    let animId: number;
    const followScroll = () => {
      updateGeometry(currentStepIndex);
      if (performance.now() - startTime < 550) {
        animId = requestAnimationFrame(followScroll);
      }
    };
    animId = requestAnimationFrame(followScroll);

    const onScroll = () => updateGeometry(currentStepIndex);
    const onResize = () => updateGeometry(currentStepIndex);

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
      cancelAnimationFrame(animId);
    };
  }, [isOpen, currentStepIndex, updateGeometry]);

  // Measure the real card height after paint and reposition once if the guess
  // was off — this is what guarantees the card never covers the yellow rim.
  useLayoutEffect(() => {
    if (!isOpen || !tooltipPos || tooltipPos.docked) return;
    const el = tooltipRef.current;
    if (!el) return;
    const realH = el.offsetHeight;
    if (realH <= 0) return;
    const prev = measuredHeightsRef.current[currentStepIndex];
    if (prev !== undefined && Math.abs(prev - realH) <= 2) return;
    const attempts = repositionAttemptsRef.current[currentStepIndex] ?? 0;
    if (prev !== undefined && attempts >= 2) return;
    measuredHeightsRef.current[currentStepIndex] = realH;
    repositionAttemptsRef.current[currentStepIndex] = attempts + 1;
    updateGeometry(currentStepIndex);
  }, [isOpen, currentStepIndex, tooltipPos, updateGeometry]);

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

  const backdropRects = computeBackdropRects(spotlightRects, viewport.width, viewport.height);

  return (
    <div className="fixed inset-0 z-[100] select-none pointer-events-none" style={{ direction: "rtl" }}>
      {/* ── Discrete Backdrop Tiles: Pure blur outside yellow boxes, ZERO overlay inside ── */}
      {backdropRects.map((br) => (
        <div
          key={br.key}
          className="fixed bg-[#05080e]/78 backdrop-blur-[6px] pointer-events-auto cursor-pointer transition-all duration-300 ease-out"
          style={{
            top: br.top,
            left: br.left,
            width: br.width,
            height: br.height,
          }}
          onClick={handleSkip}
        />
      ))}

      {/* ── Active Focus Spotlight: Refined luminous amber rim with corner accents ── */}
      {spotlightRects.map((rect, idx) => (
        <div
          key={idx}
          className="fixed pointer-events-none border-2 border-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.7),inset_0_0_14px_rgba(245,158,11,0.3)] transition-all duration-300 ease-out z-[102]"
          style={{
            top: rect.y,
            left: rect.x,
            width: rect.width,
            height: rect.height,
            borderRadius: rect.radius,
          }}
        >
          {/* 4-corner holographic brackets */}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 rounded-tr-xs" />
          <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 rounded-tl-xs" />
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 rounded-br-xs" />
          <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 rounded-bl-xs" />
        </div>
      ))}

      {/* ── Guided Tooltip Card — Apple iOS 18 Liquid Glass Sheet ── */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-auto z-[105] w-[calc(100vw-28px)] max-w-[360px] p-3.5 sm:p-4 rounded-[26px] liquid-glass border border-amber-400/40 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.25)] transition-all duration-300 ease-out text-right animate-in fade-in zoom-in-95"
          style={
            tooltipPos.docked
              ? { left: 14, right: 14, bottom: "calc(14px + env(safe-area-inset-bottom))", top: "auto" }
              : {
                  top: tooltipPos.top,
                  left: tooltipPos.left,
                }
          }
        >
          {/* Header: Step Pill + Apple Capsule Dots + Close X */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-400/20">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-black text-amber-300 liquid-glass-pill-gold px-2.5 py-0.5 rounded-full">
                گام {toPersianDigits(currentStepIndex + 1)} از {toPersianDigits(TOUR_STEPS.length)}
              </span>
            </div>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToStep(idx)}
                  className={`transition-all duration-300 cursor-pointer ${
                    idx === currentStepIndex
                      ? "w-4 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                      : "w-1.5 h-1.5 rounded-full bg-white/25 hover:bg-white/50"
                  }`}
                  title={`رفتن به گام ${toPersianDigits(idx + 1)}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="w-6.5 h-6.5 rounded-full liquid-glass-pill text-slate-300 hover:text-white flex items-center justify-center cursor-pointer ios-press"
              title="بستن تور راهنما"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Title & Body */}
          <div className="mb-3">
            <h3 className="text-xs sm:text-sm font-black text-slate-100 mb-1 tracking-tight">
              {step.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-medium">
              {step.description}
            </p>
          </div>

          {/* Controls Footer — iOS Spring Tactile Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer font-bold"
            >
              رد کردن
            </button>

            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl liquid-glass text-slate-200 hover:text-white text-xs font-bold cursor-pointer ios-press"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>قبلی</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-[0_4px_16px_rgba(245,158,11,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.6)] cursor-pointer ios-press"
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

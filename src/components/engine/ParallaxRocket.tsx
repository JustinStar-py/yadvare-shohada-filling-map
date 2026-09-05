"use client";

import React, { useEffect, useRef } from "react";
import { MissionState } from "@/types/campaign";
import { useCountUp } from "@/lib/client/use-count-up";

interface ParallaxRocketProps {
  currentCount: number;
  target: number;
  missionState: MissionState;
  isLaunching: boolean;
  pulseTrigger: number;
}

export default function ParallaxRocket({
  currentCount,
  target,
  missionState,
  isLaunching,
  pulseTrigger,
}: ParallaxRocketProps) {
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const coreGlowRef = useRef<SVGCircleElement | null>(null);
  const flashRectRef = useRef<SVGRectElement | null>(null);
  const flameRef = useRef<SVGGElement | null>(null);

  // Smooth liquid rise — iOS-like eased count interpolation
  const animatedCount = useCountUp(currentCount, 950);
  const percentage = Math.min(100, Math.max(0, (animatedCount / (target || 1)) * 100));
  const isReady = missionState === "READY_TO_LAUNCH" || percentage >= 100;
  const isLaunched = missionState === "LAUNCHED";

  // ── Pointer-driven 3D parallax (spring smoothed) ──
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `perspective(950px) rotateX(${(-current.y * 4).toFixed(2)}deg) rotateY(${(current.x * 5).toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Salawat pulse: core flare + liquid color flash ──
  useEffect(() => {
    if (pulseTrigger === 0) return;
    const core = coreGlowRef.current;
    const flash = flashRectRef.current;
    const flame = flameRef.current;

    if (core) {
      core.animate(
        [
          { transform: "scale(1)", opacity: "0.75" },
          { transform: "scale(1.9)", opacity: "1" },
          { transform: "scale(1)", opacity: "0.75" },
        ],
        { duration: 640, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }

    // Liquid brightens then settles back — warm white wash
    if (flash) {
      flash.animate(
        [
          { opacity: "0.5" },
          { opacity: "0" },
        ],
        { duration: 750, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }

    if (flame && (isReady || isLaunching)) {
      flame.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.05, 1.25)" },
          { transform: "scale(1, 1)" },
        ],
        { duration: 500, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseTrigger]);

  // ── Fuel geometry ──
  const CAPSULE_TOP = 138;
  const CAPSULE_BOTTOM = 262;
  const CAPSULE_H = CAPSULE_BOTTOM - CAPSULE_TOP;
  const fillH = (CAPSULE_H * percentage) / 100;
  const surfaceY = CAPSULE_BOTTOM - fillH;

  // Wave path: spans x 46..163 (two extra periods beyond the translate range
  // so the liquid never gaps the capsule while sliding)
  const waveD = `M46 ${surfaceY.toFixed(2)} q4.5 -3.2 9 0${" t9 0".repeat(12)} L163 ${CAPSULE_BOTTOM} L46 ${CAPSULE_BOTTOM} Z`;

  const auraIntensity = Math.min(1, percentage / 100);
  const showFlame = isReady || isLaunching;

  return (
    <div
      ref={parallaxRef}
      className="relative h-[clamp(190px,32dvh,430px)] aspect-[10/21] flex items-center justify-center will-change-transform"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Layered celestial aura */}
      <div
        className="absolute -inset-8 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(96,165,250,${0.06 + auraIntensity * 0.09}) 0%, rgba(251,191,36,${auraIntensity * 0.2}) 45%, transparent 70%)`,
          transition: "background 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      {isReady && (
        <div className="absolute -inset-12 rounded-full blur-3xl pointer-events-none animate-aura bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.28)_0%,transparent_65%)]" />
      )}

      {/* Ignition ground glow */}
      {showFlame && (
        <div
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-48 h-9 rounded-[100%] blur-xl pointer-events-none transition-opacity duration-700 ${
            isLaunching ? "opacity-90" : "opacity-50"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(251,191,36,0.85) 0%, rgba(245,158,11,0.35) 45%, transparent 75%)",
          }}
        />
      )}

      {/* Motion stack: float → vibrate → launch */}
      <div
        className={`relative w-full h-full flex items-center justify-center ${
          isLaunching
            ? "animate-rocket-launch"
            : isLaunched
            ? "opacity-0 -translate-y-[760px] scale-75 pointer-events-none"
            : "animate-float"
        }`}
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: "900ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className={`relative w-full h-full ${isReady && !isLaunching ? "animate-rocket-ready" : ""}`}>
          <svg
            viewBox="0 0 200 420"
            className="w-full h-full drop-shadow-[0_14px_30px_rgba(0,0,0,0.65)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pr-body" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#141d33" />
                <stop offset="28%" stopColor="#2b3a57" />
                <stop offset="52%" stopColor="#42536f" />
                <stop offset="74%" stopColor="#2b3a57" />
                <stop offset="100%" stopColor="#101828" />
              </linearGradient>

              <linearGradient id="pr-nose" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#92610c" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#7c4a06" />
              </linearGradient>

              <linearGradient id="pr-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              <linearGradient id="pr-fuel" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="80%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fef3c7" />
              </linearGradient>

              <linearGradient id="pr-flame" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fff7db" />
                <stop offset="35%" stopColor="#fbbf24" />
                <stop offset="75%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>

              <radialGradient id="pr-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="rgba(251,191,36,0)" />
              </radialGradient>

              <filter id="pr-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.4" result="b" />
                <feComposite in="SourceGraphic" in2="b" operator="over" />
              </filter>

              <filter id="pr-softglow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feComposite in="SourceGraphic" in2="b" operator="over" />
              </filter>

              <clipPath id="pr-capsule">
                <rect x="86" y="138" width="28" height="124" rx="14" />
              </clipPath>
            </defs>

            {/* ── Launch pad ── */}
            <g opacity={isLaunching ? 0 : 1} style={{ transition: "opacity 0.7s" }}>
              <ellipse cx="100" cy="352" rx="58" ry="10" fill="#0b1220" stroke="#1e293b" strokeWidth="1.2" />
              <ellipse cx="100" cy="351" rx="58" ry="10" fill="none" stroke="url(#pr-gold)" strokeWidth="0.8" opacity="0.5" />
              <circle cx="52" cy="349" r="1.8" fill="#fbbf24" className="animate-twinkle" filter="url(#pr-glow)" />
              <circle cx="148" cy="349" r="1.8" fill="#fbbf24" className="animate-twinkle" filter="url(#pr-glow)" style={{ animationDelay: "1.1s" }} />
              <circle cx="100" cy="356" r="1.4" fill="#93c5fd" className="animate-twinkle" style={{ animationDelay: "2s" }} />
            </g>

            {/* ── Swept fins ── */}
            <path
              d="M72 246 C56 272, 42 304, 33 332 L52 336 C58 312, 66 292, 74 280 Z"
              fill="url(#pr-body)" stroke="#475569" strokeWidth="1.2"
            />
            <path d="M38 322 L50 326" stroke="url(#pr-gold)" strokeWidth="1.4" opacity="0.8" />
            <path
              d="M128 246 C144 272, 158 304, 167 332 L148 336 C142 312, 134 292, 126 280 Z"
              fill="url(#pr-body)" stroke="#475569" strokeWidth="1.2"
            />
            <path d="M162 322 L150 326" stroke="url(#pr-gold)" strokeWidth="1.4" opacity="0.8" />

            {/* ── Engine skirt ── */}
            <path d="M78 300 L72 328 L128 328 L122 300 Z" fill="#0b1220" stroke="#334155" strokeWidth="1.4" />
            <rect x="72" y="324" width="56" height="4" rx="2" fill="url(#pr-gold)" opacity="0.85" />
            <line x1="82" y1="302" x2="86" y2="324" stroke="#334155" strokeWidth="1" />
            <line x1="100" y1="302" x2="100" y2="324" stroke="#334155" strokeWidth="1" />
            <line x1="118" y1="302" x2="114" y2="324" stroke="#334155" strokeWidth="1" />

            {/* ── Fuselage ── */}
            <path
              d="M72 118 L72 300 L128 300 L128 118 Z"
              fill="url(#pr-body)" stroke="#64748b" strokeWidth="1.4"
            />

            {/* Golden ceremonial bands */}
            <rect x="72" y="126" width="56" height="5" fill="url(#pr-gold)" opacity="0.9" />
            <rect x="72" y="126" width="56" height="1.4" fill="#fef3c7" opacity="0.8" />
            <rect x="72" y="272" width="56" height="5" fill="url(#pr-gold)" opacity="0.9" />
            <rect x="72" y="272" width="56" height="1.4" fill="#fef3c7" opacity="0.8" />

            {/* Body specular highlight */}
            <path d="M79 132 L79 296" stroke="rgba(226,232,240,0.18)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M122 140 L122 292" stroke="rgba(2,6,23,0.35)" strokeWidth="2" strokeLinecap="round" />

            {/* ── Nose cone (ogive) ── */}
            <path
              d="M72 118 C74 72, 88 36, 100 24 C112 36, 126 72, 128 118 Z"
              fill="url(#pr-nose)" stroke="#f59e0b" strokeWidth="1.2"
            />
            <path d="M100 26 L100 118" stroke="rgba(254,243,199,0.5)" strokeWidth="1.2" />
            <path d="M76 100 C80 66, 90 40, 99 27" stroke="rgba(254,243,199,0.65)" strokeWidth="1.6" strokeLinecap="round" />

            {/* Memorial beacon at tip */}
            <circle cx="100" cy="20" r="7" fill="none" stroke="#fde68a" strokeWidth="0.9" opacity="0.5">
              <animate attributeName="r" values="5;10;5" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="20" r="3.4" fill="#ffffff" filter="url(#pr-glow)">
              <animate attributeName="opacity" values="0.85;1;0.85" dur="2.6s" repeatCount="indefinite" />
            </circle>

            {/* ── Luminous fuel capsule ── */}
            <rect x="86" y="138" width="28" height="124" rx="14" fill="#070b14" stroke="#334155" strokeWidth="1.6" />

            <g clipPath="url(#pr-capsule)">
              {/* Everything liquid bobs together like a real fluid */}
              <g className="animate-fuel-bob" style={{ transformBox: "fill-box" }}>
                {/* Liquid fuel with sliding wave surface */}
                <path d={waveD} fill="url(#pr-fuel)" className="rocket-wave-path" />
                {/* Meniscus glow line */}
                <rect x="86" y={surfaceY - 1} width="28" height="2.4" rx="1.2" fill="#fffbeb" opacity="0.85" filter="url(#pr-glow)" />

                {/* Rising light bubbles inside the fuel */}
                {fillH > 42 && (
                  <>
                    <circle cx="95" cy={surfaceY + 16} r="1.6" fill="#fef3c7" opacity="0.85" className="rocket-bubble" />
                    <circle cx="104" cy={surfaceY + 26} r="1.2" fill="#fde68a" opacity="0.7" className="rocket-bubble" style={{ animationDelay: "1.2s" }} />
                    <circle cx="100" cy={surfaceY + 36} r="1" fill="#fef3c7" opacity="0.6" className="rocket-bubble" style={{ animationDelay: "2.3s" }} />
                  </>
                )}

                {/* Click flash — warm white wash that settles back */}
                <rect
                  ref={flashRectRef}
                  x="86"
                  y={surfaceY}
                  width="28"
                  height={Math.max(0, fillH)}
                  rx="14"
                  fill="#fff7db"
                  opacity="0"
                  style={{ transition: "y 0.95s cubic-bezier(0.22,1,0.36,1), height 0.95s cubic-bezier(0.22,1,0.36,1)" }}
                />

                {/* Pulsing core heart */}
                <circle
                  ref={coreGlowRef}
                  cx="100"
                  cy={surfaceY + Math.max(10, fillH * 0.35)}
                  r="7"
                  fill="url(#pr-core)"
                  opacity={percentage > 0 ? 0.75 : 0}
                  filter="url(#pr-softglow)"
                  style={{ transition: "cy 0.95s cubic-bezier(0.22,1,0.36,1), opacity 0.6s" }}
                />
              </g>

              {/* Mask above the liquid (hides risen bubbles, keeps wave crests) */}
              <rect
                x="86"
                y="0"
                width="28"
                height={Math.max(0, surfaceY - 6)}
                fill="#070b14"
                style={{ transition: "height 0.95s cubic-bezier(0.22,1,0.36,1)" }}
              />
            </g>

            {/* Capsule glass rim + reflection */}
            <rect x="86" y="138" width="28" height="124" rx="14" fill="none" stroke="#64748b" strokeWidth="0.8" opacity="0.7" />
            <path d="M91 146 C91 160, 90 220, 91 252" stroke="rgba(226,232,240,0.28)" strokeWidth="2" strokeLinecap="round" />

            {/* Dorsal spine fin */}
            <path d="M98 252 L100 298 L102 252 Z" fill="#0b1220" stroke="#475569" strokeWidth="1" />

            {/* ── Thruster flame ── */}
            {showFlame && (
              <g
                ref={flameRef}
                style={{
                  transformOrigin: "100px 328px",
                  transform: isLaunching ? "scale(1.28, 1.45)" : "scale(0.85)",
                  transition: "transform 0.65s cubic-bezier(0.34, 1.3, 0.64, 1)",
                  opacity: isLaunching ? 1 : 0.8,
                }}
              >
                <polygon points="78,328 100,392 122,328" fill="url(#pr-flame)" className="animate-flame" filter="url(#pr-softglow)" />
                <polygon points="87,328 100,362 113,328" fill="#fffbeb" className="animate-flame-slow" />
                <ellipse cx="100" cy="331" rx="17" ry="5" fill="#fde68a" opacity="0.9" />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

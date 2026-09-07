"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { MissionState } from "@/types/campaign";

// Dynamic import for 3D Three.js scene (zero SSR overhead, client-only)
const ThreeRocketScene = dynamic(() => import("./ThreeRocketScene"), {
  ssr: false,
});

interface ParallaxRocketProps {
  fillPercentage: number;
  missionState: MissionState;
  isLaunching: boolean;
  hasLiftedOff: boolean;
  pulseTrigger: number;
  onFlightComplete?: () => void;
  onReady?: () => void;
}

export default function ParallaxRocket({
  fillPercentage,
  missionState,
  isLaunching,
  hasLiftedOff,
  pulseTrigger,
  onFlightComplete,
  onReady,
}: ParallaxRocketProps) {
  const [use3D, setUse3D] = useState(false);
  const [mounted, setMounted] = useState(false);
  const coreGlowRef = useRef<SVGCircleElement | null>(null);
  const flashRectRef = useRef<SVGRectElement | null>(null);
  const flameRef = useRef<SVGGElement | null>(null);

  const percentage = Math.min(100, Math.max(0, fillPercentage));
  const isReady = missionState === "READY_TO_LAUNCH" || percentage >= 100;

  // Check WebGL availability and user motion preference
  useEffect(() => {
    setMounted(true);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setUse3D(false);
      onReady?.();
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        setUse3D(true);
      } else {
        setUse3D(false);
        onReady?.();
      }
    } catch {
      setUse3D(false);
      onReady?.();
    }
  }, []);

  // ── Salawat pulse feedback for SVG fallback ──
  useEffect(() => {
    if (pulseTrigger === 0) return;
    const core = coreGlowRef.current;
    const flash = flashRectRef.current;
    const flame = flameRef.current;

    if (core) {
      core.animate(
        [
          { transform: "scale(1)", opacity: "0.75" },
          { transform: "scale(1.8)", opacity: "1" },
          { transform: "scale(1)", opacity: "0.75" },
        ],
        { duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }

    if (flash) {
      flash.animate(
        [
          { opacity: "0.45" },
          { opacity: "0" },
        ],
        { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }

    if (flame && (isReady || isLaunching)) {
      flame.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.05, 1.25)" },
          { transform: "scale(1, 1)" },
        ],
        { duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }
  }, [pulseTrigger, isReady, isLaunching]);

  // ── Fuel geometry (for 2.5D SVG fallback) ──
  const CAPSULE_TOP = 138;
  const CAPSULE_BOTTOM = 262;
  const CAPSULE_H = CAPSULE_BOTTOM - CAPSULE_TOP;
  const fillH = (CAPSULE_H * percentage) / 100;
  const surfaceY = CAPSULE_BOTTOM - fillH;

  const waveD = `M46 ${surfaceY.toFixed(2)} q4.5 -3.2 9 0${" t9 0".repeat(12)} L163 ${CAPSULE_BOTTOM} L46 ${CAPSULE_BOTTOM} Z`;
  const auraIntensity = Math.min(1, percentage / 100);
  const showFlame = isReady || isLaunching;

  return (
    <div className="w-full h-full relative flex items-center justify-center pointer-events-none select-none">
      {/* Primary 3D WebGL Scene: Seamless full-viewport canvas with native volumetric lighting */}
      {mounted && use3D ? (
        <div className="w-full h-full relative pointer-events-none">
          <ThreeRocketScene
            fillPercentage={percentage}
            missionState={missionState}
            isLaunching={isLaunching}
            hasLiftedOff={hasLiftedOff}
            pulseTrigger={pulseTrigger}
            onFlightComplete={onFlightComplete}
            onReady={onReady}
          />
        </div>
      ) : (
        /* Refined 2.5D SVG Fallback (Fast FCP / Reduced Motion / WebGL-off) */
        <div className="w-full h-full max-w-[260px] max-h-[480px] aspect-[10/21] mx-auto flex items-center justify-center relative">
          {/* Layered celestial aura strictly for 2.5D SVG fallback */}
          <div
            className="absolute -inset-6 rounded-full blur-2xl pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, rgba(96,165,250,${0.04 + auraIntensity * 0.08}) 0%, rgba(251,191,36,${auraIntensity * 0.18}) 45%, transparent 70%)`,
              transition: "background 1s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
          {isReady && (
            <div className="absolute -inset-8 rounded-full blur-2xl pointer-events-none animate-aura bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.22)_0%,transparent_65%)]" />
          )}

          {/* Ignition ground glow strictly for 2.5D SVG fallback */}
          {showFlame && (
            <div
              className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-44 h-8 rounded-[100%] blur-xl pointer-events-none transition-opacity duration-700 ${
                isLaunching ? "opacity-90" : "opacity-50"
              }`}
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(251,191,36,0.85) 0%, rgba(245,158,11,0.35) 45%, transparent 75%)",
              }}
            />
          )}
        <div
          className={`relative w-full h-full flex items-center justify-center ${
            hasLiftedOff
              ? "animate-rocket-launch"
              : "animate-float"
          }`}
          style={{
            transitionProperty: "opacity, transform",
            transitionDuration: "900ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div className={`relative w-full h-full ${isReady && !hasLiftedOff ? "animate-rocket-ready" : ""}`}>
            <svg
              viewBox="0 0 200 420"
              className="w-full h-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.6)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="pr-body" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#cfc9bb" />
                  <stop offset="28%" stopColor="#e6e0d2" />
                  <stop offset="52%" stopColor="#f5f0e6" />
                  <stop offset="74%" stopColor="#e6e0d2" />
                  <stop offset="100%" stopColor="#b8b2a3" />
                </linearGradient>

                <linearGradient id="pr-nose" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b8b2a3" />
                  <stop offset="35%" stopColor="#e6e0d2" />
                  <stop offset="60%" stopColor="#f5f0e6" />
                  <stop offset="100%" stopColor="#a39d8f" />
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

              {/* Launch pad */}
              <g opacity={hasLiftedOff ? 0 : 1} style={{ transition: "opacity 0.7s" }}>
                <ellipse cx="100" cy="352" rx="58" ry="10" fill="#0b1220" stroke="#1e293b" strokeWidth="1.2" />
                <ellipse cx="100" cy="351" rx="58" ry="10" fill="none" stroke="url(#pr-gold)" strokeWidth="0.8" opacity="0.5" />
              </g>

              {/* Swept fins */}
              <path
                d="M72 246 C56 272, 42 304, 33 332 L52 336 C58 312, 66 292, 74 280 Z"
                fill="#b8b2a3"
                stroke="#64748b"
                strokeWidth="1.2"
              />
              <path
                d="M128 246 C144 272, 158 304, 167 332 L148 336 C142 312, 134 292, 126 280 Z"
                fill="#b8b2a3"
                stroke="#64748b"
                strokeWidth="1.2"
              />

              {/* Thruster exhaust flame */}
              {showFlame && (
                <g ref={flameRef} className="animate-flame" style={{ transformOrigin: "100px 338px" }}>
                  <ellipse cx="100" cy="378" rx="20" ry="34" fill="url(#pr-flame)" opacity="0.45" filter="url(#pr-glow)" />
                  <path d="M88 338 C86 362, 94 388, 100 404 C106 388, 114 362, 112 338 Z" fill="url(#pr-flame)" filter="url(#pr-glow)" />
                  <path d="M93 338 C91 356, 97 376, 100 388 C103 376, 109 356, 107 338 Z" fill="#ffffff" opacity="0.85" />
                </g>
              )}

              {/* Engine nozzle */}
              <path d="M87 318 L83 338 L117 338 L113 318 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1.4" />
              <ellipse cx="100" cy="338" rx="17" ry="4" fill="#020617" stroke="#334155" strokeWidth="1" />

              {/* Lower fuselage skirt */}
              <path
                d="M72 246 L75 318 L125 318 L128 246 Z"
                fill="url(#pr-body)"
                stroke="#475569"
                strokeWidth="1.2"
              />

              {/* Lower golden collar */}
              <rect x="71" y="258" width="58" height="6" rx="3" fill="url(#pr-gold)" filter="url(#pr-glow)" />

              {/* Aerodynamic ogive nosecone */}
              <path
                d="M73 146 C74 96, 88 52, 100 24 C112 52, 126 96, 127 146 Z"
                fill="url(#pr-nose)"
                stroke="#475569"
                strokeWidth="1.2"
              />

              {/* Upper golden collar */}
              <rect x="71" y="136" width="58" height="6" rx="3" fill="url(#pr-gold)" filter="url(#pr-glow)" />

              {/* Golden apex tip */}
              <circle cx="100" cy="24" r="3.2" fill="#fbbf24" filter="url(#pr-glow)" />

              {/* ── Luminous fuel capsule ── */}
              <rect x="86" y="138" width="28" height="124" rx="14" fill="#070b14" stroke="#334155" strokeWidth="1.6" />

              <g clipPath="url(#pr-capsule)">
                <g className="animate-fuel-bob" style={{ transformBox: "fill-box" }}>
                  {/* Liquid fuel wave */}
                  <path d={waveD} fill="url(#pr-fuel)" className="rocket-wave-path" />
                  {/* Meniscus glow line - synchronized with RAF */}
                  <rect x="86" y={surfaceY - 1} width="28" height="2.4" rx="1.2" fill="#fffbeb" opacity="0.85" filter="url(#pr-glow)" />

                  {/* Rising light bubbles inside the fuel */}
                  {fillH > 35 && (
                    <>
                      <circle cx="95" cy={surfaceY + 16} r="1.6" fill="#fef3c7" opacity="0.85" className="rocket-bubble" />
                      <circle cx="104" cy={surfaceY + 26} r="1.2" fill="#fde68a" opacity="0.7" className="rocket-bubble" style={{ animationDelay: "1.2s" }} />
                    </>
                  )}

                  {/* Click flash without conflicting CSS transitions */}
                  <rect
                    ref={flashRectRef}
                    x="86"
                    y={surfaceY}
                    width="28"
                    height={Math.max(0, fillH)}
                    rx="14"
                    fill="#fff7db"
                    opacity="0"
                  />

                  {/* Pulsing core heart without conflicting CSS transitions */}
                  <circle
                    ref={coreGlowRef}
                    cx="100"
                    cy={surfaceY + Math.max(10, fillH * 0.35)}
                    r="7"
                    fill="url(#pr-core)"
                    opacity={percentage > 0 ? 0.75 : 0}
                    filter="url(#pr-softglow)"
                  />
                </g>

                {/* Mask above the liquid without conflicting CSS transitions */}
                <rect
                  x="86"
                  y="0"
                  width="28"
                  height={Math.max(0, surfaceY - 4)}
                  fill="#070b14"
                />
              </g>

              {/* Capsule glass rim + reflection */}
              <rect x="86" y="138" width="28" height="124" rx="14" fill="none" stroke="#64748b" strokeWidth="0.8" opacity="0.7" />
              <path d="M91 146 C91 160, 90 220, 91 252" stroke="rgba(226,232,240,0.28)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

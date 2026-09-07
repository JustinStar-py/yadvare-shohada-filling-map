"use client";

import React, { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);

  const percentage = Math.min(100, Math.max(0, fillPercentage));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSceneReady = () => {
    setIs3DReady(true);
    onReady?.();
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center pointer-events-none select-none">
      {/* Primary 3D WebGL Scene with smooth opacity fade-in */}
      {mounted && (
        <div
          className={`w-full h-full relative pointer-events-none transition-opacity duration-700 ease-out ${
            is3DReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <ThreeRocketScene
            fillPercentage={percentage}
            missionState={missionState}
            isLaunching={isLaunching}
            hasLiftedOff={hasLiftedOff}
            pulseTrigger={pulseTrigger}
            onFlightComplete={onFlightComplete}
            onReady={handleSceneReady}
          />
        </div>
      )}

      {/* Subtle celestial launchpad ambient glow while 3D engine initializes (ZERO 2D SVG rocket) */}
      {!is3DReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-amber-500/[0.07] blur-3xl animate-pulse" />
        </div>
      )}
    </div>
  );
}

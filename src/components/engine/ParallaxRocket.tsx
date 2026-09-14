"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MissionState, DroneMode } from "@/types/campaign";
import { useLiteMode } from "@/lib/client/quality";

// Dynamic import for 3D Three.js scene (zero SSR overhead, client-only)
const ThreeRocketScene = dynamic(() => import("./ThreeRocketScene"), {
  ssr: false,
});

import { MissileModel } from "./missile-catalog";

interface ParallaxRocketProps {
  fillPercentage: number;
  missionState: MissionState;
  isLaunching: boolean;
  hasLiftedOff: boolean;
  pulseTrigger: number;
  missileModel?: MissileModel;
  droneMode?: DroneMode;
  enable360Rotation?: boolean;
  enableIdleHover?: boolean;
  enableExhaustParticles?: boolean;
  enableCameraShake?: boolean;
  onFlightComplete?: () => void;
  onReady?: () => void;
}

export default function ParallaxRocket({
  fillPercentage,
  missionState,
  isLaunching,
  hasLiftedOff,
  pulseTrigger,
  missileModel,
  droneMode,
  enable360Rotation = true,
  enableIdleHover = true,
  enableExhaustParticles = true,
  enableCameraShake = true,
  onFlightComplete,
  onReady,
}: ParallaxRocketProps) {
  const [mounted, setMounted] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);
  const lite = useLiteMode();

  const percentage = Math.min(100, Math.max(0, fillPercentage));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSceneReady = () => {
    setIs3DReady(true);
    onReady?.();
  };

  // Lite mode: zero-GPU static fuel gauge (auto on very weak devices, manual via header toggle)
  if (lite) {
    return (
      <div className="w-full h-full relative flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
        <div className="relative w-16 sm:w-20 h-64 sm:h-80 rounded-full border border-amber-500/40 bg-slate-950/60 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.25)]">
          <div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-700 via-amber-400 to-amber-200 transition-[height] duration-700 ease-out"
            style={{ height: `${percentage}%` }}
          />
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-x-4 top-3 h-10 rounded-full bg-white/[0.07] blur-md" />
        </div>
      </div>
    );
  }

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
            missileModel={missileModel}
            droneMode={droneMode}
            enable360Rotation={enable360Rotation}
            enableIdleHover={enableIdleHover}
            enableExhaustParticles={enableExhaustParticles}
            enableCameraShake={enableCameraShake}
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

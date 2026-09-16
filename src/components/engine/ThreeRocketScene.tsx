"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MissionState, DroneMode } from "@/types/campaign";
import { MissileModel, getMissileConfig } from "./missile-catalog";
import { soundEngine } from "@/lib/client/procedural-audio";
import { SHOHADA_SHAHIDIEH_PROFILES } from "@/lib/data/shohada-shahidieh";
import {
  attachVisibilityPause,
  getDprCap,
  isMobileDevice,
  shouldUseAntialias,
} from "@/lib/client/quality";

interface ThreeRocketSceneProps {
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

const GOLD_COLOR = new THREE.Color("#f59e0b");
const GOLD_LIGHT = new THREE.Color("#fbbf24");
const TITANIUM_COLOR = new THREE.Color("#d4cec2");
const NOZZLE_COLOR = new THREE.Color("#1e2430");

// ── Flight Timeline Constants ──
const IGNITION_DUR = 1.2;          // 0.0s - 1.2s: Pad tremor & ignition build-up
const ASCENT_DUR = 22.0;           // 1.2s - 23.2s: Extended cinematic ascent
const ASCENT_END = IGNITION_DUR + ASCENT_DUR; // 23.2s
const SEP_DUR = 2.4;               // 23.2s - 25.6s: Stage separation
const SEP_END = ASCENT_END + SEP_DUR; // 25.6s
const BOOSTER_DESCENT_DUR = 7.0;   // 25.6s - 32.6s: Retro landing burn descent
const BOOSTER_LAND_TIME = SEP_END + BOOSTER_DESCENT_DUR; // 32.6s: لحظه فرود بوستر روی زمین
const TOUCHDOWN_DUR = 1.0;         // 32.6s - 33.6s: Dampening on pad ring
const REDOCK_START = BOOSTER_LAND_TIME + TOUCHDOWN_DUR; // 33.6s
const REDOCK_DUR = 3.2;            // 33.6s - 36.8s: Capsule docks
const SETTLE_DUR = 1.2;            // 36.8s - 38.0s: Settle
const FLIGHT_DURATION = REDOCK_START + REDOCK_DUR + SETTLE_DUR; // 38.0s

const PEAK_ALTITUDE = 22.0;
const BOOSTER_MID_Y = -0.49;

const CAM_SMOOTH_TAU = 0.14;
const POINTER_SMOOTH_TAU = 0.32;

// ── Vector Sticker Helpers for Reyhaneh ──
function drawStickerHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fillColor = "#ff4081",
  angle = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const s = size / 30;

  ctx.lineWidth = 14;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0, 10 * s);
  ctx.bezierCurveTo(-20 * s, -10 * s, -30 * s, 15 * s, 0, 32 * s);
  ctx.bezierCurveTo(30 * s, 15 * s, 20 * s, -10 * s, 0, 10 * s);
  ctx.stroke();

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(0, 10 * s);
  ctx.bezierCurveTo(-20 * s, -10 * s, -30 * s, 15 * s, 0, 32 * s);
  ctx.bezierCurveTo(30 * s, 15 * s, 20 * s, -10 * s, 0, 10 * s);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.beginPath();
  ctx.ellipse(-8 * s, 6 * s, 4 * s, 8 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStickerFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  petalColor = "#ffffff",
  centerColor = "#facc15"
) {
  ctx.save();
  ctx.translate(x, y);
  const petalR = size * 0.45;
  const dist = size * 0.55;

  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, petalR + 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, petalR + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, petalR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(-size * 0.1, -size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStickerButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  wingColor = "#a78bfa"
) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 40;

  ctx.lineWidth = 12;
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = wingColor;

  ctx.beginPath();
  ctx.ellipse(-16 * s, -14 * s, 18 * s, 13 * s, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(16 * s, -14 * s, 18 * s, 13 * s, 0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

  ctx.fillStyle = "#f472b6";
  ctx.beginPath();
  ctx.ellipse(-12 * s, 12 * s, 12 * s, 9 * s, 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(12 * s, 12 * s, 12 * s, 9 * s, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

  ctx.fillStyle = "#4c1d95";
  ctx.beginPath();
  ctx.ellipse(0, 0, 4 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#4c1d95";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-2 * s, -16 * s);
  ctx.quadraticCurveTo(-10 * s, -26 * s, -14 * s, -23 * s);
  ctx.moveTo(2 * s, -16 * s);
  ctx.quadraticCurveTo(10 * s, -26 * s, 14 * s, -23 * s);
  ctx.stroke();

  ctx.restore();
}

function drawStickerBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color = "#ec4899"
) {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 30;

  ctx.lineWidth = 12;
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-25 * s, -20 * s, -30 * s, 20 * s, 0, 5 * s);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(25 * s, -20 * s, 30 * s, 20 * s, 0, 5 * s);
  ctx.stroke();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 2 * s, 8 * s, 0, Math.PI * 2);
  ctx.fillStyle = "#f43f5e";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 7 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4 * s, 8 * s);
  ctx.lineTo(-18 * s, 28 * s);
  ctx.moveTo(4 * s, 8 * s);
  ctx.lineTo(18 * s, 28 * s);
  ctx.stroke();

  ctx.restore();
}

function drawStickerStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  color = "#fde047"
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 4;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  ctx.restore();
}

export default function ThreeRocketScene({
  fillPercentage,
  missionState,
  isLaunching,
  hasLiftedOff,
  pulseTrigger,
  missileModel = "kheibar",
  droneMode = "cinematic_explosion",
  enable360Rotation = true,
  enableIdleHover = true,
  enableExhaustParticles = true,
  enableCameraShake = true,
  onFlightComplete,
  onReady,
}: ThreeRocketSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<MissileModel>(missileModel);
  const droneModeRef = useRef<DroneMode>(droneMode);
  const onModelChangeRef = useRef<((model: MissileModel) => void) | null>(null);
  const onDroneModeChangeRef = useRef<((mode: DroneMode) => void) | null>(null);

  const enable360RotationRef = useRef(enable360Rotation);
  const enableIdleHoverRef = useRef(enableIdleHover);
  const enableExhaustParticlesRef = useRef(enableExhaustParticles);
  const enableCameraShakeRef = useRef(enableCameraShake);

  useEffect(() => { enable360RotationRef.current = enable360Rotation; }, [enable360Rotation]);
  useEffect(() => { enableIdleHoverRef.current = enableIdleHover; }, [enableIdleHover]);
  useEffect(() => { enableExhaustParticlesRef.current = enableExhaustParticles; }, [enableExhaustParticles]);
  useEffect(() => { enableCameraShakeRef.current = enableCameraShake; }, [enableCameraShake]);

  useEffect(() => {
    if (missileModel !== modelRef.current) {
      modelRef.current = missileModel;
      onModelChangeRef.current?.(missileModel);
    }
  }, [missileModel]);

  useEffect(() => {
    if (droneMode !== droneModeRef.current) {
      droneModeRef.current = droneMode;
      onDroneModeChangeRef.current?.(droneMode);
    }
  }, [droneMode]);

  const progressRef = useRef(fillPercentage / 100);
  const stateRef = useRef(missionState);
  const launchingRef = useRef(isLaunching);
  const liftedRef = useRef(hasLiftedOff);
  const pulseRef = useRef(0);
  const prevPulseTriggerRef = useRef(pulseTrigger);
  const onSalawatTriggerRef = useRef<(() => void) | null>(null);
  const onFlightCompleteRef = useRef(onFlightComplete);
  const onReadyRef = useRef(onReady);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onFlightCompleteRef.current = onFlightComplete; }, [onFlightComplete]);
  useEffect(() => { progressRef.current = Math.min(1, Math.max(0, fillPercentage / 100)); }, [fillPercentage]);
  useEffect(() => { stateRef.current = missionState; }, [missionState]);
  useEffect(() => { launchingRef.current = isLaunching; }, [isLaunching]);
  useEffect(() => { liftedRef.current = hasLiftedOff; }, [hasLiftedOff]);
  useEffect(() => {
    if (pulseTrigger > 0) {
      pulseRef.current = 1.0;
      if (pulseTrigger !== prevPulseTriggerRef.current) {
        prevPulseTriggerRef.current = pulseTrigger;
        onSalawatTriggerRef.current?.();
      }
    }
  }, [pulseTrigger]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = isMobileDevice();

    const scene = new THREE.Scene();
    const width = container.clientWidth || 240;
    const height = container.clientHeight || 460;
    const initAspect = width / height;
    const isWidescreenInit = initAspect > 1.15;
    const isPortraitMobInit = initAspect < 0.7;
    const initFov = isPortraitMobInit ? 38 : isWidescreenInit ? 30 : 32;
    const initZ = isPortraitMobInit ? 9.0 : isWidescreenInit ? 10.0 : 8.5;
    let currentBaseCameraY = isWidescreenInit ? 0.22 : isPortraitMobInit ? 0.1 : 0.15;

    const camera = new THREE.PerspectiveCamera(initFov, initAspect, 0.1, 100);
    camera.position.set(0, currentBaseCameraY, initZ);

    let renderer: THREE.WebGLRenderer;
    try {
      // No MSAA on mobile tile GPUs: DPR 1.25 already resolves all visible aliasing.
      renderer = new THREE.WebGLRenderer({ antialias: shouldUseAntialias(), alpha: true, powerPreference: "high-performance" });
    } catch { return; }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getDprCap()));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const rocketGroup = new THREE.Group();
    scene.add(rocketGroup);
    const boosterGroup = new THREE.Group();
    rocketGroup.add(boosterGroup);
    const capsuleGroup = new THREE.Group();
    rocketGroup.add(capsuleGroup);

    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.55);
    scene.add(ambientLight);
    const dirLightWarm = new THREE.DirectionalLight(0xfff6e5, 1.8);
    dirLightWarm.position.set(3.5, 5, 4.5);
    scene.add(dirLightWarm);
    const dirLightCool = new THREE.DirectionalLight(0x60a5fa, 0.85);
    dirLightCool.position.set(-3.5, 2, -2.5);
    scene.add(dirLightCool);

    const hullMaterial = new THREE.MeshStandardMaterial({ color: TITANIUM_COLOR, metalness: 0.58, roughness: 0.32 });
    const carbonMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#1a1f26"), metalness: 0.42, roughness: 0.55 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: GOLD_COLOR, emissive: GOLD_COLOR, emissiveIntensity: 0.45, metalness: 0.85, roughness: 0.22 });
    const nozzleMaterial = new THREE.MeshStandardMaterial({ color: NOZZLE_COLOR, metalness: 0.85, roughness: 0.38, side: THREE.DoubleSide });
    const fuelMaterial = new THREE.MeshStandardMaterial({ color: GOLD_COLOR, emissive: GOLD_COLOR, emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.92 });
    const meniscusMaterial = new THREE.MeshBasicMaterial({ color: 0xfffbeb, transparent: true, opacity: 0.95 });

    const noseStart = 0.55;
    const noseH = 1.35;
    const baseR = 0.32;

    const kheibarNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = baseR * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.06 * t);
      kheibarNosePts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * noseH));
    }
    const kheibarNoseGeo = new THREE.LatheGeometry(kheibarNosePts, 40);

    const fattahNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = baseR * Math.pow(1 - t, 0.72) * (1 + 0.08 * Math.sin(t * Math.PI));
      fattahNosePts.push(new THREE.Vector2(Math.max(r, 0.001), noseStart + t * 1.45));
    }
    const fattahNoseGeo = new THREE.LatheGeometry(fattahNosePts, 40);

    const sejjilNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = baseR * Math.sqrt(Math.max(0, 1 - t * t));
      sejjilNosePts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.25));
    }
    const sejjilNoseGeo = new THREE.LatheGeometry(sejjilNosePts, 40);

    const khorramshahrNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = t < 0.2 ? baseR * (1 + 0.05 * (1 - t * 5)) : baseR * (1 - (t - 0.2) * 1.08);
      khorramshahrNosePts.push(new THREE.Vector2(Math.max(r, 0.035), noseStart + t * 1.15));
    }
    const khorramshahrNoseGeo = new THREE.LatheGeometry(khorramshahrNosePts, 40);

    const emadNosePts: THREE.Vector2[] = [];
    emadNosePts.push(new THREE.Vector2(baseR * 1.05, noseStart));
    emadNosePts.push(new THREE.Vector2(baseR * 0.98, noseStart + 0.10));
    emadNosePts.push(new THREE.Vector2(baseR * 0.88, noseStart + 0.24));
    emadNosePts.push(new THREE.Vector2(baseR * 0.86, noseStart + 0.34));
    emadNosePts.push(new THREE.Vector2(baseR * 0.72, noseStart + 0.60));
    emadNosePts.push(new THREE.Vector2(baseR * 0.54, noseStart + 0.95));
    emadNosePts.push(new THREE.Vector2(baseR * 0.35, noseStart + 1.30));
    emadNosePts.push(new THREE.Vector2(baseR * 0.15, noseStart + 1.65));
    emadNosePts.push(new THREE.Vector2(0.012, noseStart + 1.82));
    const emadNoseGeo = new THREE.LatheGeometry(emadNosePts, 40);

    const reyhanehNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = baseR * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.8)));
      reyhanehNosePts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.32));
    }
    const reyhanehNoseGeo = new THREE.LatheGeometry(reyhanehNosePts, 40);

    const noseMesh = new THREE.Mesh(kheibarNoseGeo, hullMaterial);
    capsuleGroup.add(noseMesh);

    const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), goldMaterial);
    beaconMesh.position.set(0, noseStart + noseH, 0);
    capsuleGroup.add(beaconMesh);

    const upperCollar = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.005, 0.018, 14, 48), goldMaterial);
    upperCollar.rotation.x = Math.PI / 2;
    upperCollar.position.y = noseStart;
    capsuleGroup.add(upperCollar);

    const noseBand = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.008, 12, 40), goldMaterial);
    noseBand.rotation.x = Math.PI / 2;
    noseBand.position.y = noseStart + 1.05;
    capsuleGroup.add(noseBand);

    const kheibarCanardsGroup = new THREE.Group();
    const kheibarCanardShape = new THREE.Shape();
    kheibarCanardShape.moveTo(0, 0);
    kheibarCanardShape.lineTo(0.24, -0.16);
    kheibarCanardShape.lineTo(0, -0.22);
    kheibarCanardShape.closePath();
    const kheibarCanardGeo = new THREE.ExtrudeGeometry(kheibarCanardShape, { depth: 0.015, bevelEnabled: false });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      const m = new THREE.Mesh(kheibarCanardGeo, hullMaterial);
      m.position.set(baseR * 0.95, 0.46, -0.0075);
      arm.add(m);
      kheibarCanardsGroup.add(arm);
    }
    boosterGroup.add(kheibarCanardsGroup);

    const fattahGliderGroup = new THREE.Group();
    const fattahGliderShape = new THREE.Shape();
    fattahGliderShape.moveTo(0, 0);
    fattahGliderShape.lineTo(0.25, -0.10);
    fattahGliderShape.lineTo(0.18, -0.22);
    fattahGliderShape.lineTo(0, -0.22);
    fattahGliderShape.closePath();
    const fattahGliderGeo = new THREE.ExtrudeGeometry(fattahGliderShape, { depth: 0.015, bevelEnabled: false });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      const m = new THREE.Mesh(fattahGliderGeo, carbonMaterial);
      m.position.set(baseR * 0.95, noseStart + 0.12, -0.0075);
      arm.add(m);
      fattahGliderGroup.add(arm);
    }
    capsuleGroup.add(fattahGliderGroup);

    const sejjilRingsGroup = new THREE.Group();
    const sejjilRing1 = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.010, 0.018, 14, 48), goldMaterial);
    sejjilRing1.rotation.x = Math.PI / 2;
    sejjilRing1.position.y = -0.82;
    sejjilRingsGroup.add(sejjilRing1);
    const sejjilRing2 = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.010, 0.018, 14, 48), goldMaterial);
    sejjilRing2.rotation.x = Math.PI / 2;
    sejjilRing2.position.y = -1.05;
    sejjilRingsGroup.add(sejjilRing2);
    boosterGroup.add(sejjilRingsGroup);

    const khorramshahrCollarGroup = new THREE.Group();
    const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 1.08, baseR * 1.04, 0.10, 40), goldMaterial);
    collarMesh.position.y = noseStart + 0.06;
    khorramshahrCollarGroup.add(collarMesh);
    capsuleGroup.add(khorramshahrCollarGroup);

    const emadCanardsGroup = new THREE.Group();
    const emadCanardShape = new THREE.Shape();
    emadCanardShape.moveTo(0, 0.04);
    emadCanardShape.lineTo(0.26, -0.06);
    emadCanardShape.lineTo(0.24, -0.20);
    emadCanardShape.lineTo(0.12, -0.22);
    emadCanardShape.lineTo(0, -0.20);
    emadCanardShape.closePath();
    const emadCanardGeo = new THREE.ExtrudeGeometry(emadCanardShape, { depth: 0.016, bevelEnabled: false });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      const m = new THREE.Mesh(emadCanardGeo, hullMaterial);
      m.position.set(baseR * 0.86, noseStart + 0.26, -0.008);
      arm.add(m);
      emadCanardsGroup.add(arm);
    }
    const emadWaistRing = new THREE.Mesh(new THREE.TorusGeometry(baseR * 0.88, 0.014, 12, 40), goldMaterial);
    emadWaistRing.rotation.x = Math.PI / 2;
    emadWaistRing.position.y = noseStart + 0.24;
    emadCanardsGroup.add(emadWaistRing);
    capsuleGroup.add(emadCanardsGroup);

    const reyhanehAccessoriesGroup = new THREE.Group();
    const reyhanehRing = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.012, 0.016, 14, 48), goldMaterial);
    reyhanehRing.rotation.x = Math.PI / 2;
    reyhanehRing.position.y = noseStart + 0.05;
    reyhanehAccessoriesGroup.add(reyhanehRing);
    const charmMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), goldMaterial);
    charmMesh.position.set(baseR + 0.02, noseStart + 0.05, 0);
    reyhanehAccessoriesGroup.add(charmMesh);
    capsuleGroup.add(reyhanehAccessoriesGroup);

    const decalCanvas = document.createElement("canvas");
    decalCanvas.width = 512;
    decalCanvas.height = 2048;
    const decalCtx = decalCanvas.getContext("2d");
    const modelTexture = new THREE.CanvasTexture(decalCanvas);
    modelTexture.colorSpace = THREE.SRGBColorSpace;
    modelTexture.minFilter = THREE.LinearFilter;
    modelTexture.magFilter = THREE.LinearFilter;

    const renderDecalText = (model: MissileModel, textColor: string) => {
      if (!decalCtx) return;
      decalCtx.clearRect(0, 0, 512, 2048);
      decalCtx.save();
      decalCtx.translate(256, 1024);
      decalCtx.rotate(Math.PI / 2);

      if (model === "reyhaneh") {
        decalCtx.font = 'bold 125px "Comic Sans MS", "Arial Rounded MT Bold", "Vazirmatn", cursive, sans-serif';
        decalCtx.textAlign = "center";
        decalCtx.textBaseline = "middle";
        decalCtx.strokeStyle = "#ffffff";
        decalCtx.lineWidth = 22;
        decalCtx.strokeText("ریحانه 🌸 Reyhaneh", 0, -20);
        decalCtx.fillStyle = "#be185d";
        decalCtx.fillText("ریحانه 🌸 Reyhaneh", 0, -20);

        decalCtx.font = 'bold 75px "Vazirmatn", "Tahoma", sans-serif';
        decalCtx.strokeStyle = "#ffffff";
        decalCtx.lineWidth = 14;
        decalCtx.strokeText("دختران آسمانی ✨", 0, 85);
        decalCtx.fillStyle = "#db2777";
        decalCtx.fillText("دختران آسمانی ✨", 0, 85);

        drawStickerStar(decalCtx, -720, -50, 38, 14, "#fde047");
        drawStickerHeart(decalCtx, -580, 45, 42, "#ff4081", -0.2);
        drawStickerButterfly(decalCtx, -420, -60, 48, "#c084fc");
        drawStickerStar(decalCtx, -320, 70, 28, 10, "#fed7aa");
        drawStickerBow(decalCtx, 0, -135, 42, "#f43f5e");
        drawStickerFlower(decalCtx, -200, 80, 34, "#ffffff", "#fbbf24");
        drawStickerFlower(decalCtx, 200, -75, 36, "#fed7aa", "#f59e0b");
        drawStickerHeart(decalCtx, 360, 50, 40, "#fb7185", 0.3);
        drawStickerButterfly(decalCtx, 510, -50, 46, "#818cf8");
        drawStickerFlower(decalCtx, 640, 45, 38, "#fbcfe8", "#fbbf24");
        drawStickerStar(decalCtx, 750, -40, 32, 12, "#fde047");
      } else if (model === "emad") {
        decalCtx.fillStyle = textColor;
        decalCtx.font = '900 135px "Arial Black", "Impact", "Trebuchet MS", sans-serif';
        decalCtx.textAlign = "center";
        decalCtx.textBaseline = "middle";
        decalCtx.fillText("Emad Precision", 0, -15);

        decalCtx.font = 'bold 70px "Arial", sans-serif';
        decalCtx.fillStyle = "rgba(15, 23, 42, 0.75)";
        decalCtx.fillText("GUIDED WARHEAD · عماد", 0, 75);

        decalCtx.strokeStyle = "rgba(15, 23, 42, 0.75)";
        decalCtx.lineWidth = 10;
        decalCtx.beginPath();
        decalCtx.moveTo(-820, 0); decalCtx.lineTo(-720, 0);
        decalCtx.moveTo(720, 0); decalCtx.lineTo(820, 0);
        decalCtx.stroke();

        decalCtx.strokeStyle = "#0f172a";
        decalCtx.fillStyle = "#0f172a";
        decalCtx.lineWidth = 4;
        decalCtx.strokeRect(-550, -35, 70, 70);
        decalCtx.fillRect(-550, -35, 35, 35);
        decalCtx.fillRect(-515, 0, 35, 35);
      } else {
        decalCtx.fillStyle = textColor;
        decalCtx.font = '900 145px "Arial Black", "Impact", "Trebuchet MS", sans-serif';
        decalCtx.textAlign = "center";
        decalCtx.textBaseline = "middle";

        let text = "Kheibar Shecan";
        if (model === "fattah") text = "Fattah 1";
        else if (model === "sejjil") text = "Sejjil";
        else if (model === "khorramshahr") text = "Khorramshahr 4";

        decalCtx.fillText(text, 0, 0);

        decalCtx.strokeStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.75)";
        decalCtx.lineWidth = 10;
        decalCtx.beginPath();
        decalCtx.moveTo(-820, 0); decalCtx.lineTo(-720, 0);
        decalCtx.moveTo(720, 0); decalCtx.lineTo(820, 0);
        decalCtx.stroke();
      }

      decalCtx.restore();
      modelTexture.needsUpdate = true;
    };

    const modelDecalMat = new THREE.MeshBasicMaterial({
      map: modelTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
    });

    const decalPts: THREE.Vector2[] = [];
    for (let y = 0.62; y <= 1.48; y += 0.04) {
      const t = (y - noseStart) / noseH;
      const r = baseR * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.06 * t) + 0.010;
      decalPts.push(new THREE.Vector2(r, y));
    }
    const modelDecalArc = Math.PI * 0.40;
    const modelDecalGeo = new THREE.LatheGeometry(decalPts, 24, -modelDecalArc / 2, modelDecalArc);
    for (let i = 0; i < 4; i++) {
      const decalMesh = new THREE.Mesh(modelDecalGeo, modelDecalMat);
      decalMesh.rotation.y = (i * Math.PI) / 2;
      capsuleGroup.add(decalMesh);
    }

    const capsuleBase = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.98, baseR * 0.96, 0.03, 36), hullMaterial);
    capsuleBase.position.set(0, noseStart - 0.015, 0);
    capsuleGroup.add(capsuleBase);

    const capsuleRcsLight = new THREE.PointLight(GOLD_LIGHT, 0, 2.2);
    capsuleRcsLight.position.set(0, noseStart - 0.05, 0);
    capsuleGroup.add(capsuleRcsLight);

    const CHAMBER_H = 1.1;
    const CHAMBER_CENTER_Y = 0.0;
    const CHAMBER_BOTTOM_Y = CHAMBER_CENTER_Y - CHAMBER_H / 2;
    const chamberRadius = baseR;

    // Mobile: plain transparent standard material. MeshPhysicalMaterial with
    // transmission costs a full extra scene render pass on tile-based mobile GPUs.
    const translucentMetalMaterial: THREE.Material = isMobile
      ? new THREE.MeshStandardMaterial({
          color: 0xdde4ec,
          metalness: 0.82,
          roughness: 0.16,
          transparent: true,
          opacity: 0.44,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0xdde4ec,
          metalness: 0.82,
          roughness: 0.16,
          transparent: true,
          opacity: 0.44,
          transmission: 0.54,
          ior: 1.50,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

    const tankMetalCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(chamberRadius, chamberRadius, CHAMBER_H, 40, 1, true),
      translucentMetalMaterial
    );
    tankMetalCylinder.position.y = CHAMBER_CENTER_Y;
    boosterGroup.add(tankMetalCylinder);

    const tankStrutsGroup = new THREE.Group();
    const strutGeo = new THREE.CylinderGeometry(0.012, 0.012, CHAMBER_H, 10);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const strut = new THREE.Mesh(strutGeo, hullMaterial);
      strut.position.set(
        Math.cos(angle) * (chamberRadius + 0.003),
        CHAMBER_CENTER_Y,
        Math.sin(angle) * (chamberRadius + 0.003)
      );
      tankStrutsGroup.add(strut);
    }
    for (const ratio of [0.25, 0.5, 0.75]) {
      const ringY = CHAMBER_BOTTOM_Y + CHAMBER_H * ratio;
      const gaugeRing = new THREE.Mesh(
        new THREE.TorusGeometry(chamberRadius + 0.002, 0.005, 8, 36),
        goldMaterial
      );
      gaugeRing.rotation.x = Math.PI / 2;
      gaugeRing.position.y = ringY;
      tankStrutsGroup.add(gaugeRing);
    }
    boosterGroup.add(tankStrutsGroup);

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, CHAMBER_H, 16), hullMaterial);
    spine.position.set(0, CHAMBER_CENTER_Y, -chamberRadius * 0.62);
    boosterGroup.add(spine);

    const fuelRadius = chamberRadius * 0.91;
    const fuelGeometry = new THREE.CylinderGeometry(fuelRadius, fuelRadius, 1, 32);
    const fuelMesh = new THREE.Mesh(fuelGeometry, fuelMaterial);
    fuelMesh.position.set(0, CHAMBER_BOTTOM_Y, 0);
    boosterGroup.add(fuelMesh);

    const meniscusMesh = new THREE.Mesh(new THREE.CylinderGeometry(fuelRadius * 0.98, fuelRadius * 0.98, 0.015, 32), meniscusMaterial);
    meniscusMesh.position.set(0, CHAMBER_BOTTOM_Y, 0);
    boosterGroup.add(meniscusMesh);

    const fuelCoreLight = new THREE.PointLight(GOLD_LIGHT, 0.8, 3.5);
    fuelCoreLight.position.set(0, CHAMBER_BOTTOM_Y, 0);
    boosterGroup.add(fuelCoreLight);

    const lowerCollar = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.005, 0.018, 14, 48), goldMaterial);
    lowerCollar.rotation.x = Math.PI / 2;
    lowerCollar.position.y = CHAMBER_BOTTOM_Y;
    boosterGroup.add(lowerCollar);

    const skirtPts: THREE.Vector2[] = [
      new THREE.Vector2(0.24, -1.25), new THREE.Vector2(0.36, -1.15),
      new THREE.Vector2(0.34, -0.85), new THREE.Vector2(baseR, CHAMBER_BOTTOM_Y),
    ];
    const skirtGeometry = new THREE.LatheGeometry(skirtPts, 40);
    const skirtMesh = new THREE.Mesh(skirtGeometry, hullMaterial);
    boosterGroup.add(skirtMesh);

    const createIranFlagTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const h = 320 / 3;
        ctx.fillStyle = "#239f40";
        ctx.fillRect(0, 0, 512, h);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, h, 512, h);
        ctx.fillStyle = "#da0000";
        ctx.fillRect(0, h * 2, 512, h);

        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 508, 316);

        ctx.save();
        ctx.translate(256, 160);
        ctx.fillStyle = "#da0000";
        ctx.strokeStyle = "#da0000";

        ctx.beginPath();
        ctx.arc(0, -20, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.rect(-3.5, -9, 7, 44);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-13, 10, 22, 0.38 * Math.PI, 1.48 * Math.PI);
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(13, 10, 22, -0.48 * Math.PI, 0.62 * Math.PI);
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.restore();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    };

    const flagTexture = createIranFlagTexture();
    const flagMaterial = new THREE.MeshBasicMaterial({
      map: flagTexture,
      transparent: true,
      side: THREE.FrontSide,
    });
    const flagBackMaterial = new THREE.MeshBasicMaterial({
      map: flagTexture,
      transparent: true,
      side: THREE.FrontSide,
    });

    const createIranTextTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 256, 64);
        ctx.fillStyle = "#000000";
        ctx.font = '900 36px "Arial Black", "Impact", "Trebuchet MS", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("I.R. IRAN", 128, 32);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const iranTextTexture = createIranTextTexture();
    const iranTextMat = new THREE.MeshBasicMaterial({
      map: iranTextTexture,
      transparent: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const iranTextBackMat = new THREE.MeshBasicMaterial({
      map: iranTextTexture,
      transparent: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const flagGeom = new THREE.PlaneGeometry(0.18, 0.115);
    const textGeom = new THREE.PlaneGeometry(0.16, 0.04);

    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0); finShape.lineTo(0.52, -0.38);
    finShape.lineTo(0.52, -0.62); finShape.lineTo(0, -0.62); finShape.closePath();
    const finExtrudeGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
    const finGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(finExtrudeGeom, hullMaterial);
      fin.position.set(0.3, -0.6, -0.017);

      if (i === 0 || i === 2) {
        const frontFlag = new THREE.Mesh(flagGeom, flagMaterial);
        frontFlag.position.set(0.26, -0.44, 0.049);
        fin.add(frontFlag);

        const backFlag = new THREE.Mesh(flagGeom, flagBackMaterial);
        backFlag.position.set(0.26, -0.44, -0.014);
        backFlag.rotation.y = Math.PI;
        fin.add(backFlag);

        const frontText = new THREE.Mesh(textGeom, iranTextMat);
        frontText.position.set(0.26, -0.525, 0.049);
        fin.add(frontText);

        const backText = new THREE.Mesh(textGeom, iranTextBackMat);
        backText.position.set(0.26, -0.525, -0.014);
        backText.rotation.y = Math.PI;
        fin.add(backText);
      }

      const finArm = new THREE.Group();
      finArm.rotation.y = angle;
      finArm.add(fin);
      finGroup.add(finArm);
    }
    boosterGroup.add(finGroup);

    const emadBaseFinShape = new THREE.Shape();
    emadBaseFinShape.moveTo(0, 0.06);
    emadBaseFinShape.lineTo(0.38, -0.16);
    emadBaseFinShape.lineTo(0.60, -0.42);
    emadBaseFinShape.lineTo(0.60, -0.64);
    emadBaseFinShape.lineTo(0.16, -0.64);
    emadBaseFinShape.lineTo(0, -0.56);
    emadBaseFinShape.closePath();
    const emadBaseFinGeom = new THREE.ExtrudeGeometry(emadBaseFinShape, {
      depth: 0.038,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 2,
    });
    const emadFinGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(emadBaseFinGeom, hullMaterial);
      fin.position.set(0.3, -0.6, -0.019);

      if (i === 0 || i === 2) {
        const frontFlag = new THREE.Mesh(flagGeom, flagMaterial);
        frontFlag.position.set(0.28, -0.44, 0.051);
        fin.add(frontFlag);

        const backFlag = new THREE.Mesh(flagGeom, flagBackMaterial);
        backFlag.position.set(0.28, -0.44, -0.014);
        backFlag.rotation.y = Math.PI;
        fin.add(backFlag);

        const frontText = new THREE.Mesh(textGeom, iranTextMat);
        frontText.position.set(0.28, -0.525, 0.051);
        fin.add(frontText);

        const backText = new THREE.Mesh(textGeom, iranTextBackMat);
        backText.position.set(0.28, -0.525, -0.014);
        backText.rotation.y = Math.PI;
        fin.add(backText);
      }

      const finArm = new THREE.Group();
      finArm.rotation.y = angle;
      finArm.add(fin);
      emadFinGroup.add(finArm);
    }
    boosterGroup.add(emadFinGroup);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.28, 32, 1, true), nozzleMaterial);
    nozzle.position.set(0, -1.39, 0);
    boosterGroup.add(nozzle);

    const thrusterLight = new THREE.PointLight(GOLD_LIGHT, 0, 4);
    thrusterLight.position.set(0, -1.55, 0);
    boosterGroup.add(thrusterLight);

    const machConeGeo = new THREE.ConeGeometry(0.12, 0.7, 16, 1, true);
    const machConeMat = new THREE.MeshBasicMaterial({ color: GOLD_LIGHT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const machCone = new THREE.Mesh(machConeGeo, machConeMat);
    machCone.position.set(0, -1.75, 0);
    machCone.rotation.x = Math.PI;
    boosterGroup.add(machCone);

    const machDiamondGeo = new THREE.ConeGeometry(0.07, 0.38, 14, 1, true);
    const machDiamondMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const machDiamond = new THREE.Mesh(machDiamondGeo, machDiamondMat);
    machDiamond.position.set(0, -1.6, 0);
    machDiamond.rotation.x = Math.PI;
    boosterGroup.add(machDiamond);

    const stagingFlashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const stagingFlash = new THREE.Mesh(new THREE.RingGeometry(baseR - 0.02, baseR + 0.15, 36), stagingFlashMat);
    stagingFlash.rotation.x = -Math.PI / 2;
    stagingFlash.position.set(0, noseStart, 0);
    rocketGroup.add(stagingFlash);

    const dockingFlashMat = new THREE.MeshBasicMaterial({ color: GOLD_LIGHT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const dockingFlash = new THREE.Mesh(new THREE.RingGeometry(baseR - 0.02, baseR + 0.18, 36), dockingFlashMat);
    dockingFlash.rotation.x = -Math.PI / 2;
    dockingFlash.position.set(0, noseStart, 0);
    rocketGroup.add(dockingFlash);

    const haloGeo = new THREE.TorusGeometry(0.55, 0.025, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({ color: GOLD_LIGHT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.y = 0.6;
    rocketGroup.add(haloRing);

    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.62, 48),
      new THREE.MeshBasicMaterial({ color: GOLD_COLOR, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, -1.65, 0);
    scene.add(padRing);

    // ── Shahed 136 Drone Engine, Launch Rail & Detonation Systems ──
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      metalness: 0.65,
      roughness: 0.45,
    });

    const launchRailGroup = new THREE.Group();
    launchRailGroup.visible = false;
    scene.add(launchRailGroup);

    // 1. Ground base skid & frame
    const baseSkid = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 2.6), railMat);
    baseSkid.position.set(0, -1.65, -0.2);
    launchRailGroup.add(baseSkid);

    // 2. Inclined guide rails (~24 deg launch pitch)
    const railPitch = -0.42;
    const railsSubGroup = new THREE.Group();
    railsSubGroup.position.set(0, -1.55, -0.2);
    railsSubGroup.rotation.x = railPitch;
    launchRailGroup.add(railsSubGroup);

    const railBeamLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 3.4), railMat);
    railBeamLeft.position.set(-0.28, 0.15, 0);
    railsSubGroup.add(railBeamLeft);

    const railBeamRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 3.4), railMat);
    railBeamRight.position.set(0.28, 0.15, 0);
    railsSubGroup.add(railBeamRight);

    // Hydraulic lift struts
    const pistonLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12), goldMaterial);
    pistonLeft.position.set(-0.32, -0.85, 0.2);
    pistonLeft.rotation.x = 0.55;
    launchRailGroup.add(pistonLeft);

    const pistonRight = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12), goldMaterial);
    pistonRight.position.set(0.32, -0.85, 0.2);
    pistonRight.rotation.x = 0.55;
    launchRailGroup.add(pistonRight);

    // ── Shahed 136 Materials ──
    const droneShellMaterial = new THREE.MeshStandardMaterial({
      color: "#8eb8dc",
      metalness: 0.35,
      roughness: 0.42,
    });
    const droneWarheadMaterial = new THREE.MeshStandardMaterial({
      color: "#1e3a8a",
      metalness: 0.4,
      roughness: 0.35,
    });
    const droneDarkMaterial = new THREE.MeshStandardMaterial({
      color: "#1e293b",
      metalness: 0.6,
      roughness: 0.35,
    });
    const droneGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: "#d8f3ff",
      transparent: true,
      opacity: 0.28,
      metalness: 0.05,
      roughness: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const navRedMaterial = new THREE.MeshBasicMaterial({ color: "#ef4444" });
    const navGreenMaterial = new THREE.MeshBasicMaterial({ color: "#34d399" });

    // Helper to build a high-fidelity Shahed 136 3D model
    const buildShahedDroneObject = (scale = 1.0) => {
      const droneRoot = new THREE.Group();
      droneRoot.scale.setScalar(scale);

      const droneBody = new THREE.Group();
      droneRoot.add(droneBody);

      // 1. Delta Wing with rear cutout notch for pusher propeller
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, -2.7);
      wingShape.lineTo(3.1, 1.65);
      wingShape.lineTo(0.65, 1.25);
      wingShape.lineTo(0, 0.8);
      wingShape.lineTo(-0.65, 1.25);
      wingShape.lineTo(-3.1, 1.65);
      wingShape.closePath();

      const wingGeom = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
        steps: 1,
      });
      const wingMesh = new THREE.Mesh(wingGeom, droneShellMaterial);
      wingMesh.position.set(0, -0.12, 0);
      wingMesh.rotation.x = Math.PI / 2;
      droneBody.add(wingMesh);

      // 1b. Dark navy warhead triangular nose cap & aerodynamic radome cone
      const warheadShape = new THREE.Shape();
      warheadShape.moveTo(0, -2.72);
      warheadShape.lineTo(0.55, -1.8);
      warheadShape.lineTo(-0.55, -1.8);
      warheadShape.closePath();

      const warheadGeom = new THREE.ExtrudeGeometry(warheadShape, {
        depth: 0.108,
        bevelEnabled: true,
        bevelThickness: 0.042,
        bevelSize: 0.042,
        bevelSegments: 2,
        steps: 1,
      });
      const warheadMesh = new THREE.Mesh(warheadGeom, droneWarheadMaterial);
      warheadMesh.position.set(0, -0.124, 0);
      warheadMesh.rotation.x = Math.PI / 2;
      droneBody.add(warheadMesh);

      const noseConeGeom = new THREE.ConeGeometry(0.35, 0.94, 24);
      noseConeGeom.rotateX(-Math.PI / 2);
      const noseCone = new THREE.Mesh(noseConeGeom, droneWarheadMaterial);
      noseCone.position.set(0, 0.16, -2.24);
      droneBody.add(noseCone);

      // 2. Transparent aerodynamic canopy along the spine
      const glassCanopy = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), droneGlassMaterial);
      glassCanopy.scale.set(0.53, 0.48, 2.3);
      glassCanopy.position.set(0, 0.3, -0.35);
      glassCanopy.renderOrder = 2;
      droneBody.add(glassCanopy);

      // 3. Tank chassis bed & internal fuel cell
      const chassisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 2.55), droneDarkMaterial);
      chassisMesh.position.set(0, 0.04, -0.3);
      droneBody.add(chassisMesh);

      const droneFuelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 2.4), fuelMaterial);
      droneFuelMesh.position.set(0, 0.07, -0.3);
      droneBody.add(droneFuelMesh);

      // 4. Reinforcing torus frame rings
      for (const z of [-1.48, -0.3, 0.88]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 8, 36), droneShellMaterial);
        ring.position.set(0, 0.28, z);
        ring.scale.set(1, 0.85, 1);
        droneBody.add(ring);
      }

      // 5. Twin vertical stabilizers (fins) with green and red navigation lights
      for (const side of [-1, 1]) {
        const finShape = new THREE.Shape();
        finShape.moveTo(-0.5, 0);
        finShape.lineTo(0.45, 0);
        finShape.lineTo(0.2, 0.85);
        finShape.closePath();

        const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });
        const fin = new THREE.Mesh(finGeom, droneShellMaterial);
        fin.position.set(side * 2.85, -0.05, 1.15);
        fin.rotation.y = Math.PI / 2;
        droneBody.add(fin);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.065, 12, 8),
          side < 0 ? navRedMaterial : navGreenMaterial
        );
        navLight.position.set(side * 3.0, 0.04, 1.58);
        navLight.scale.y = 0.7;
        droneBody.add(navLight);
      }

      // 6. Rear pusher propeller assembly with spherical hub and cross blades
      const propellerGroup = new THREE.Group();
      propellerGroup.position.set(0, 0.3, 2.05);
      droneBody.add(propellerGroup);

      const propHub = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), droneDarkMaterial);
      propellerGroup.add(propHub);

      const propBlades = new THREE.Group();
      propellerGroup.add(propBlades);

      for (let i = 0; i < 2; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.09, 0.05), droneDarkMaterial);
        blade.rotation.z = i * Math.PI / 2;
        propBlades.add(blade);
      }

      // Orient drone body:
      // Nose at -Z -> rotate around X by Math.PI / 2 so nose is +Y, dorsal canopy is +Z, rear is -Y
      droneBody.rotation.x = Math.PI / 2;
      droneBody.scale.setScalar(0.40);

      return {
        root: droneRoot,
        propBlade: propBlades,
        droneFuelMesh,
        droneBody,
      };
    };

    // ── Scenario 2 Drone (Cinematic Flight & Kamikaze Explosion) ──
    const shahedFlightGroup = new THREE.Group();
    shahedFlightGroup.visible = false;
    rocketGroup.add(shahedFlightGroup);

    const singleShahedDrone = buildShahedDroneObject(1.0);
    singleShahedDrone.root.position.set(0, -0.35, 0);
    shahedFlightGroup.add(singleShahedDrone.root);

    // ── Scenario 1 Drone Rack (Swarm of 3 Drones in Queue) ──
    const shahedSwarmGroup = new THREE.Group();
    shahedSwarmGroup.visible = false;
    scene.add(shahedSwarmGroup);

    const swarmDrones: ReturnType<typeof buildShahedDroneObject>[] = [];
    const rackSlotOffsets = [
      new THREE.Vector3(0, -0.45, 0.38),   // Slot 0 (Front, ready on rail)
      new THREE.Vector3(0, -0.76, -0.32),  // Slot 1 (Mid on rail)
      new THREE.Vector3(0, -1.07, -1.02),  // Slot 2 (Rear on rail)
    ];

    for (let i = 0; i < 3; i++) {
      const drone = buildShahedDroneObject(0.85);
      drone.root.position.copy(rackSlotOffsets[i]);
      drone.root.rotation.x = railPitch;
      shahedSwarmGroup.add(drone.root);
      swarmDrones.push(drone);
    }

    // Active projectiles launched from swarm
    interface FlyingDroneProjectile {
      group: THREE.Group;
      vel: THREE.Vector3;
      propBlade: THREE.Object3D;
      life: number;
      maxLife: number;
    }
    const flyingProjectiles: FlyingDroneProjectile[] = [];

    // ── Kamikaze Detonation System (Debris, Shockwave, Light, Shake) ──
    const EXPLOSION_DEBRIS_COUNT = 90;
    const debrisPos = new Float32Array(EXPLOSION_DEBRIS_COUNT * 3);
    const debrisVel = new Float32Array(EXPLOSION_DEBRIS_COUNT * 3);
    const debrisLife = new Float32Array(EXPLOSION_DEBRIS_COUNT);
    const debrisMaxLife = new Float32Array(EXPLOSION_DEBRIS_COUNT);
    const debrisSize = new Float32Array(EXPLOSION_DEBRIS_COUNT);

    const debrisGeo = new THREE.BufferGeometry();
    debrisGeo.setAttribute("position", new THREE.BufferAttribute(debrisPos, 3));
    debrisGeo.setAttribute("size", new THREE.BufferAttribute(debrisSize, 1));

    const debrisMat = new THREE.PointsMaterial({
      color: 0xff6611,
      size: 0.22,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const debrisPoints = new THREE.Points(debrisGeo, debrisMat);
    scene.add(debrisPoints);

    const shockwaveGeo = new THREE.RingGeometry(0.1, 0.45, 36);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xfff7ed,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    scene.add(shockwaveMesh);

    const detonationLight = new THREE.PointLight(0xffeedd, 0, 45, 1.2);
    scene.add(detonationLight);

    let hasDetonated = false;
    let cameraShakeIntensity = 0;

    const triggerKamikazeExplosion = (worldY: number) => {
      hasDetonated = true;
      singleShahedDrone.root.visible = false;
      cameraShakeIntensity = 0.42;

      const blastPos = new THREE.Vector3(0, worldY, 0);
      detonationLight.position.copy(blastPos);
      detonationLight.intensity = 22;

      shockwaveMesh.position.copy(blastPos);
      shockwaveMesh.scale.set(1, 1, 1);
      shockwaveMat.opacity = 1.0;

      for (let i = 0; i < EXPLOSION_DEBRIS_COUNT; i++) {
        debrisPos[i * 3] = blastPos.x;
        debrisPos[i * 3 + 1] = blastPos.y;
        debrisPos[i * 3 + 2] = blastPos.z;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const spd = 3.2 + Math.random() * 8.5;
        debrisVel[i * 3] = Math.sin(phi) * Math.cos(theta) * spd;
        debrisVel[i * 3 + 1] = Math.cos(phi) * spd * 0.85 + 2.2;
        debrisVel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * spd;

        debrisLife[i] = 0;
        debrisMaxLife[i] = 1.8 + Math.random() * 2.2;
        debrisSize[i] = 0.15 + Math.random() * 0.25;
      }
      debrisGeo.attributes.position.needsUpdate = true;
      debrisGeo.attributes.size.needsUpdate = true;
      debrisMat.opacity = 1.0;

      // Spawn puff of black & orange fireball smoke
      for (let k = 0; k < 22; k++) {
        const a = Math.random() * Math.PI * 2;
        spawnSmoke(
          blastPos.x + Math.cos(a) * 0.15, blastPos.y, blastPos.z + Math.sin(a) * 0.15,
          Math.cos(a) * 1.8, (Math.random() - 0.2) * 1.4, Math.sin(a) * 1.8,
          2.0 + Math.random() * 1.5, 0.22, 0.9, false
        );
      }

      soundEngine.playDroneKamikazeExplosion();
    };

    // Trigger Salawat Swarm Launch (fires 1 drone from front of rack)
    const launchSwarmDrone = () => {
      const proj = buildShahedDroneObject(0.85);
      proj.root.position.copy(rackSlotOffsets[0]);
      proj.root.rotation.x = railPitch;
      scene.add(proj.root);

      flyingProjectiles.push({
        group: proj.root,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          7.2 + Math.random() * 1.2,
          -(3.2 + Math.random() * 1.2)
        ),
        propBlade: proj.propBlade,
        life: 0,
        maxLife: 2.5,
      });

      // Spawn launch booster smoke puff
      spawnSmoke(
        rackSlotOffsets[0].x, rackSlotOffsets[0].y - 0.1, rackSlotOffsets[0].z - 0.2,
        0, 0.2, 0.4, 0.8, 0.18, 0.7, true
      );

      soundEngine.playDroneLaunch();

      // Quick visual bump / reload recoil on slot 1 and 2
      if (swarmDrones[1]) swarmDrones[1].root.position.y += 0.04;
      if (swarmDrones[2]) swarmDrones[2].root.position.y += 0.04;
    };

    onSalawatTriggerRef.current = () => {
      if (modelRef.current === "shahed136" && droneModeRef.current === "swarm_salawat") {
        launchSwarmDrone();
      }
    };

    // ── 3D Memorial Tunnel in the Sky ──
    const MEMORIAL_TEXTS = [
      { lines: ["شهدا زنده‌اند"], y: 3, side: 1 },
      { lines: ["به یاد شهدای والامقام", "قهرمان شهیدیه"], y: 7.5, side: -1 },
      { lines: ["راه سرخ شهادت", "جاودانه و نورانی است"], y: 12.5, side: 1 },
      { lines: ["ستارگان درخشان آسمان", "ایثار و معرفت"], y: 17.5, side: -1 },
      { lines: ["صلوات بر محمد", "و آل محمد (ص)"], y: 21.5, side: 1 },
    ];

    interface MemorialBannerItem {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      targetY: number;
      baseZ: number;
      side: number;
      planeWidth: number;
    }

    const memorialBanners: MemorialBannerItem[] = [];

    const createMemorialBannerTexture = (lines: string[]): { texture: THREE.CanvasTexture; aspect: number } => {
      const isSingle = lines.length === 1;
      const fontSize = isSingle ? 76 : 60;

      const measureCanvas = document.createElement("canvas");
      const mCtx = measureCanvas.getContext("2d");
      let maxLineWidth = 380;
      if (mCtx) {
        mCtx.font = `bold ${fontSize}px Vazirmatn, Sahel, Shabnam, Tahoma, system-ui, sans-serif`;
        lines.forEach((lineText) => {
          const w = mCtx.measureText(lineText).width;
          if (w > maxLineWidth) maxLineWidth = w;
        });
      }

      const rawWidth = Math.ceil(maxLineWidth + 180);
      const canvasWidth = Math.min(1024, Math.max(480, Math.ceil(rawWidth / 32) * 32));
      const canvasHeight = isSingle ? 200 : 300;

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.direction = "rtl";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${fontSize}px Vazirmatn, Sahel, Shabnam, Tahoma, system-ui, sans-serif`;

        const textX = canvas.width / 2;
        const linePositions = isSingle
          ? [canvas.height / 2]
          : [canvas.height * 0.35, canvas.height * 0.72];

        lines.forEach((lineText, idx) => {
          const textY = linePositions[idx];

          ctx.shadowColor = "rgba(220, 38, 38, 0.95)";
          ctx.shadowBlur = 28;
          ctx.fillStyle = "rgba(239, 68, 68, 0.92)";
          ctx.fillText(lineText, textX, textY);

          ctx.shadowColor = "rgba(245, 158, 11, 0.95)";
          ctx.shadowBlur = 14;
          ctx.fillStyle = "rgba(251, 191, 36, 0.96)";
          ctx.fillText(lineText, textX, textY);

          ctx.shadowColor = "rgba(254, 240, 138, 0.85)";
          ctx.shadowBlur = 5;
          const textGrad = ctx.createLinearGradient(0, textY - fontSize * 0.6, 0, textY + fontSize * 0.6);
          textGrad.addColorStop(0.0, "#ffffff");
          textGrad.addColorStop(0.25, "#fef08a");
          textGrad.addColorStop(0.55, "#f59e0b");
          textGrad.addColorStop(0.85, "#ef4444");
          textGrad.addColorStop(1.0, "#b91c1c");
          ctx.fillStyle = textGrad;
          ctx.fillText(lineText, textX, textY);

          if (idx === 0) {
            ctx.font = "30px sans-serif";
            ctx.shadowColor = "rgba(251, 191, 36, 0.95)";
            ctx.shadowBlur = 12;
            ctx.fillStyle = "#fef08a";
            const metrics = ctx.measureText(lineText);
            const halfW = metrics.width / 2;
            ctx.fillText("✦", textX - halfW - 32, textY - 2);
            ctx.fillText("✦", textX + halfW + 32, textY - 2);
            ctx.font = `bold ${fontSize}px Vazirmatn, Sahel, Shabnam, Tahoma, system-ui, sans-serif`;
          }
        });
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return { texture, aspect: canvas.width / canvas.height };
    };

    MEMORIAL_TEXTS.forEach((item) => {
      const { texture, aspect } = createMemorialBannerTexture(item.lines);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const planeH = item.lines.length === 1 ? 0.36 : 0.48;
      const planeW = planeH * aspect * 0.98;
      const geo = new THREE.PlaneGeometry(planeW, planeH);
      const mesh = new THREE.Mesh(geo, mat);
      const initialZ = -0.5;
      mesh.position.set(item.side * 0.18, item.y, initialZ);
      mesh.scale.set(0.60, 0.60, 0.60);
      mesh.rotation.y = -item.side * 0.08;
      scene.add(mesh);
      memorialBanners.push({ mesh, mat, targetY: item.y, baseZ: initialZ, side: item.side, planeWidth: planeW });
    });

    // ── Cinematic Martyr Portrait Panels (ارتفاعات پایین‌تر، بدون کادر و با زاویه ملایم کج) ──
    interface MartyrPortraitItem {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      targetY: number;
      side: number;
      baseZ: number;
      tiltZ: number;
      tiltY: number;
    }

    const martyrPortraits: MartyrPortraitItem[] = [];

    const shuffled = [...SHOHADA_SHAHIDIEH_PROFILES]
      .map((p) => ({ p, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.p)
      .slice(0, 7);

    // ۱. ارتفاعات پایین‌تر (محدوده ۲٫۴ تا ۹٫۲ به جای ۱۵ و ۱۹)
    const portraitYPositions = [2.4, 3.6, 4.8, 6.0, 7.2, 8.2, 9.2];
    const portraitSides = [-1, 1, -1, 1, -1, 1, -1];
    // ۲. زوایای مایل و ارگانیک به چپ یا راست
    const portraitTiltsZ = [-0.09, 0.07, -0.06, 0.08, -0.07, 0.06, -0.08];

    shuffled.forEach((martyr, i) => {
      const targetY = portraitYPositions[i];
      const side = portraitSides[i];
      const tiltZ = portraitTiltsZ[i];
      const tiltY = -side * 0.12;

      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = 256;
      overlayCanvas.height = 320;
      const overlayCtx = overlayCanvas.getContext("2d");

      const overlayTexture = new THREE.CanvasTexture(overlayCanvas);
      overlayTexture.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.MeshBasicMaterial({
        map: overlayTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const W = 0.58, H = 0.72;
      const geo = new THREE.PlaneGeometry(W, H);
      const mesh = new THREE.Mesh(geo, mat);
      const baseZ = -0.55;
      mesh.position.set(side * 0.36, targetY, baseZ);
      mesh.rotation.set(0, tiltY, tiltZ);
      scene.add(mesh);

      martyrPortraits.push({ mesh, mat, targetY, side, baseZ, tiltZ, tiltY });

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!overlayCtx) return;
        overlayCtx.clearRect(0, 0, 256, 320);

        // پس‌زمینه گرد با گرادیانت نرم فید شونده (بدون خط بردر)
        const r = 24;
        overlayCtx.save();
        overlayCtx.beginPath();
        overlayCtx.moveTo(r, 0);
        overlayCtx.lineTo(256 - r, 0);
        overlayCtx.quadraticCurveTo(256, 0, 256, r);
        overlayCtx.lineTo(256, 320 - r);
        overlayCtx.quadraticCurveTo(256, 320, 256 - r, 320);
        overlayCtx.lineTo(r, 320);
        overlayCtx.quadraticCurveTo(0, 320, 0, 320 - r);
        overlayCtx.lineTo(0, r);
        overlayCtx.quadraticCurveTo(0, 0, r, 0);
        overlayCtx.closePath();
        overlayCtx.clip();

        // رسم تصویر شهید بدون بردر
        overlayCtx.drawImage(img, 0, 0, 256, 320);

        // فید تیره و گرادیانت ملایم پایینی فقط برای خوانایی نام شهید (بدون قاب مستطیلی)
        const nameGrad = overlayCtx.createLinearGradient(0, 200, 0, 320);
        nameGrad.addColorStop(0, "rgba(2, 6, 23, 0.0)");
        nameGrad.addColorStop(0.5, "rgba(2, 6, 23, 0.7)");
        nameGrad.addColorStop(1, "rgba(2, 6, 23, 0.95)");
        overlayCtx.fillStyle = nameGrad;
        overlayCtx.fillRect(0, 180, 256, 140);

        overlayCtx.restore();

        // متن نام در انتهای تصویر
        overlayCtx.direction = "rtl";
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";
        overlayCtx.font = "bold 23px Vazirmatn, Tahoma, sans-serif";

        overlayCtx.shadowColor = "rgba(0,0,0,0.9)";
        overlayCtx.shadowBlur = 10;
        overlayCtx.fillStyle = "#fef08a";
        overlayCtx.fillText(martyr.name.replace("شهید ", ""), 128, 282);

        overlayCtx.font = "bold 15px Vazirmatn, Tahoma, sans-serif";
        overlayCtx.shadowBlur = 6;
        overlayCtx.fillStyle = "rgba(251,191,36,0.9)";
        overlayCtx.fillText("شهید والامقام", 128, 304);

        overlayTexture.needsUpdate = true;
      };
      img.src = martyr.photoUrl;
    });

    const pointer = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
    const onPointerMove = (e: PointerEvent) => {
      if (prefersReducedMotion) return;
      pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const aspect = w / h;
      camera.aspect = aspect;

      if (aspect < 0.7) {
        camera.fov = 38;
        camera.position.z = 9.0;
        currentBaseCameraY = 0.1;
      } else if (aspect > 1.15) {
        camera.fov = 30;
        camera.position.z = 10.0;
        currentBaseCameraY = 0.22;
      } else {
        camera.fov = 32;
        camera.position.z = 8.5;
        currentBaseCameraY = 0.15;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    const FLAME_MAX = 90;
    const fX = new Float32Array(FLAME_MAX);
    const fY = new Float32Array(FLAME_MAX);
    const fZ = new Float32Array(FLAME_MAX);
    const fVX = new Float32Array(FLAME_MAX);
    const fVY = new Float32Array(FLAME_MAX);
    const fVZ = new Float32Array(FLAME_MAX);
    const fLife = new Float32Array(FLAME_MAX);
    const fMaxLife = new Float32Array(FLAME_MAX);
    const fSize = new Float32Array(FLAME_MAX);
    let flameCount = 0;

    const flameGeo = new THREE.BufferGeometry();
    const fPositions = new Float32Array(FLAME_MAX * 3);
    const fSizes = new Float32Array(FLAME_MAX);
    const fAlphas = new Float32Array(FLAME_MAX);
    flameGeo.setAttribute("position", new THREE.BufferAttribute(fPositions, 3));
    flameGeo.setAttribute("size", new THREE.BufferAttribute(fSizes, 1));
    flameGeo.setAttribute("alpha", new THREE.BufferAttribute(fAlphas, 1));

    const flameMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColorHot: { value: new THREE.Color("#fff7ed") }, uColorFlame: { value: new THREE.Color("#f59e0b") } },
      vertexShader: `
        attribute float size; attribute float alpha; varying float vAlpha;
        void main() { vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (260.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform vec3 uColorHot; uniform vec3 uColorFlame; varying float vAlpha;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
          float glow = exp(-d * d * 3.5); vec3 col = mix(uColorHot, uColorFlame, d * 0.85);
          gl_FragColor = vec4(col, glow * vAlpha); }`,
    });
    const flamePoints = new THREE.Points(flameGeo, flameMat);
    scene.add(flamePoints);

    const SMOKE_MAX = 220;
    const sX = new Float32Array(SMOKE_MAX);
    const sY = new Float32Array(SMOKE_MAX);
    const sZ = new Float32Array(SMOKE_MAX);
    const sVX = new Float32Array(SMOKE_MAX);
    const sVY = new Float32Array(SMOKE_MAX);
    const sVZ = new Float32Array(SMOKE_MAX);
    const sLife = new Float32Array(SMOKE_MAX);
    const sMaxLife = new Float32Array(SMOKE_MAX);
    const sStartSize = new Float32Array(SMOKE_MAX);
    const sEndSize = new Float32Array(SMOKE_MAX);
    const sIsPad = new Uint8Array(SMOKE_MAX);
    let smokeCount = 0;

    const smokeGeo = new THREE.BufferGeometry();
    const sPositions = new Float32Array(SMOKE_MAX * 3);
    const sSizes = new Float32Array(SMOKE_MAX);
    const sAlphas = new Float32Array(SMOKE_MAX);
    const sAges = new Float32Array(SMOKE_MAX);
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(sPositions, 3));
    smokeGeo.setAttribute("size", new THREE.BufferAttribute(sSizes, 1));
    smokeGeo.setAttribute("alpha", new THREE.BufferAttribute(sAlphas, 1));
    smokeGeo.setAttribute("age", new THREE.BufferAttribute(sAges, 1));

    const smokeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: { uHotColor: { value: new THREE.Color("#fbbf24") }, uCoolColor: { value: new THREE.Color("#cbd5e1") }, uAmbientColor: { value: new THREE.Color("#64748b") } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute float age; varying float vAlpha; varying float vAge;
        void main() { vAlpha = alpha; vAge = age; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (240.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform vec3 uHotColor; uniform vec3 uCoolColor; uniform vec3 uAmbientColor; varying float vAlpha; varying float vAge;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
          float density = exp(-d * d * 2.8) * (1.0 - smoothstep(0.65, 1.0, d));
          vec3 col = mix(uHotColor, uCoolColor, clamp(vAge * 2.2, 0.0, 1.0));
          col = mix(col, uAmbientColor, clamp((vAge - 0.4) * 1.5, 0.0, 0.35));
          gl_FragColor = vec4(col, density * vAlpha * 0.48); }`,
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smokePoints);

    const NOZZLE_LOCAL_Y = -1.39;
    const PAD_SURFACE_Y = -1.65;

    const spawnFlame = (x: number, y: number, z: number, vy: number, size: number, maxLife: number) => {
      if (flameCount >= FLAME_MAX) return;
      const i = flameCount++;
      fX[i] = x; fY[i] = y; fZ[i] = z;
      fVX[i] = (Math.random() - 0.5) * 0.04;
      fVY[i] = vy;
      fVZ[i] = (Math.random() - 0.5) * 0.04;
      fLife[i] = 0; fMaxLife[i] = maxLife; fSize[i] = size;
    };

    const spawnSmoke = (x: number, y: number, z: number, vx: number, vy: number, vz: number, maxLife: number, startSz: number, endSz: number, isPad: boolean) => {
      if (!enableExhaustParticlesRef.current) return;
      if (smokeCount >= SMOKE_MAX) return;
      const i = smokeCount++;
      sX[i] = x; sY[i] = y; sZ[i] = z;
      sVX[i] = vx; sVY[i] = vy; sVZ[i] = vz;
      sLife[i] = 0; sMaxLife[i] = maxLife;
      sStartSize[i] = startSz; sEndSize[i] = endSz;
      sIsPad[i] = isPad ? 1 : 0;
    };

    const spawnExhaust = (intensity: number, dt: number, isPadRoll: boolean) => {
      if (!enableExhaustParticlesRef.current) return;
      if (intensity <= 0.01) return;
      const rx = rocketGroup.position.x;
      const ry = rocketGroup.position.y;
      const rz = rocketGroup.position.z;
      const nozzleWorldY = ry + NOZZLE_LOCAL_Y;
      // Fewer live particles on mobile GPUs (same look, ~40% less overdraw).
      const spawnScale = isMobile ? 0.6 : 1;

      // Shahed-136 uses a 2-stroke MD-550 piston engine turning a rear pusher propeller
      // It has NO heavy ballistic rocket flame plume. Instead, it emits thin, light bluish-grey 2-stroke exhaust puffs
      // trailing the pusher propeller hub, plus a dense JATO booster cloud rolling off the pad/rail upon liftoff.
      if (modelRef.current === "shahed136") {
        if (isPadRoll) {
          const boosterN = Math.ceil(intensity * 7 * dt * 60 * spawnScale);
          for (let k = 0; k < boosterN; k++) {
            const a = Math.random() * Math.PI * 2;
            const spd = (0.5 + Math.random() * 1.1) * intensity;
            spawnSmoke(
              rx + Math.cos(a) * 0.1,
              PAD_SURFACE_Y + 0.05 + Math.random() * 0.06,
              rz + Math.sin(a) * 0.1,
              Math.cos(a) * spd,
              0.05 + Math.random() * 0.15,
              Math.sin(a) * spd,
              0.75 + Math.random() * 0.6,
              0.12,
              0.52,
              true
            );
          }
        }

        // 2-stroke moped exhaust puffs trailing behind the rear pusher propeller (local Z ~ +2.05)
        const droneSmokeN = Math.ceil(intensity * 6 * dt * 60 * spawnScale);
        for (let k = 0; k < droneSmokeN; k++) {
          const a = Math.random() * Math.PI * 2;
          const rad = 0.02 + Math.random() * 0.04;
          const propX = rx + Math.cos(a) * rad;
          const propY = ry - 0.05 + Math.sin(a) * rad;
          const propZ = rz + 2.05;
          spawnSmoke(
            propX,
            propY,
            propZ,
            (Math.random() - 0.5) * 0.18,
            -(0.25 + Math.random() * 0.45) * intensity,
            (0.85 + Math.random() * 1.3) * intensity,
            0.5 + Math.random() * 0.45,
            0.04,
            0.24,
            false
          );
        }
        return;
      }

      const flameN = Math.ceil(intensity * 12 * dt * 60 * spawnScale);
      for (let k = 0; k < flameN; k++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.random() * 0.04;
        spawnFlame(
          rx + Math.cos(a) * rad, nozzleWorldY - 0.02, rz + Math.sin(a) * rad,
          -(4.5 + Math.random() * 4.0) * intensity,
          0.045 + Math.random() * 0.045,
          0.12 + Math.random() * 0.12
        );
      }

      const smokeN = Math.ceil((intensity * 8 + (isPadRoll ? 6 : 0)) * dt * 60 * spawnScale);
      for (let k = 0; k < smokeN; k++) {
        if (isPadRoll) {
          const a = Math.random() * Math.PI * 2;
          const spd = (0.7 + Math.random() * 1.3) * intensity;
          spawnSmoke(rx + Math.cos(a) * 0.12, PAD_SURFACE_Y + 0.04 + Math.random() * 0.06, rz + Math.sin(a) * 0.12,
            Math.cos(a) * spd, 0.06 + Math.random() * 0.18, Math.sin(a) * spd,
            0.8 + Math.random() * 0.7, 0.14, 0.55 + Math.random() * 0.35, true);
        } else {
          const a = Math.random() * Math.PI * 2;
          const rad = 0.03 + Math.random() * 0.06;
          spawnSmoke(rx + Math.cos(a) * rad, nozzleWorldY - 0.08, rz + Math.sin(a) * rad,
            Math.cos(a) * rad * (0.6 + Math.random() * 0.8),
            -(2.0 + Math.random() * 2.5) * intensity,
            Math.sin(a) * rad * (0.6 + Math.random() * 0.8),
            0.65 + Math.random() * 0.55, 0.09, 0.45 + Math.random() * 0.3, false);
        }
      }
    };

    const easeInOutCubic = (x: number): number => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    let isSeparated = false;
    let capsuleExitedAtmosphere = false;
    let boosterLanded = false;
    let isDocked = false;

    const applyMissileModel = (model: MissileModel) => {
      const cfg = getMissileConfig(model);
      renderDecalText(model, cfg.textColor);

      hullMaterial.color.set(cfg.colorHex);
      hullMaterial.metalness = cfg.metalness;
      hullMaterial.roughness = cfg.roughness;

      fuelMaterial.color.set(cfg.fuelColor);
      fuelMaterial.emissive.set(cfg.fuelEmissive);
      fuelCoreLight.color.set(cfg.fuelColor);
      const meniscusColor = new THREE.Color(cfg.fuelColor).lerp(new THREE.Color("#ffffff"), 0.55);
      meniscusMaterial.color.copy(meniscusColor);
      flameMat.uniforms.uColorFlame.value.set(cfg.fuelColor);
      thrusterLight.color.set(cfg.fuelColor);
      machConeMat.color.set(cfg.fuelColor);

      if (model === "fattah") {
        noseMesh.geometry = fattahNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.45, 0);
      } else if (model === "sejjil") {
        noseMesh.geometry = sejjilNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.25, 0);
      } else if (model === "khorramshahr") {
        noseMesh.geometry = khorramshahrNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.15, 0);
      } else if (model === "emad") {
        noseMesh.geometry = emadNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.82, 0);
      } else if (model === "reyhaneh") {
        noseMesh.geometry = reyhanehNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.32, 0);
      } else {
        noseMesh.geometry = kheibarNoseGeo;
        beaconMesh.position.set(0, noseStart + noseH, 0);
      }
      noseMesh.material = hullMaterial;
      hullMaterial.needsUpdate = true;

      kheibarCanardsGroup.visible = model === "kheibar";
      fattahGliderGroup.visible = model === "fattah";
      sejjilRingsGroup.visible = model === "sejjil";
      khorramshahrCollarGroup.visible = model === "khorramshahr";
      emadCanardsGroup.visible = model === "emad";
      reyhanehAccessoriesGroup.visible = model === "reyhaneh";

      finGroup.visible = model !== "emad" && model !== "shahed136";
      emadFinGroup.visible = model === "emad";

      const isShahed = model === "shahed136";
      if (isShahed) {
        droneShellMaterial.color.set(cfg.colorHex);
        droneShellMaterial.needsUpdate = true;
        // Cool blue-grey moped 2-stroke exhaust smoke palette
        smokeMat.uniforms.uHotColor.value.set("#94a3b8");
        smokeMat.uniforms.uCoolColor.value.set("#cbd5e1");
        smokeMat.uniforms.uAmbientColor.value.set("#64748b");
      } else {
        // Fiery golden-amber rocket smoke palette
        smokeMat.uniforms.uHotColor.value.set("#fbbf24");
        smokeMat.uniforms.uCoolColor.value.set("#cbd5e1");
        smokeMat.uniforms.uAmbientColor.value.set("#64748b");
      }
      boosterGroup.visible = !isShahed;
      capsuleGroup.visible = !isShahed;
      padRing.visible = !isShahed;
      machCone.visible = !isShahed;
      machDiamond.visible = !isShahed;
      haloRing.visible = !isShahed;

      launchRailGroup.visible = isShahed;
      shahedFlightGroup.visible = isShahed && droneModeRef.current === "cinematic_explosion";
      shahedSwarmGroup.visible = isShahed && droneModeRef.current === "swarm_salawat";
    };

    onDroneModeChangeRef.current = (mode: DroneMode) => {
      const isShahed = modelRef.current === "shahed136";
      shahedFlightGroup.visible = isShahed && mode === "cinematic_explosion";
      shahedSwarmGroup.visible = isShahed && mode === "swarm_salawat";
      launchRailGroup.visible = isShahed;
    };

    onModelChangeRef.current = applyMissileModel;
    applyMissileModel(modelRef.current);

    let animId = 0;
    // Fully parked while off-screen / tab hidden: no pending rAF, the
    // CPU/GPU and radio can actually sleep (critical on Android).
    let isInView = typeof document === "undefined" ? true : !document.hidden;
    const kick = () => {
      if (animId === 0 && isInView) animId = requestAnimationFrame(animate);
    };
    let lastTime = performance.now();
    const startTime = performance.now();
    let wasLifted = false;
    let flightElapsedTime = 0;
    let isFlightActive = false;
    let flightFinishedNotified = false;
    let hasNotifiedReady = false;
    let currentFuelProgress = progressRef.current;

    const animate = (now?: number) => {
      animId = 0;
      if (!isInView) return;

      const currentTime = typeof now === "number" ? now : performance.now();
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const elapsed = (currentTime - startTime) / 1000;

      const ptrAlpha = 1 - Math.exp(-dt / POINTER_SMOOTH_TAU);
      pointer.currentX += (pointer.targetX - pointer.currentX) * ptrAlpha;
      pointer.currentY += (pointer.targetY - pointer.currentY) * ptrAlpha;

      if (pulseRef.current > 0) pulseRef.current = Math.max(0, pulseRef.current - dt * 2.2);
      const currentPulse = pulseRef.current;

      const pTarget = progressRef.current;
      let calculatedFuelTarget = pTarget;

      if (isFlightActive) {
        const t = flightElapsedTime;
        if (t < IGNITION_DUR) {
          const ignFrac = t / IGNITION_DUR;
          calculatedFuelTarget = pTarget * (1.0 - ignFrac * 0.04);
        } else if (t < ASCENT_END) {
          const ascFrac = (t - IGNITION_DUR) / ASCENT_DUR;
          calculatedFuelTarget = pTarget * Math.max(0.015, Math.pow(1.0 - ascFrac, 1.25));
        } else if (t < BOOSTER_LAND_TIME) {
          calculatedFuelTarget = 0.015;
        } else {
          const refillElapsed = t - BOOSTER_LAND_TIME;
          const refillFrac = Math.min(1.0, refillElapsed / 2.2);
          const refillCurve = 1 - Math.pow(1 - refillFrac, 3);
          calculatedFuelTarget = 0.015 + (pTarget - 0.015) * refillCurve;
        }
      }

      const fuelLerpSpeed = isFlightActive ? 6.5 : 4.0;
      currentFuelProgress += (calculatedFuelTarget - currentFuelProgress) * Math.min(1, dt * fuelLerpSpeed);

      const effectiveP = Math.max(0.001, currentFuelProgress);
      const targetFuelHeight = Math.max(0.001, effectiveP * CHAMBER_H);
      fuelMesh.scale.set(1, targetFuelHeight, 1);
      const currentSurfaceY = CHAMBER_BOTTOM_Y + targetFuelHeight;
      fuelMesh.position.y = CHAMBER_BOTTOM_Y + targetFuelHeight / 2;
      meniscusMesh.position.y = currentSurfaceY;
      meniscusMesh.visible = effectiveP > 0.01;
      fuelCoreLight.position.y = currentSurfaceY;
      fuelCoreLight.intensity = 0.5 + effectiveP * 1.2 + currentPulse * 1.4;
      fuelMaterial.emissiveIntensity = 0.75 + effectiveP * 0.8 + currentPulse * 1.1;
      goldMaterial.emissiveIntensity = 0.4 + effectiveP * 0.3 + currentPulse * 0.6;

      const st = stateRef.current;
      const lifted = liftedRef.current;
      const isReady = st === "READY_TO_LAUNCH" || pTarget >= 1.0;
      const isLaunched = st === "LAUNCHED";
      const countingDown = launchingRef.current && !lifted;

      if (lifted && !wasLifted) {
        flightElapsedTime = 0;
        isFlightActive = true;
        flightFinishedNotified = false;
        isSeparated = false;
        capsuleExitedAtmosphere = false;
        boosterLanded = false;
        isDocked = false;
        boosterGroup.position.set(0, 0, 0);
        capsuleGroup.position.set(0, 0, 0);
        capsuleGroup.visible = true;
        stagingFlashMat.opacity = 0;
        dockingFlashMat.opacity = 0;
      }
      wasLifted = lifted;

      let ascentY = 0;
      let targetCameraY = 0.1;
      let engineIntensity = 0;
      let isPadSmokeActive = false;
      let floatY = 0;
      let rotZ = 0;
      const slowSpinY = enable360RotationRef.current ? elapsed * 0.25 : 0;
      const rotY = slowSpinY + pointer.currentX * 0.05;

      if (!prefersReducedMotion) {
        floatY = enableIdleHoverRef.current ? Math.sin(elapsed * 1.1) * 0.035 : 0;
        rotZ = -pointer.currentX * 0.035 + Math.sin(elapsed * 0.7) * 0.01;
      }

      if (isFlightActive) {
        flightElapsedTime += dt;
        const t = flightElapsedTime;

        if (t < IGNITION_DUR) {
          const ignFrac = t / IGNITION_DUR;
          ascentY = 0;
          targetCameraY = currentBaseCameraY;
          engineIntensity = ignFrac * 0.9;
          isPadSmokeActive = true;
          const rumble = Math.sin(elapsed * 48) * 0.007 * ignFrac;
          rocketGroup.position.set(rumble, floatY * 0.2, rumble * 0.5);
          boosterGroup.position.set(0, 0, 0);
          capsuleGroup.position.set(0, 0, 0);
          capsuleGroup.visible = true;

        } else if (t < ASCENT_END) {
          const ascFrac = (t - IGNITION_DUR) / ASCENT_DUR;
          const curve = easeInOutCubic(ascFrac);
          ascentY = PEAK_ALTITUDE * curve;

          const targetBoosterCenter = PEAK_ALTITUDE + BOOSTER_MID_Y;
          targetCameraY = currentBaseCameraY + (targetBoosterCenter - currentBaseCameraY) * curve;

          engineIntensity = 1.0;
          isPadSmokeActive = ascentY < 1.4;
          const sway = Math.sin(elapsed * 4.0) * 0.012 * (1 - ascFrac * 0.5);
          rocketGroup.position.set(sway, ascentY, 0);

          if (modelRef.current === "shahed136") {
            boosterGroup.visible = false;
            capsuleGroup.visible = false;
            singleShahedDrone.propBlade.rotation.z += 0.85;
            if (singleShahedDrone.droneFuelMesh) {
              const displayedFuel = Math.max(0.001, currentFuelProgress);
              singleShahedDrone.droneFuelMesh.visible = displayedFuel > 0.001;
              singleShahedDrone.droneFuelMesh.scale.y = displayedFuel;
              singleShahedDrone.droneFuelMesh.position.y = 0.07 + displayedFuel * 0.24;
            }

            // Trigger kamikaze detonation near apogee in Scenario 2
            if (droneModeRef.current === "cinematic_explosion" && ascentY >= PEAK_ALTITUDE - 0.7 && !hasDetonated) {
              triggerKamikazeExplosion(ascentY);
            }
          } else {
            boosterGroup.position.set(0, 0, 0);
            capsuleGroup.position.set(0, 0, 0);
            capsuleGroup.visible = true;
          }
          rotZ += Math.sin(elapsed * 3.2) * 0.015 * (1 - ascFrac * 0.3);

        } else if (t < SEP_END) {
          if (modelRef.current === "shahed136") {
            boosterGroup.visible = false;
            capsuleGroup.visible = false;
            targetCameraY = PEAK_ALTITUDE + BOOSTER_MID_Y;
            engineIntensity = 0;
            isPadSmokeActive = false;
            if (!hasDetonated && droneModeRef.current === "cinematic_explosion") {
              triggerKamikazeExplosion(PEAK_ALTITUDE);
            }
          } else {
            if (!isSeparated) {
              isSeparated = true;
              stagingFlashMat.opacity = 1.0;
            }
            stagingFlashMat.opacity = Math.max(0, stagingFlashMat.opacity - dt * 2.0);

            const sepFrac = (t - ASCENT_END) / SEP_DUR;
            const capsuleRelY = Math.pow(sepFrac, 1.6) * 9.5;

            capsuleGroup.position.set(0, capsuleRelY, 0);
            capsuleGroup.visible = capsuleRelY < 7.5;
            capsuleRcsLight.intensity = Math.max(0, 1.5 * (1 - sepFrac * 0.6));

            const apogeeFloat = Math.sin(sepFrac * Math.PI) * 0.06;
            ascentY = PEAK_ALTITUDE + apogeeFloat;
            rocketGroup.position.set(0, ascentY, 0);
            boosterGroup.position.set(0, 0, 0);

            targetCameraY = ascentY + BOOSTER_MID_Y;
            engineIntensity = 0.2 * (1 - sepFrac * 0.8);
            isPadSmokeActive = false;
          }

        } else if (t < BOOSTER_LAND_TIME) {
          if (modelRef.current === "shahed136") {
            boosterGroup.visible = false;
            capsuleGroup.visible = false;
            const descFrac = (t - SEP_END) / BOOSTER_DESCENT_DUR;
            targetCameraY = currentBaseCameraY + (PEAK_ALTITUDE - currentBaseCameraY) * (1 - descFrac);
            engineIntensity = 0;
            isPadSmokeActive = false;
          } else {
            if (!capsuleExitedAtmosphere) {
              capsuleExitedAtmosphere = true;
              soundEngine.playBoosterDescent();
            }
            capsuleGroup.position.set(0, 25.0, 0);
            capsuleGroup.visible = false;
            capsuleRcsLight.intensity = 0;

            const descFrac = (t - SEP_END) / BOOSTER_DESCENT_DUR;
            const descCurve = easeInOutCubic(descFrac);

            ascentY = PEAK_ALTITUDE * (1 - descCurve);
            rocketGroup.position.set(0, ascentY, 0);
            boosterGroup.position.set(0, 0, 0);

            engineIntensity = 0.88;
            isPadSmokeActive = ascentY < 1.2;

            const currentBoosterCenter = ascentY + BOOSTER_MID_Y;
            targetCameraY = currentBaseCameraY + (currentBoosterCenter - currentBaseCameraY) * (1 - descCurve);
          }

        } else if (t < REDOCK_START) {
          // ── Phase 5: Booster Touchdown on Pad ──
          if (!boosterLanded) {
            boosterLanded = true;
            soundEngine.playBoosterTouchdown();
            // همین که موشک روی زمین نشست، موزیک پلی‌گراند از نو پخش بشه
            soundEngine.onMissileLaunchEnd();
          }
          const touchFrac = (t - BOOSTER_LAND_TIME) / TOUCHDOWN_DUR;
          const springDip = -Math.sin(Math.min(1, touchFrac) * Math.PI) * 0.03 * (1 - touchFrac * 0.5);
          ascentY = springDip;
          rocketGroup.position.set(0, ascentY, 0);
          boosterGroup.position.set(0, 0, 0);
          capsuleGroup.position.set(0, 25.0, 0);
          capsuleGroup.visible = false;
          targetCameraY = currentBaseCameraY;
          engineIntensity = Math.max(0, 0.3 * (1 - touchFrac));
          isPadSmokeActive = touchFrac < 0.5;

        } else if (t < REDOCK_START + REDOCK_DUR) {
          if (capsuleExitedAtmosphere && boosterLanded) {
            const dockFrac = (t - REDOCK_START) / REDOCK_DUR;
            const dockCurve = easeInOutCubic(dockFrac);
            const capsuleRelY = 8.5 * (1 - dockCurve);
            const alignSwayX = Math.sin((1 - dockCurve) * Math.PI * 3.5) * 0.025 * (1 - dockCurve);
            capsuleGroup.position.set(alignSwayX, capsuleRelY, 0);
            capsuleGroup.visible = true;
            capsuleRcsLight.intensity = (1 - dockCurve) * (0.6 + Math.sin(elapsed * 28) * 0.4);
          }
          ascentY = 0;
          rocketGroup.position.set(0, 0, 0);
          boosterGroup.position.set(0, 0, 0);
          targetCameraY = currentBaseCameraY;
          engineIntensity = 0;
          isPadSmokeActive = false;

        } else if (t < FLIGHT_DURATION) {
          capsuleGroup.position.set(0, 0, 0);
          capsuleGroup.visible = true;
          boosterGroup.position.set(0, 0, 0);
          rocketGroup.position.set(0, 0, 0);
          capsuleRcsLight.intensity = 0;

          if (!isDocked) {
            isDocked = true;
            dockingFlashMat.opacity = 1.0;
            soundEngine.playDockingLock();
          }
          dockingFlashMat.opacity = Math.max(0, dockingFlashMat.opacity - dt * 2.0);

          ascentY = 0;
          targetCameraY = currentBaseCameraY;
          engineIntensity = 0;
          isPadSmokeActive = false;
          haloMat.opacity = 0.45 + Math.sin(elapsed * 2.0) * 0.15;

        } else {
          isFlightActive = false;
          ascentY = 0;
          targetCameraY = currentBaseCameraY;
          engineIntensity = 0;
          isPadSmokeActive = false;
          rocketGroup.position.set(0, floatY, 0);
          boosterGroup.position.set(0, 0, 0);
          capsuleGroup.position.set(0, 0, 0);
          capsuleGroup.visible = true;
          dockingFlashMat.opacity = 0;
          stagingFlashMat.opacity = 0;

          if (!flightFinishedNotified) {
            flightFinishedNotified = true;
            hasDetonated = false;
            singleShahedDrone.root.visible = true;
            onFlightCompleteRef.current?.();
          }
        }

        const screenAspect = camera.aspect;
        const APPROACH_ZONE = 3.0;
        const RECEDE_ZONE = 2.0;

        memorialBanners.forEach((b) => {
          const deltaY = camera.position.y - b.targetY;

          if (isFlightActive && deltaY >= -APPROACH_ZONE && deltaY <= RECEDE_ZONE) {
            let ease: number;
            let currentScale: number;
            let currentZ: number;
            let pitchX: number;
            let yawY: number;
            let targetOpacity: number;

            if (deltaY <= 0) {
              const u = 1 + deltaY / APPROACH_ZONE;
              ease = u * u * (3 - 2 * u);
              currentScale = 0.60 + (1.30 - 0.60) * Math.pow(ease, 1.2);
              currentZ = b.baseZ + (2.15 - b.baseZ) * Math.pow(ease, 1.25);
              pitchX = -(1 - ease) * 0.14;
              yawY = -b.side * (0.08 - 0.04 * ease);
              targetOpacity = Math.pow(ease, 1.1);
            } else {
              const v = deltaY / RECEDE_ZONE;
              ease = v * v * (3 - 2 * v);
              currentScale = 1.30 - (1.30 - 0.60) * Math.pow(ease, 1.1);
              currentZ = 2.15 + (b.baseZ - 2.15) * Math.pow(ease, 1.2);
              pitchX = ease * 0.12;
              yawY = -b.side * (0.04 + 0.04 * ease);
              targetOpacity = 1 - Math.pow(ease, 1.3);
            }

            const distFromCam = Math.max(0.5, camera.position.z - currentZ);
            const frustumHalfH = distFromCam * Math.tan((camera.fov * 0.5 * Math.PI) / 180);
            const frustumHalfW = frustumHalfH * screenAspect;
            const bannerHalfW = (b.planeWidth * currentScale) * 0.5;

            const centerShift = screenAspect < 0.7 ? 0.16 : 0.20;
            const maxSafeOffset = Math.max(0, frustumHalfW - bannerHalfW - 0.04);
            const safeX = Math.min(centerShift, maxSafeOffset);

            const floatY = b.targetY + Math.sin(elapsed * 1.8 + b.targetY) * 0.02;
            const rollZ = Math.sin(elapsed * 1.4 + b.targetY) * 0.01;

            b.mesh.scale.set(currentScale, currentScale, currentScale);
            b.mesh.position.set(b.side * safeX, floatY, currentZ);
            b.mesh.rotation.set(pitchX, yawY, rollZ);
            b.mat.opacity += (targetOpacity - b.mat.opacity) * (1 - Math.exp(-dt / 0.12));
          } else {
            b.mesh.scale.set(0.60, 0.60, 0.60);
            b.mesh.position.set(b.side * 0.18, b.targetY, b.baseZ);
            b.mesh.rotation.set(0, -b.side * 0.08, 0);
            b.mat.opacity += (0 - b.mat.opacity) * (1 - Math.exp(-dt / 0.2));
          }
        });

        // ── عکس شهدا در ارتفاعات پایین‌تر، بدون کادر و با زاویه مایل ──
        const PORTRAIT_APPROACH = 2.5;
        const PORTRAIT_RECEDE = 1.6;

        martyrPortraits.forEach((p) => {
          const deltaY = camera.position.y - p.targetY;
          let targetOpacity: number;
          let targetZ: number;
          let targetScale: number;

          if (isFlightActive && deltaY >= -PORTRAIT_APPROACH && deltaY <= PORTRAIT_RECEDE) {
            if (deltaY <= 0) {
              const u = 1 + deltaY / PORTRAIT_APPROACH;
              const ease = u * u * (3 - 2 * u);
              targetOpacity = Math.pow(ease, 1.2) * 0.55;
              targetZ = p.baseZ + (2.0 - p.baseZ) * Math.pow(ease, 1.3);
              targetScale = 0.55 + 0.55 * Math.pow(ease, 1.1);
            } else {
              const v = deltaY / PORTRAIT_RECEDE;
              const ease = v * v * (3 - 2 * v);
              targetOpacity = (1 - Math.pow(ease, 1.2)) * 0.55;
              targetZ = 2.0 + (p.baseZ - 2.0) * Math.pow(ease, 1.2);
              targetScale = 1.10 - 0.55 * Math.pow(ease, 1.0);
            }
            const floatOffY = Math.sin(elapsed * 1.3 + p.targetY * 0.7) * 0.018;
            p.mesh.position.set(p.side * 0.36, p.targetY + floatOffY, targetZ);
            p.mesh.scale.setScalar(targetScale);
            // زاویه مایل ملایم به چپ یا راست
            p.mesh.rotation.set(0, p.tiltY, p.tiltZ + Math.sin(elapsed * 0.8) * 0.015);
          } else {
            targetOpacity = 0;
            p.mesh.position.set(p.side * 0.36, p.targetY, p.baseZ);
            p.mesh.scale.setScalar(0.55);
            p.mesh.rotation.set(0, p.tiltY, p.tiltZ);
          }

          p.mat.opacity += (targetOpacity - p.mat.opacity) * (1 - Math.exp(-dt / 0.15));
        });

        const camAlpha = 1 - Math.exp(-dt / CAM_SMOOTH_TAU);
        camera.position.y += (targetCameraY - camera.position.y) * camAlpha;
      } else {
        const camAlpha = 1 - Math.exp(-dt / CAM_SMOOTH_TAU);
        camera.position.y += (currentBaseCameraY - camera.position.y) * camAlpha;
        boosterGroup.position.set(0, 0, 0);
        capsuleGroup.position.set(0, 0, 0);
        capsuleGroup.visible = modelRef.current !== "shahed136";
        capsuleRcsLight.intensity = 0;
        stagingFlashMat.opacity = 0; dockingFlashMat.opacity = 0;

        if (modelRef.current === "shahed136") {
          boosterGroup.visible = false;
          capsuleGroup.visible = false;
          padRing.visible = false;
          singleShahedDrone.propBlade.rotation.z += 0.22;
          if (singleShahedDrone.droneFuelMesh) {
            const displayedFuel = Math.max(0.001, currentFuelProgress);
            singleShahedDrone.droneFuelMesh.visible = displayedFuel > 0.001;
            singleShahedDrone.droneFuelMesh.scale.y = displayedFuel;
            singleShahedDrone.droneFuelMesh.position.y = 0.07 + displayedFuel * 0.24;
          }
          swarmDrones.forEach((d) => {
            d.propBlade.rotation.z += 0.22;
          });
        }

        if (isLaunched || flightFinishedNotified) {
          rocketGroup.position.set(0, floatY, 0);
          haloMat.opacity = 0.42 + Math.sin(elapsed * 2.0) * 0.18;
          haloRing.rotation.z = elapsed * 0.3;
          thrusterLight.intensity = 0.75 + Math.sin(elapsed * 3) * 0.25;
          fuelMaterial.emissiveIntensity = 1.3 + Math.sin(elapsed * 2.5) * 0.25;
        } else {
          const tremble = (enableCameraShakeRef.current && isReady && !prefersReducedMotion)
            ? Math.sin(elapsed * 39) * 0.0035 + Math.sin(elapsed * 27.5) * 0.0025
            : 0;
          rocketGroup.position.set(tremble, floatY + tremble * 0.5, 0);
          haloMat.opacity = 0;
          thrusterLight.intensity = countingDown ? 1.6 + Math.sin(elapsed * 9) * 0.5 + Math.sin(elapsed * 23) * 0.25 : isReady ? 1.2 + Math.sin(elapsed * 4) * 0.4 : 0;
        }
      }

      // ── Update Kamikaze Detonation Particles & Flash ──
      if (hasDetonated) {
        for (let i = 0; i < EXPLOSION_DEBRIS_COUNT; i++) {
          if (debrisLife[i] < debrisMaxLife[i]) {
            debrisLife[i] += dt;
            debrisPos[i * 3] += debrisVel[i * 3] * dt;
            debrisPos[i * 3 + 1] += debrisVel[i * 3 + 1] * dt;
            debrisPos[i * 3 + 2] += debrisVel[i * 3 + 2] * dt;
            debrisVel[i * 3 + 1] -= 6.5 * dt; // gravity
            debrisVel[i * 3] *= 0.96;
            debrisVel[i * 3 + 2] *= 0.96;
          }
        }
        debrisGeo.attributes.position.needsUpdate = true;
        debrisMat.opacity = Math.max(0, debrisMat.opacity - dt * 0.35);

        shockwaveMesh.scale.addScalar(dt * 8.5);
        shockwaveMat.opacity = Math.max(0, shockwaveMat.opacity - dt * 1.6);
        detonationLight.intensity = Math.max(0, detonationLight.intensity - dt * 16.0);
      }

      // ── Update Active Swarm Projectiles ──
      for (let i = flyingProjectiles.length - 1; i >= 0; i--) {
        const p = flyingProjectiles[i];
        p.life += dt;
        p.group.position.addScaledVector(p.vel, dt);
        p.propBlade.rotation.z += 1.2;
        p.group.rotation.z = Math.sin(p.life * 3.5) * 0.14;
        p.group.rotation.x = railPitch + p.life * 0.12;

        if (Math.random() < 0.45) {
          spawnSmoke(
            p.group.position.x,
            p.group.position.y - 0.1,
            p.group.position.z + 1.1,
            (Math.random() - 0.5) * 0.1,
            -(0.1 + Math.random() * 0.2),
            0.6 + Math.random() * 0.8,
            0.45,
            0.04,
            0.22,
            false
          );
        }

        if (p.life >= p.maxLife) {
          scene.remove(p.group);
          flyingProjectiles.splice(i, 1);
        }
      }

      // ── Camera Shake for Detonation ──
      if (enableCameraShakeRef.current && cameraShakeIntensity > 0.001) {
        camera.position.x += (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.y += (Math.random() - 0.5) * cameraShakeIntensity;
        cameraShakeIntensity = Math.max(0, cameraShakeIntensity - dt * 0.85);
      } else {
        cameraShakeIntensity = 0;
      }

      rocketGroup.rotation.set(pointer.currentY * 0.04, rotY, rotZ);

      if (engineIntensity > 0.01 && modelRef.current !== "shahed136") {
        thrusterLight.intensity = 3.5 * engineIntensity + Math.sin(elapsed * 33) * 0.6;
        machConeMat.opacity = Math.min(0.7, engineIntensity * 0.65 + Math.sin(elapsed * 29) * 0.1);
        machCone.scale.set(1.0, 1.0 + engineIntensity * 0.45, 1.0);
        machDiamondMat.opacity = Math.min(0.85, engineIntensity * 0.8 + Math.sin(elapsed * 43) * 0.15);
      } else {
        machConeMat.opacity = 0; machDiamondMat.opacity = 0;
        if (modelRef.current === "shahed136") thrusterLight.intensity = 0;
      }

      spawnExhaust(engineIntensity, dt, isPadSmokeActive);

      for (let i = flameCount - 1; i >= 0; i--) {
        fLife[i] += dt;
        if (fLife[i] >= fMaxLife[i]) {
          flameCount--;
          if (i < flameCount) {
            fX[i] = fX[flameCount]; fY[i] = fY[flameCount]; fZ[i] = fZ[flameCount];
            fVX[i] = fVX[flameCount]; fVY[i] = fVY[flameCount]; fVZ[i] = fVZ[flameCount];
            fLife[i] = fLife[flameCount]; fMaxLife[i] = fMaxLife[flameCount]; fSize[i] = fSize[flameCount];
          }
          continue;
        }
        fX[i] += fVX[i] * dt; fY[i] += fVY[i] * dt; fZ[i] += fVZ[i] * dt;
      }
      for (let i = 0; i < FLAME_MAX; i++) {
        if (i < flameCount) {
          const lr = 1 - fLife[i] / fMaxLife[i];
          fPositions[i * 3] = fX[i]; fPositions[i * 3 + 1] = fY[i]; fPositions[i * 3 + 2] = fZ[i];
          fSizes[i] = fSize[i] * (0.8 + lr * 0.5); fAlphas[i] = lr;
        } else { fSizes[i] = 0; fAlphas[i] = 0; }
      }
      flameGeo.attributes.position.needsUpdate = true;
      flameGeo.attributes.size.needsUpdate = true;
      flameGeo.attributes.alpha.needsUpdate = true;

      for (let i = smokeCount - 1; i >= 0; i--) {
        sLife[i] += dt;
        if (sLife[i] >= sMaxLife[i]) {
          smokeCount--;
          if (i < smokeCount) {
            sX[i] = sX[smokeCount]; sY[i] = sY[smokeCount]; sZ[i] = sZ[smokeCount];
            sVX[i] = sVX[smokeCount]; sVY[i] = sVY[smokeCount]; sVZ[i] = sVZ[smokeCount];
            sLife[i] = sLife[smokeCount]; sMaxLife[i] = sMaxLife[smokeCount];
            sStartSize[i] = sStartSize[smokeCount]; sEndSize[i] = sEndSize[smokeCount];
            sIsPad[i] = sIsPad[smokeCount];
          }
          continue;
        }
        sX[i] += sVX[i] * dt; sY[i] += sVY[i] * dt; sZ[i] += sVZ[i] * dt;
        sVX[i] *= 0.94; sVZ[i] *= 0.94;
        sVY[i] *= sIsPad[i] ? 0.96 : 0.93;
        sVY[i] += (sIsPad[i] ? 0.12 : 0.22) * dt;
      }
      for (let i = 0; i < SMOKE_MAX; i++) {
        if (i < smokeCount) {
          const ageRatio = sLife[i] / sMaxLife[i];
          sPositions[i * 3] = sX[i]; sPositions[i * 3 + 1] = sY[i]; sPositions[i * 3 + 2] = sZ[i];
          sSizes[i] = sStartSize[i] + (sEndSize[i] - sStartSize[i]) * Math.sqrt(ageRatio);
          sAlphas[i] = Math.sin(ageRatio * Math.PI) * (1 - ageRatio * 0.5);
          sAges[i] = ageRatio;
        } else { sSizes[i] = 0; sAlphas[i] = 0; sAges[i] = 0; }
      }
      smokeGeo.attributes.position.needsUpdate = true;
      smokeGeo.attributes.size.needsUpdate = true;
      smokeGeo.attributes.alpha.needsUpdate = true;
      smokeGeo.attributes.age.needsUpdate = true;

      renderer.render(scene, camera);

      if (!hasNotifiedReady) {
        hasNotifiedReady = true;
        onReadyRef.current?.();
      }
      animId = requestAnimationFrame(animate);
    };

    const detachVisibility = attachVisibilityPause(container, (visible) => {
      isInView = visible;
      if (visible) {
        lastTime = performance.now();
        kick();
      }
    });

    kick();

    return () => {
      isInView = false;
      if (animId !== 0) cancelAnimationFrame(animId);
      detachVisibility();
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      flameGeo.dispose(); flameMat.dispose();
      smokeGeo.dispose(); smokeMat.dispose();
      machConeGeo.dispose(); machConeMat.dispose();
      machDiamondGeo.dispose(); machDiamondMat.dispose();
      haloGeo.dispose(); haloMat.dispose();
      memorialBanners.forEach((b) => {
        b.mesh.geometry.dispose();
        b.mat.map?.dispose();
        b.mat.dispose();
      });
      martyrPortraits.forEach((p) => {
        p.mesh.geometry.dispose();
        p.mat.map?.dispose();
        p.mat.dispose();
      });
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      kheibarNoseGeo.dispose();
      fattahNoseGeo.dispose();
      sejjilNoseGeo.dispose();
      khorramshahrNoseGeo.dispose();
      emadNoseGeo.dispose();
      reyhanehNoseGeo.dispose();
      kheibarCanardGeo.dispose();
      fattahGliderGeo.dispose();
      emadCanardGeo.dispose();
      emadBaseFinGeom.dispose();
      carbonMaterial.dispose();
      modelTexture.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center pointer-events-none select-none" aria-hidden="true" />
  );
}
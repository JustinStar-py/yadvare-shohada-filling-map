"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MissionState } from "@/types/campaign";
import { MissileModel, getMissileConfig } from "./missile-catalog";

interface ThreeRocketSceneProps {
  fillPercentage: number;
  missionState: MissionState;
  isLaunching: boolean;
  hasLiftedOff: boolean;
  pulseTrigger: number;
  missileModel?: MissileModel;
  onFlightComplete?: () => void;
  onReady?: () => void;
}

const GOLD_COLOR = new THREE.Color("#f59e0b");
const GOLD_LIGHT = new THREE.Color("#fbbf24");
const TITANIUM_COLOR = new THREE.Color("#d4cec2");
const NOZZLE_COLOR = new THREE.Color("#1e2430");

// ── Flight Timeline Constants ──
// Cinematic Aerial Memorial Tour: slow, majestic ascent through sky inscriptions
const IGNITION_DUR = 1.2;          // 0.0s - 1.2s: Pad tremor & ignition build-up
const ASCENT_DUR = 15.0;           // 1.2s - 16.2s: Extended cinematic ascent through memorial inscriptions
const ASCENT_END = IGNITION_DUR + ASCENT_DUR; // 16.2s
const SEP_DUR = 2.4;               // 16.2s - 18.6s: Stage separation with 100% centered booster & capsule exit
const SEP_END = ASCENT_END + SEP_DUR; // 18.6s
const BOOSTER_DESCENT_DUR = 6.0;   // 18.6s - 24.6s: Camera-tracked retro landing burn descent
const BOOSTER_LAND_TIME = SEP_END + BOOSTER_DESCENT_DUR; // 24.6s
const TOUCHDOWN_DUR = 1.0;         // 24.6s - 25.6s: Gentle spring suspension dampening on pad ring
const REDOCK_START = BOOSTER_LAND_TIME + TOUCHDOWN_DUR; // 25.6s
const REDOCK_DUR = 3.2;            // 25.6s - 28.8s: Capsule returns from space orbit & docks
const SETTLE_DUR = 1.2;            // 28.8s - 30.0s: Golden celebration aura & pad settlement
const FLIGHT_DURATION = REDOCK_START + REDOCK_DUR + SETTLE_DUR; // 30.0s

// Altitude & Framing Constants
// At apogee (Y=13.0), camera at (13.0 - 0.49 = 12.51) places the booster DEAD CENTER
const PEAK_ALTITUDE = 13.0;
const BOOSTER_MID_Y = -0.49;

// Camera smoothing time constant
const CAM_SMOOTH_TAU = 0.14;
const POINTER_SMOOTH_TAU = 0.32;

export default function ThreeRocketScene({
  fillPercentage,
  missionState,
  isLaunching,
  hasLiftedOff,
  pulseTrigger,
  missileModel = "kheibar",
  onFlightComplete,
  onReady,
}: ThreeRocketSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<MissileModel>(missileModel);
  const onModelChangeRef = useRef<((model: MissileModel) => void) | null>(null);

  useEffect(() => {
    if (missileModel !== modelRef.current) {
      modelRef.current = missileModel;
      onModelChangeRef.current?.(missileModel);
    }
  }, [missileModel]);

  const progressRef = useRef(fillPercentage / 100);
  const stateRef = useRef(missionState);
  const launchingRef = useRef(isLaunching);
  const liftedRef = useRef(hasLiftedOff);
  const pulseRef = useRef(0);
  const onFlightCompleteRef = useRef(onFlightComplete);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => { onFlightCompleteRef.current = onFlightComplete; }, [onFlightComplete]);
  useEffect(() => { progressRef.current = Math.min(1, Math.max(0, fillPercentage / 100)); }, [fillPercentage]);
  useEffect(() => { stateRef.current = missionState; }, [missionState]);
  useEffect(() => { launchingRef.current = isLaunching; }, [isLaunching]);
  useEffect(() => { liftedRef.current = hasLiftedOff; }, [hasLiftedOff]);
  useEffect(() => { if (pulseTrigger > 0) pulseRef.current = 1.0; }, [pulseTrigger]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    // ── Scene Setup ──
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
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch { return; }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── Hierarchy: rocketGroup → { boosterGroup, capsuleGroup } ──
    const rocketGroup = new THREE.Group();
    scene.add(rocketGroup);
    const boosterGroup = new THREE.Group();
    rocketGroup.add(boosterGroup);
    const capsuleGroup = new THREE.Group();
    rocketGroup.add(capsuleGroup);

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.55);
    scene.add(ambientLight);
    const dirLightWarm = new THREE.DirectionalLight(0xfff6e5, 1.8);
    dirLightWarm.position.set(3.5, 5, 4.5);
    scene.add(dirLightWarm);
    const dirLightCool = new THREE.DirectionalLight(0x60a5fa, 0.85);
    dirLightCool.position.set(-3.5, 2, -2.5);
    scene.add(dirLightCool);

    // ── Materials ──
    const hullMaterial = new THREE.MeshStandardMaterial({ color: TITANIUM_COLOR, metalness: 0.58, roughness: 0.32 });
    const carbonMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#1a1f26"), metalness: 0.42, roughness: 0.55 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: GOLD_COLOR, emissive: GOLD_COLOR, emissiveIntensity: 0.45, metalness: 0.85, roughness: 0.22 });
    const nozzleMaterial = new THREE.MeshStandardMaterial({ color: NOZZLE_COLOR, metalness: 0.85, roughness: 0.38, side: THREE.DoubleSide });
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.32, roughness: 0.08, metalness: 0.1,
      transmission: isMobile ? 0 : 0.82, ior: 1.45, depthWrite: false,
    });
    const fuelMaterial = new THREE.MeshStandardMaterial({ color: GOLD_COLOR, emissive: GOLD_COLOR, emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.92 });
    const meniscusMaterial = new THREE.MeshBasicMaterial({ color: 0xfffbeb, transparent: true, opacity: 0.95 });

    // ── Capsule Parts (upper stage) ──
    const noseStart = 0.55;
    const noseH = 1.35;
    const baseR = 0.32;

    // 1) Kheibar-Shecan Nose: Aerodynamic ogive curve
    const kheibarNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = baseR * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.06 * t);
      kheibarNosePts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * noseH));
    }
    const kheibarNoseGeo = new THREE.LatheGeometry(kheibarNosePts, 40);

    // 2) Fattah-1 Nose: Pointed hypersonic glide warhead
    const fattahNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = baseR * Math.pow(1 - t, 0.72) * (1 + 0.08 * Math.sin(t * Math.PI));
      fattahNosePts.push(new THREE.Vector2(Math.max(r, 0.001), noseStart + t * 1.45));
    }
    const fattahNoseGeo = new THREE.LatheGeometry(fattahNosePts, 40);

    // 3) Sejjil Nose: Solid-propellant rounded ogive
    const sejjilNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = baseR * Math.sqrt(Math.max(0, 1 - t * t));
      sejjilNosePts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.25));
    }
    const sejjilNoseGeo = new THREE.LatheGeometry(sejjilNosePts, 40);

    // 4) Khorramshahr-4 Nose: Heavy blunt conical re-entry warhead
    const khorramshahrNosePts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = t < 0.2 ? baseR * (1 + 0.05 * (1 - t * 5)) : baseR * (1 - (t - 0.2) * 1.08);
      khorramshahrNosePts.push(new THREE.Vector2(Math.max(r, 0.035), noseStart + t * 1.15));
    }
    const khorramshahrNoseGeo = new THREE.LatheGeometry(khorramshahrNosePts, 40);

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

    // ── Dedicated Physical Accessories for Each Missile Model ──
    // A) Kheibar: 4 mid-fuselage canards on boosterGroup
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

    // B) Fattah: 4 hypersonic maneuvering fins at the base of the nose cone on capsuleGroup
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

    // C) Sejjil: 2 wide golden interstage staging rings on boosterGroup
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

    // D) Khorramshahr: Heavy payload collar ring on capsuleGroup
    const khorramshahrCollarGroup = new THREE.Group();
    const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 1.08, baseR * 1.04, 0.10, 40), goldMaterial);
    collarMesh.position.y = noseStart + 0.06;
    khorramshahrCollarGroup.add(collarMesh);
    capsuleGroup.add(khorramshahrCollarGroup);

    // ── Dynamic Missile Stencil Decal Canvas & Texture ──
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

    // Dynamic model switcher - Warhead and Booster share identical distinct colors for each missile
    const applyMissileModel = (model: MissileModel) => {
      const cfg = getMissileConfig(model);
      renderDecalText(model, cfg.textColor);

      hullMaterial.color.set(cfg.colorHex);
      hullMaterial.metalness = cfg.metalness;
      hullMaterial.roughness = cfg.roughness;

      if (model === "fattah") {
        noseMesh.geometry = fattahNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.45, 0);
      } else if (model === "sejjil") {
        noseMesh.geometry = sejjilNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.25, 0);
      } else if (model === "khorramshahr") {
        noseMesh.geometry = khorramshahrNoseGeo;
        beaconMesh.position.set(0, noseStart + 1.15, 0);
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
    };

    onModelChangeRef.current = applyMissileModel;
    applyMissileModel(modelRef.current);

    // Capsule docking baseplate
    const capsuleBase = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.98, baseR * 0.96, 0.03, 36), hullMaterial);
    capsuleBase.position.set(0, noseStart - 0.015, 0);
    capsuleGroup.add(capsuleBase);

    const capsuleRcsLight = new THREE.PointLight(GOLD_LIGHT, 0, 2.2);
    capsuleRcsLight.position.set(0, noseStart - 0.05, 0);
    capsuleGroup.add(capsuleRcsLight);

    // ── Booster Parts (lower stage) ──
    const CHAMBER_H = 1.1;
    const CHAMBER_CENTER_Y = 0.0;
    const CHAMBER_BOTTOM_Y = CHAMBER_CENTER_Y - CHAMBER_H / 2;
    const chamberRadius = baseR;

    // ── Light Translucent Metallic Layer around Tank (showing golden fuel inside) ──
    const translucentMetalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdde4ec, // Light titanium / platinum sheen
      metalness: 0.82, // High metallic reflection
      roughness: 0.16, // Polished aerospace metal
      transparent: true,
      opacity: 0.44, // Slightly transparent to showcase the filled golden fuel inside
      transmission: isMobile ? 0.35 : 0.54, // Light transmits through the cylinder
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

    // Structural lightweight metallic ribbing & longitudinal support struts around the tank
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
    // Subtle calibrated fuel level graduation rings (at 25%, 50%, 75%)
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

    // ── Flag of Iran Decal on Rocket Fin ──
    const createIranFlagTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const h = 320 / 3;
        // Green
        ctx.fillStyle = "#239f40";
        ctx.fillRect(0, 0, 512, h);
        // White
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, h, 512, h);
        // Red
        ctx.fillStyle = "#da0000";
        ctx.fillRect(0, h * 2, 512, h);

        // Thin border
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 508, 316);

        // Red central emblem (Nishan)
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

      // Attach Iranian flag & "I.R. IRAN" insignia to designated fins (total 2 blades: blades 0 and 2, opposite pairs)
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

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.28, 32, 1, true), nozzleMaterial);
    nozzle.position.set(0, -1.39, 0);
    boosterGroup.add(nozzle);

    const thrusterLight = new THREE.PointLight(GOLD_LIGHT, 0, 4);
    thrusterLight.position.set(0, -1.55, 0);
    boosterGroup.add(thrusterLight);

    // Mach cones belong to booster
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

    // ── Staging & Docking Flash Rings (on rocketGroup so visible during both phases) ──
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

    // Halo ring on rocketGroup (visible post-flight)
    const haloGeo = new THREE.TorusGeometry(0.55, 0.025, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({ color: GOLD_LIGHT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.y = 0.6;
    rocketGroup.add(haloRing);

    // ── Launch Pad Ring ──
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.62, 48),
      new THREE.MeshBasicMaterial({ color: GOLD_COLOR, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, -1.65, 0);
    scene.add(padRing);

    // ── 3D Memorial Tunnel in the Sky (Luminous Gold-Red Calligraphy with 3D Depth Fly-Past) ──
    // Evenly distributed along the ascent corridor up to apogee (Y=13.0m)
    const MEMORIAL_TEXTS = [
      { lines: ["شهدا زنده‌اند"], y: 2, side: 1 },
      { lines: ["به یاد شهدای والامقام", "قهرمان شهیدیه"], y: 6.2, side: -1 },
      { lines: ["راه سرخ شهادت", "جاودانه و نورانی است"], y: 10.4, side: 1 },
      { lines: ["ستارگان درخشان آسمان", "ایثار و معرفت"], y: 14.6, side: -1 },
      { lines: ["صلوات بر محمد", "و آل محمد (ص)"], y: 18.8, side: 1 },
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

    // Renders crystal-clear glowing gold-to-red calligraphy on 100% transparent canvas (tightly bounded)
    const createMemorialBannerTexture = (lines: string[]): { texture: THREE.CanvasTexture; aspect: number } => {
      const isSingle = lines.length === 1;
      const fontSize = isSingle ? 76 : 60;

      // Measure max text width with an offscreen canvas to eliminate dead horizontal margins
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

      // Add tight padding for flanking stars and radiant atmospheric bloom
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

          // Pass 1: Deep luminous ruby atmospheric bloom
          ctx.shadowColor = "rgba(220, 38, 38, 0.95)";
          ctx.shadowBlur = 28;
          ctx.fillStyle = "rgba(239, 68, 68, 0.92)";
          ctx.fillText(lineText, textX, textY);

          // Pass 2: Warm radiant golden inner glow
          ctx.shadowColor = "rgba(245, 158, 11, 0.95)";
          ctx.shadowBlur = 14;
          ctx.fillStyle = "rgba(251, 191, 36, 0.96)";
          ctx.fillText(lineText, textX, textY);

          // Pass 3: Crisp metallic gold-to-red specular gradient
          ctx.shadowColor = "rgba(254, 240, 138, 0.85)";
          ctx.shadowBlur = 5;
          const textGrad = ctx.createLinearGradient(0, textY - fontSize * 0.6, 0, textY + fontSize * 0.6);
          textGrad.addColorStop(0.0, "#ffffff"); // Crisp specular highlight
          textGrad.addColorStop(0.25, "#fef08a"); // Radiant pale gold
          textGrad.addColorStop(0.55, "#f59e0b"); // Warm amber gold
          textGrad.addColorStop(0.85, "#ef4444"); // Fiery red
          textGrad.addColorStop(1.0, "#b91c1c"); // Rich deep ruby crimson
          ctx.fillStyle = textGrad;
          ctx.fillText(lineText, textX, textY);

          // Delicate luminous ✦ calligraphic stars flanking the first line
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
        blending: THREE.AdditiveBlending, // Radiant additive glow against the dark starry cosmos
        side: THREE.DoubleSide,
      });

      // Height calibrated for aesthetic balance; width derived directly from canvas aspect
      const planeH = item.lines.length === 1 ? 0.36 : 0.48;
      const planeW = planeH * aspect * 0.98;
      const geo = new THREE.PlaneGeometry(planeW, planeH);
      const mesh = new THREE.Mesh(geo, mat);
      const initialZ = -0.5; // Sits in subtle celestial depth initially
      mesh.position.set(item.side * 0.18, item.y, initialZ);
      mesh.scale.set(0.60, 0.60, 0.60);
      mesh.rotation.y = -item.side * 0.08;
      scene.add(mesh);
      memorialBanners.push({ mesh, mat, targetY: item.y, baseZ: initialZ, side: item.side, planeWidth: planeW });
    });

    // ── Pointer Parallax ──
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

      // Adaptive vertical FOV and camera framing:
      // - On narrow portrait mobile (aspect < 0.7): wider fov so rocket & text fit side margins
      // - On widescreen laptop/desktop (aspect > 1.15): zoomed back slightly and centered with ample top/bottom headroom
      // - On tablet / square screens: balanced mid values
      if (aspect < 0.7) {
        camera.fov = 38; // Wider horizontal corridor for mobile screens
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

    // ══════════════════════════════════════════════════════════
    // PARTICLE SYSTEMS — Struct-of-Arrays Ring Buffers (Zero GC)
    // ══════════════════════════════════════════════════════════

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
      if (smokeCount >= SMOKE_MAX) return;
      const i = smokeCount++;
      sX[i] = x; sY[i] = y; sZ[i] = z;
      sVX[i] = vx; sVY[i] = vy; sVZ[i] = vz;
      sLife[i] = 0; sMaxLife[i] = maxLife;
      sStartSize[i] = startSz; sEndSize[i] = endSz;
      sIsPad[i] = isPad ? 1 : 0;
    };

    const spawnExhaust = (intensity: number, dt: number, isPadRoll: boolean) => {
      if (intensity <= 0.01) return;
      const rx = rocketGroup.position.x;
      const ry = rocketGroup.position.y;
      const rz = rocketGroup.position.z;
      const nozzleWorldY = ry + NOZZLE_LOCAL_Y;

      // Flame core
      const flameN = Math.ceil(intensity * 12 * dt * 60);
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

      // Smoke
      const smokeN = Math.ceil((intensity * 8 + (isPadRoll ? 6 : 0)) * dt * 60);
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

    // ── Easing ──
    const easeInOutCubic = (x: number): number => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    // ── Flight State ──
    let isSeparated = false;
    let capsuleExitedAtmosphere = false;
    let boosterLanded = false;
    let isDocked = false;

    // ── Animation Loop ──
    let animId: number;
    let lastTime = performance.now();
    const startTime = performance.now();
    let wasLifted = false;
    let flightElapsedTime = 0;
    let isFlightActive = false;
    let flightFinishedNotified = false;
    let hasNotifiedReady = false;

    const animate = (now?: number) => {
      animId = requestAnimationFrame(animate);

      const currentTime = typeof now === "number" ? now : performance.now();
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const elapsed = (currentTime - startTime) / 1000;

      // Frame-rate independent parallax smoothing
      const ptrAlpha = 1 - Math.exp(-dt / POINTER_SMOOTH_TAU);
      pointer.currentX += (pointer.targetX - pointer.currentX) * ptrAlpha;
      pointer.currentY += (pointer.targetY - pointer.currentY) * ptrAlpha;

      // Pulse decay
      if (pulseRef.current > 0) pulseRef.current = Math.max(0, pulseRef.current - dt * 2.2);
      const currentPulse = pulseRef.current;

      // ── Fuel Column ──
      const p = progressRef.current;
      const targetFuelHeight = Math.max(0.001, p * CHAMBER_H);
      fuelMesh.scale.set(1, targetFuelHeight, 1);
      const currentSurfaceY = CHAMBER_BOTTOM_Y + targetFuelHeight;
      fuelMesh.position.y = CHAMBER_BOTTOM_Y + targetFuelHeight / 2;
      meniscusMesh.position.y = currentSurfaceY;
      meniscusMesh.visible = p > 0.01;
      fuelCoreLight.position.y = currentSurfaceY;
      fuelCoreLight.intensity = 0.5 + p * 1.2 + currentPulse * 1.4;
      fuelMaterial.emissiveIntensity = 0.75 + p * 0.8 + currentPulse * 1.1;
      goldMaterial.emissiveIntensity = 0.4 + p * 0.3 + currentPulse * 0.6;

      // ── Flight Choreography ──
      const st = stateRef.current;
      const lifted = liftedRef.current;
      const isReady = st === "READY_TO_LAUNCH" || p >= 1.0;
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
      const slowSpinY = elapsed * 0.25;
      const rotY = slowSpinY + pointer.currentX * 0.05;

      if (!prefersReducedMotion) {
        floatY = Math.sin(elapsed * 1.1) * 0.035;
        rotZ = -pointer.currentX * 0.035 + Math.sin(elapsed * 0.7) * 0.01;
      }

      if (isFlightActive) {
        flightElapsedTime += dt;
        const t = flightElapsedTime;

        if (t < IGNITION_DUR) {
          // ── Phase 1: Ignition Build-up (0.0s → 1.2s) ──
          // Rocket trembles on pad, engines spool up, pad deluge smoke billows
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
          // ── Phase 2: Extended Cinematic Ascent & Memorial Virtual Tour (1.2s → 16.2s) ──
          // Slow, majestic climb up to PEAK_ALTITUDE (13.0m), passing by the glowing inscriptions
          const ascFrac = (t - IGNITION_DUR) / ASCENT_DUR;
          const curve = easeInOutCubic(ascFrac);
          ascentY = PEAK_ALTITUDE * curve;

          // Camera smoothly cranes up, arriving locked on booster midpoint at apogee
          const targetBoosterCenter = PEAK_ALTITUDE + BOOSTER_MID_Y;
          targetCameraY = currentBaseCameraY + (targetBoosterCenter - currentBaseCameraY) * curve;

          engineIntensity = 1.0;
          isPadSmokeActive = ascentY < 1.4;
          const sway = Math.sin(elapsed * 4.0) * 0.012 * (1 - ascFrac * 0.5);
          rocketGroup.position.set(sway, ascentY, 0);
          boosterGroup.position.set(0, 0, 0);
          capsuleGroup.position.set(0, 0, 0);
          capsuleGroup.visible = true;
          rotZ += Math.sin(elapsed * 3.2) * 0.015 * (1 - ascFrac * 0.3);

        } else if (t < SEP_END) {
          // ── Phase 3: Stage Separation with 100% Centered Booster (16.2s → 18.6s) ──
          // Booster holds rock-solid in the DEAD CENTER of the screen at apogee.
          // Capsule fires secondary thrusters and shoots completely out of the top of the screen!
          if (!isSeparated) {
            isSeparated = true;
            stagingFlashMat.opacity = 1.0;
          }
          stagingFlashMat.opacity = Math.max(0, stagingFlashMat.opacity - dt * 2.0);

          const sepFrac = (t - ASCENT_END) / SEP_DUR;
          // Capsule accelerates upward with clean power curve
          const capsuleRelY = Math.pow(sepFrac, 1.6) * 9.5;

          capsuleGroup.position.set(0, capsuleRelY, 0);
          capsuleGroup.visible = capsuleRelY < 7.5; // Hidden once clearly off-screen
          capsuleRcsLight.intensity = Math.max(0, 1.5 * (1 - sepFrac * 0.6));

          // Booster holds rock-solid at peak altitude with subtle micro-gravity drift
          const apogeeFloat = Math.sin(sepFrac * Math.PI) * 0.06;
          ascentY = PEAK_ALTITUDE + apogeeFloat;
          rocketGroup.position.set(0, ascentY, 0);
          boosterGroup.position.set(0, 0, 0);

          // Camera stays locked dead-center on booster: booster NEVER clips or cuts off!
          targetCameraY = ascentY + BOOSTER_MID_Y;
          engineIntensity = 0.2 * (1 - sepFrac * 0.8);
          isPadSmokeActive = false;

        } else if (t < BOOSTER_LAND_TIME) {
          // ── Phase 4: Booster Retro-Landing Descent (18.6s → 24.6s) ──
          // Capsule is in space orbit. Booster descends toward pad, camera tracking it all the way down.
          if (!capsuleExitedAtmosphere) capsuleExitedAtmosphere = true;
          capsuleGroup.position.set(0, 25.0, 0);
          capsuleGroup.visible = false;
          capsuleRcsLight.intensity = 0;

          const descFrac = (t - SEP_END) / BOOSTER_DESCENT_DUR;
          const descCurve = easeInOutCubic(descFrac);

          ascentY = PEAK_ALTITUDE * (1 - descCurve);
          rocketGroup.position.set(0, ascentY, 0);
          boosterGroup.position.set(0, 0, 0);

          engineIntensity = 0.88; // Retro-thruster burn
          isPadSmokeActive = ascentY < 1.2; // Ground cushion smoke near pad ring

          // Camera follows booster down, smoothly blending back to pad framing as it lands
          const currentBoosterCenter = ascentY + BOOSTER_MID_Y;
          targetCameraY = currentBaseCameraY + (currentBoosterCenter - currentBaseCameraY) * (1 - descCurve);

        } else if (t < REDOCK_START) {
          // ── Phase 5: Booster Touchdown on Pad (24.6s → 25.6s) ──
          // Soft touchdown on pad ring with authentic spring compression dampening
          if (!boosterLanded) boosterLanded = true;
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
          // ── Phase 6: Capsule Orbit Return & Re-docking (25.6s → 28.8s) ──
          // Booster is on the pad. Capsule re-enters from space above and docks smoothly.
          if (capsuleExitedAtmosphere && boosterLanded) {
            const dockFrac = (t - REDOCK_START) / REDOCK_DUR;
            const dockCurve = easeInOutCubic(dockFrac);
            const capsuleRelY = 8.5 * (1 - dockCurve);
            // Gentle RCS alignment sway as it approaches the docking collar
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
          // ── Phase 7: Golden Docking Lock & Reunited Rocket Settle (28.8s → 30.0s) ──
          capsuleGroup.position.set(0, 0, 0);
          capsuleGroup.visible = true;
          boosterGroup.position.set(0, 0, 0);
          rocketGroup.position.set(0, 0, 0);
          capsuleRcsLight.intensity = 0;

          if (!isDocked) {
            isDocked = true;
            dockingFlashMat.opacity = 1.0;
          }
          dockingFlashMat.opacity = Math.max(0, dockingFlashMat.opacity - dt * 2.0);

          ascentY = 0;
          targetCameraY = currentBaseCameraY;
          engineIntensity = 0;
          isPadSmokeActive = false;
          haloMat.opacity = 0.45 + Math.sin(elapsed * 2.0) * 0.15;

        } else {
          // Flight complete — Rocket unified, restored majestically on launch pad
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
            onFlightCompleteRef.current?.();
          }
        }

        // ── 3D Memorial Virtual Exhibition in the Sky: 3D Approach, Fly-Past & Recede ──
        const screenAspect = camera.aspect;
        const APPROACH_ZONE = 3.0; // 3.0m approach window below (anticipates approaching text early)
        const RECEDE_ZONE = 2.0;   // 2.0m recede window above

        memorialBanners.forEach((b) => {
          // Signed vertical delta: deltaY < 0 when camera approaches from below; deltaY > 0 when passing above
          const deltaY = camera.position.y - b.targetY;

          if (isFlightActive && deltaY >= -APPROACH_ZONE && deltaY <= RECEDE_ZONE) {
            let ease: number;
            let currentScale: number;
            let currentZ: number;
            let pitchX: number;
            let yawY: number;
            let targetOpacity: number;

            if (deltaY <= 0) {
              // ── 1. Approach Phase (Camera is below, ascending toward banner) ──
              // u goes from 0.0 (far below at -APPROACH_ZONE) to 1.0 (level with banner)
              const u = 1 + deltaY / APPROACH_ZONE;
              ease = u * u * (3 - 2 * u); // Smoothstep Hermite curve

              // Gradual scale expansion: begins small & distant (0.60x) -> expands to prominent forward size (1.30x)
              currentScale = 0.60 + (1.30 - 0.60) * Math.pow(ease, 1.2);

              // 3D Depth Travel (Z): emerges forward out of depth from Z = -0.5m to Z = +2.15m (brought right to foreground)
              currentZ = b.baseZ + (2.15 - b.baseZ) * Math.pow(ease, 1.25);

              // Perspective Pitch (X): Tilts slightly down toward climbing camera, leveling out as camera arrives
              pitchX = -(1 - ease) * 0.14;

              // Perspective Yaw (Y): Angled inward toward flight path, opening up into view
              yawY = -b.side * (0.08 - 0.04 * ease);

              // Luminous Opacity & Bloom: Smooth emergence
              targetOpacity = Math.pow(ease, 1.1);
            } else {
              // ── 2. Fly-Past & Recede Phase (Camera passes above, ascends toward stars) ──
              // v goes from 0.0 (level with banner) to 1.0 (passed at +RECEDE_ZONE)
              const v = deltaY / RECEDE_ZONE;
              ease = v * v * (3 - 2 * v); // Smoothstep Hermite curve

              // Graceful scale reduction: gently recedes from 1.30x back down to 0.60x
              currentScale = 1.30 - (1.30 - 0.60) * Math.pow(ease, 1.1);

              // 3D Depth Travel (Z): recedes back into depth from +2.15m to -0.5m
              currentZ = 2.15 + (b.baseZ - 2.15) * Math.pow(ease, 1.2);

              // Perspective Pitch (X): Tilts upward as camera looks down and away from it
              pitchX = ease * 0.12;

              // Perspective Yaw (Y): Returns to resting angle in the cosmos
              yawY = -b.side * (0.04 + 0.04 * ease);

              // Luminous Opacity: Gracefully fades back into the starry night
              targetOpacity = 1 - Math.pow(ease, 1.3);
            }

            // ── Centered Fly-Through Positioning (Hugging Center & Rocket Corridor Intimately) ──
            const distFromCam = Math.max(0.5, camera.position.z - currentZ);
            const frustumHalfH = distFromCam * Math.tan((camera.fov * 0.5 * Math.PI) / 180);
            const frustumHalfW = frustumHalfH * screenAspect;

            const bannerHalfW = (b.planeWidth * currentScale) * 0.5;

            // Direct central positioning: slightly alternating around center (±0.16m on mobile, ±0.20m on desktop)
            // Creating the breathtaking sensation of flying straight through the luminous calligraphy
            const centerShift = screenAspect < 0.7 ? 0.16 : 0.20;
            const maxSafeOffset = Math.max(0, frustumHalfW - bannerHalfW - 0.04);
            const safeX = Math.min(centerShift, maxSafeOffset);

            // Floating celestial sway
            const floatY = b.targetY + Math.sin(elapsed * 1.8 + b.targetY) * 0.02;
            const rollZ = Math.sin(elapsed * 1.4 + b.targetY) * 0.01;

            b.mesh.scale.set(currentScale, currentScale, currentScale);
            b.mesh.position.set(b.side * safeX, floatY, currentZ);
            b.mesh.rotation.set(pitchX, yawY, rollZ);

            b.mat.opacity += (targetOpacity - b.mat.opacity) * (1 - Math.exp(-dt / 0.12));

          } else {
            // Outside active interaction window: peacefully resting at baseline anchor in 3D environment
            b.mesh.scale.set(0.60, 0.60, 0.60);
            b.mesh.position.set(b.side * 0.18, b.targetY, b.baseZ);
            b.mesh.rotation.set(0, -b.side * 0.08, 0);
            b.mat.opacity += (0 - b.mat.opacity) * (1 - Math.exp(-dt / 0.2));
          }
        });
        // ✅ Frame-rate independent camera lerp
        const camAlpha = 1 - Math.exp(-dt / CAM_SMOOTH_TAU);
        camera.position.y += (targetCameraY - camera.position.y) * camAlpha;
      } else {
        // Stationary on pad
        const camAlpha = 1 - Math.exp(-dt / CAM_SMOOTH_TAU);
        camera.position.y += (currentBaseCameraY - camera.position.y) * camAlpha;
        boosterGroup.position.set(0, 0, 0);
        capsuleGroup.position.set(0, 0, 0);
        capsuleGroup.visible = true;
        capsuleRcsLight.intensity = 0;
        stagingFlashMat.opacity = 0; dockingFlashMat.opacity = 0;

        if (isLaunched || flightFinishedNotified) {
          rocketGroup.position.set(0, floatY, 0);
          haloMat.opacity = 0.42 + Math.sin(elapsed * 2.0) * 0.18;
          haloRing.rotation.z = elapsed * 0.3;
          thrusterLight.intensity = 0.75 + Math.sin(elapsed * 3) * 0.25;
          fuelMaterial.emissiveIntensity = 1.3 + Math.sin(elapsed * 2.5) * 0.25;
        } else {
          const tremble = isReady && !prefersReducedMotion ? Math.sin(elapsed * 39) * 0.0035 + Math.sin(elapsed * 27.5) * 0.0025 : 0;
          rocketGroup.position.set(tremble, floatY + tremble * 0.5, 0);
          haloMat.opacity = 0;
          thrusterLight.intensity = countingDown ? 1.6 + Math.sin(elapsed * 9) * 0.5 + Math.sin(elapsed * 23) * 0.25 : isReady ? 1.2 + Math.sin(elapsed * 4) * 0.4 : 0;
        }
      }

      // Orientation
      rocketGroup.rotation.set(pointer.currentY * 0.04, rotY, rotZ);

      // Thruster lighting & mach cones
      if (engineIntensity > 0.01) {
        thrusterLight.intensity = 3.5 * engineIntensity + Math.sin(elapsed * 33) * 0.6;
        machConeMat.opacity = Math.min(0.7, engineIntensity * 0.65 + Math.sin(elapsed * 29) * 0.1);
        machCone.scale.set(1.0, 1.0 + engineIntensity * 0.45, 1.0);
        machDiamondMat.opacity = Math.min(0.85, engineIntensity * 0.8 + Math.sin(elapsed * 43) * 0.15);
      } else {
        machConeMat.opacity = 0; machDiamondMat.opacity = 0;
      }

      // Spawn exhaust
      spawnExhaust(engineIntensity, dt, isPadSmokeActive);

      // ── Update Flame Particles (swap-remove, zero GC) ──
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

      // ── Update Smoke Particles (swap-remove, zero GC) ──
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
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
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
      kheibarCanardGeo.dispose();
      fattahGliderGeo.dispose();
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

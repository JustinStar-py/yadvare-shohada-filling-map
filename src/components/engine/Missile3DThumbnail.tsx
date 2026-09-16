"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MissileModel, getMissileConfig } from "./missile-catalog";
import {
  attachVisibilityPause,
  isMobileDevice,
  shouldUseAntialias,
} from "@/lib/client/quality";

interface Missile3DThumbnailProps {
  model: MissileModel;
  isSelected?: boolean;
  className?: string;
}

export default function Missile3DThumbnail({
  model,
  isSelected = false,
  className = "w-full h-36",
}: Missile3DThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId = 0;
    let isDisposed = false;
    let isVisible = typeof document === "undefined" ? true : !document.hidden;
    // anim is hoisted via function declaration below; kick only runs after mount.
    const kick = () => {
      if (animId === 0 && isVisible && !isDisposed) animId = requestAnimationFrame(animate);
    };

    const width = container.clientWidth || 180;
    const height = container.clientHeight || 140;

    // ── 1. Scene & Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 0.05, 5.4);
    camera.lookAt(0, 0.05, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: shouldUseAntialias(),
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileDevice() ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── 2. Lighting ──
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.65);
    scene.add(ambientLight);

    const dirWarm = new THREE.DirectionalLight(0xfff5e6, 1.8);
    dirWarm.position.set(2.5, 4, 3.5);
    scene.add(dirWarm);

    const dirCool = new THREE.DirectionalLight(0x60a5fa, 0.9);
    dirCool.position.set(-2.5, 1.5, -2);
    scene.add(dirCool);

    // ── 3. Materials ──
    const GOLD_COLOR = new THREE.Color("#f59e0b");
    const NOZZLE_COLOR = new THREE.Color("#1e2430");

    const cfg = getMissileConfig(model);

    const hullMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.colorHex),
      metalness: cfg.metalness,
      roughness: cfg.roughness,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: GOLD_COLOR,
      emissive: GOLD_COLOR,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.22,
    });

    const nozzleMaterial = new THREE.MeshStandardMaterial({
      color: NOZZLE_COLOR,
      metalness: 0.85,
      roughness: 0.38,
      side: THREE.DoubleSide,
    });

    const fuelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.fuelColor),
      emissive: new THREE.Color(cfg.fuelEmissive),
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Mobile: skip the transmission pass (extra scene render on tile GPUs).
    const translucentMetalMaterial: THREE.Material = isMobileDevice()
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
          transmission: 0.5,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

    // ── 4. Rocket / Drone Group Hierarchy ──
    const rocketGroup = new THREE.Group();
    scene.add(rocketGroup);

    let propMesh: THREE.Object3D | null = null;
    let decalTex: THREE.CanvasTexture | null = null;

    if (model === "shahed136") {
      // ── Shahed 136 Delta Wing Drone (High-Fidelity Authentic Geometry) ──
      const droneBody = new THREE.Group();
      rocketGroup.add(droneBody);

      const shellMat = new THREE.MeshStandardMaterial({
        color: cfg.colorHex,
        metalness: cfg.metalness,
        roughness: cfg.roughness,
      });

      const warheadMat = new THREE.MeshStandardMaterial({
        color: "#1e3a8a",
        metalness: 0.4,
        roughness: 0.35,
      });

      const darkMat = new THREE.MeshStandardMaterial({
        color: "#1e293b",
        metalness: 0.6,
        roughness: 0.35,
      });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: "#d8f3ff",
        transparent: true,
        opacity: 0.28,
        metalness: 0.05,
        roughness: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const navRedMat = new THREE.MeshBasicMaterial({ color: "#ef4444" });
      const navGreenMat = new THREE.MeshBasicMaterial({ color: "#34d399" });

      // 1. Delta Wing with rear pusher cutout notch
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, -2.7);
      wingShape.lineTo(3.1, 1.65);
      wingShape.lineTo(0.65, 1.25);
      wingShape.lineTo(0, 0.8);
      wingShape.lineTo(-0.65, 1.25);
      wingShape.lineTo(-3.1, 1.65);
      wingShape.closePath();

      const wingsGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
        steps: 1,
      });
      const wingMesh = new THREE.Mesh(wingsGeo, shellMat);
      wingMesh.position.set(0, -0.12, 0);
      wingMesh.rotation.x = Math.PI / 2;
      droneBody.add(wingMesh);

      // 1b. Dark navy warhead triangular nose cap & radome cone
      const warheadShape = new THREE.Shape();
      warheadShape.moveTo(0, -2.72);
      warheadShape.lineTo(0.55, -1.8);
      warheadShape.lineTo(-0.55, -1.8);
      warheadShape.closePath();

      const warheadGeo = new THREE.ExtrudeGeometry(warheadShape, {
        depth: 0.108,
        bevelEnabled: true,
        bevelThickness: 0.042,
        bevelSize: 0.042,
        bevelSegments: 2,
        steps: 1,
      });
      const warheadMesh = new THREE.Mesh(warheadGeo, warheadMat);
      warheadMesh.position.set(0, -0.124, 0);
      warheadMesh.rotation.x = Math.PI / 2;
      droneBody.add(warheadMesh);

      const noseConeGeo = new THREE.ConeGeometry(0.35, 0.94, 24);
      noseConeGeo.rotateX(-Math.PI / 2);
      const noseCone = new THREE.Mesh(noseConeGeo, warheadMat);
      noseCone.position.set(0, 0.16, -2.24);
      droneBody.add(noseCone);

      // 2. Transparent aerodynamic canopy along the spine
      const glassBody = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), glassMat);
      glassBody.scale.set(0.53, 0.48, 2.3);
      glassBody.position.set(0, 0.3, -0.35);
      glassBody.renderOrder = 2;
      droneBody.add(glassBody);

      // 3. Tank chassis bed & internal fuel cell
      const tankChassis = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 2.55), darkMat);
      tankChassis.position.set(0, 0.04, -0.3);
      droneBody.add(tankChassis);

      const fuelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.40, 2.4), fuelMaterial);
      fuelMesh.position.set(0, 0.22, -0.3);
      droneBody.add(fuelMesh);

      // 4. Reinforcing torus frame rings
      for (const z of [-1.48, -0.3, 0.88]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 8, 36), shellMat);
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

        const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });
        const fin = new THREE.Mesh(finGeo, shellMat);
        fin.position.set(side * 2.85, -0.05, 1.15);
        fin.rotation.y = Math.PI / 2;
        droneBody.add(fin);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.065, 12, 8),
          side < 0 ? navRedMat : navGreenMat
        );
        navLight.position.set(side * 3.0, 0.04, 1.58);
        navLight.scale.y = 0.7;
        droneBody.add(navLight);
      }

      // 6. Rear pusher propeller assembly with spherical hub and cross blades
      const propellerGroup = new THREE.Group();
      propellerGroup.position.set(0, 0.3, 2.05);
      droneBody.add(propellerGroup);

      const propHub = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), darkMat);
      propellerGroup.add(propHub);

      const propBlades = new THREE.Group();
      propellerGroup.add(propBlades);

      for (let i = 0; i < 2; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.09, 0.05), darkMat);
        blade.rotation.z = i * Math.PI / 2;
        propBlades.add(blade);
      }
      propMesh = propBlades;

      // Orient drone vertically (+Y nose, +Z dorsal canopy towards camera)
      droneBody.rotation.x = Math.PI / 2;
      droneBody.scale.setScalar(0.40);
    } else {
    const baseR = 0.32;
    const noseStart = 0.55;
    const CHAMBER_H = 1.1;
    const CHAMBER_CENTER_Y = 0.0;
    const CHAMBER_BOTTOM_Y = CHAMBER_CENTER_Y - CHAMBER_H / 2;

    // A) Nose Cone according to model
    let noseGeo: THREE.BufferGeometry;
    let beaconY = noseStart + 1.35;

    if (model === "fattah") {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const r = baseR * Math.pow(1 - t, 0.72) * (1 + 0.08 * Math.sin(t * Math.PI));
        pts.push(new THREE.Vector2(Math.max(r, 0.001), noseStart + t * 1.45));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.45;
    } else if (model === "sejjil") {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = baseR * Math.sqrt(Math.max(0, 1 - t * t));
        pts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.25));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.25;
    } else if (model === "khorramshahr") {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = t < 0.2 ? baseR * (1 + 0.05 * (1 - t * 5)) : baseR * (1 - (t - 0.2) * 1.08);
        pts.push(new THREE.Vector2(Math.max(r, 0.035), noseStart + t * 1.15));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.15;
    } else if (model === "emad") {
      const pts: THREE.Vector2[] = [];
      pts.push(new THREE.Vector2(baseR * 1.05, noseStart));
      pts.push(new THREE.Vector2(baseR * 0.98, noseStart + 0.10));
      pts.push(new THREE.Vector2(baseR * 0.88, noseStart + 0.24));
      pts.push(new THREE.Vector2(baseR * 0.86, noseStart + 0.34));
      pts.push(new THREE.Vector2(baseR * 0.72, noseStart + 0.60));
      pts.push(new THREE.Vector2(baseR * 0.54, noseStart + 0.95));
      pts.push(new THREE.Vector2(baseR * 0.35, noseStart + 1.30));
      pts.push(new THREE.Vector2(baseR * 0.15, noseStart + 1.65));
      pts.push(new THREE.Vector2(0.012, noseStart + 1.82));
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.82;
    } else if (model === "reyhaneh") {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = baseR * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.8)));
        pts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.32));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.32;
    } else {
      // Kheibar
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const r = baseR * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.06 * t);
        pts.push(new THREE.Vector2(Math.max(r, 0.002), noseStart + t * 1.35));
      }
      noseGeo = new THREE.LatheGeometry(pts, 32);
      beaconY = noseStart + 1.35;
    }

    const noseMesh = new THREE.Mesh(noseGeo, hullMaterial);
    rocketGroup.add(noseMesh);

    const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), goldMaterial);
    beaconMesh.position.set(0, beaconY, 0);
    rocketGroup.add(beaconMesh);

    const upperCollar = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.005, 0.016, 10, 36), goldMaterial);
    upperCollar.rotation.x = Math.PI / 2;
    upperCollar.position.y = noseStart;
    rocketGroup.add(upperCollar);

    // B) Model Accessories
    if (model === "kheibar") {
      // 4 mid-fuselage triangular canards
      const canardShape = new THREE.Shape();
      canardShape.moveTo(0, 0);
      canardShape.lineTo(0.22, -0.15);
      canardShape.lineTo(0, -0.20);
      canardShape.closePath();
      const canardGeo = new THREE.ExtrudeGeometry(canardShape, { depth: 0.012, bevelEnabled: false });
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.y = (i * Math.PI) / 2;
        const c = new THREE.Mesh(canardGeo, hullMaterial);
        c.position.set(baseR * 0.95, 0.46, -0.006);
        arm.add(c);
        rocketGroup.add(arm);
      }
    } else if (model === "fattah") {
      // 4 hypersonic maneuvering fins at base of warhead
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(0.24, -0.09);
      finShape.lineTo(0.17, -0.20);
      finShape.lineTo(0, -0.20);
      finShape.closePath();
      const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.012, bevelEnabled: false });
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.y = (i * Math.PI) / 2;
        const f = new THREE.Mesh(finGeo, hullMaterial);
        f.position.set(baseR * 0.95, noseStart + 0.10, -0.006);
        arm.add(f);
        rocketGroup.add(arm);
      }
    } else if (model === "sejjil") {
      // Dual golden interstage staging rings
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.010, 0.018, 10, 36), goldMaterial);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = -0.82;
      rocketGroup.add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.010, 0.018, 10, 36), goldMaterial);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.y = -1.05;
      rocketGroup.add(ring2);
    } else if (model === "khorramshahr") {
      // Heavy payload collar
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 1.08, baseR * 1.04, 0.09, 32), goldMaterial);
      collar.position.y = noseStart + 0.05;
      rocketGroup.add(collar);
    } else if (model === "emad") {
      // 4 terminal steerable warhead guidance canards on stepped waist
      const canardShape = new THREE.Shape();
      canardShape.moveTo(0, 0.04);
      canardShape.lineTo(0.26, -0.06);
      canardShape.lineTo(0.24, -0.20);
      canardShape.lineTo(0.12, -0.22);
      canardShape.lineTo(0, -0.20);
      canardShape.closePath();
      const canardGeo = new THREE.ExtrudeGeometry(canardShape, { depth: 0.014, bevelEnabled: false });
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.y = (i * Math.PI) / 2;
        const c = new THREE.Mesh(canardGeo, hullMaterial);
        c.position.set(baseR * 0.86, noseStart + 0.26, -0.007);
        arm.add(c);
        rocketGroup.add(arm);
      }
      const waistRing = new THREE.Mesh(new THREE.TorusGeometry(baseR * 0.88, 0.014, 10, 32), goldMaterial);
      waistRing.rotation.x = Math.PI / 2;
      waistRing.position.y = noseStart + 0.24;
      rocketGroup.add(waistRing);
    } else if (model === "reyhaneh") {
      // Cute golden decorative waist ring with charm
      const ring = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.012, 0.016, 10, 36), goldMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = noseStart + 0.05;
      rocketGroup.add(ring);
      const charm = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), goldMaterial);
      charm.position.set(baseR + 0.02, noseStart + 0.05, 0);
      rocketGroup.add(charm);
    }

    // Decal Canvas for thumbnail text & stickers
    const decalCanvas = document.createElement("canvas");
    decalCanvas.width = 256;
    decalCanvas.height = 1024;
    const decalCtx = decalCanvas.getContext("2d");
    if (decalCtx) {
      decalCtx.save();
      decalCtx.translate(128, 512);
      decalCtx.rotate(Math.PI / 2);
      if (model === "reyhaneh") {
        decalCtx.font = 'bold 70px "Comic Sans MS", "Arial Rounded MT Bold", "Vazirmatn", cursive, sans-serif';
        decalCtx.textAlign = "center";
        decalCtx.textBaseline = "middle";
        decalCtx.strokeStyle = "#ffffff";
        decalCtx.lineWidth = 14;
        decalCtx.strokeText("ریحانه 🌸", 0, -10);
        decalCtx.fillStyle = "#be185d";
        decalCtx.fillText("ریحانه 🌸", 0, -10);

        // Cute heart sticker
        decalCtx.fillStyle = "#ffffff";
        decalCtx.beginPath();
        decalCtx.arc(-220, 20, 24, 0, Math.PI * 2);
        decalCtx.arc(-200, 20, 24, 0, Math.PI * 2);
        decalCtx.fill();
        decalCtx.fillStyle = "#ff4081";
        decalCtx.beginPath();
        decalCtx.arc(-220, 20, 20, 0, Math.PI * 2);
        decalCtx.arc(-200, 20, 20, 0, Math.PI * 2);
        decalCtx.fill();

        // Cute flower sticker
        decalCtx.fillStyle = "#ffffff";
        decalCtx.beginPath();
        decalCtx.arc(180, 0, 26, 0, Math.PI * 2);
        decalCtx.fill();
        decalCtx.fillStyle = "#facc15";
        decalCtx.beginPath();
        decalCtx.arc(180, 0, 16, 0, Math.PI * 2);
        decalCtx.fill();

        // Cute star
        decalCtx.fillStyle = "#fde047";
        decalCtx.beginPath();
        decalCtx.arc(-320, -10, 18, 0, Math.PI * 2);
        decalCtx.fill();
      } else {
        decalCtx.fillStyle = cfg.textColor;
        decalCtx.font = '900 70px "Arial Black", "Impact", sans-serif';
        decalCtx.textAlign = "center";
        decalCtx.textBaseline = "middle";
        const label =
          model === "fattah"
            ? "FATTAH"
            : model === "sejjil"
            ? "SEJJIL"
            : model === "khorramshahr"
            ? "KHORRAM"
            : model === "emad"
            ? "EMAD"
            : "KHEIBAR";
        decalCtx.fillText(label, 0, 0);
      }
      decalCtx.restore();
    }
    decalTex = new THREE.CanvasTexture(decalCanvas);
    decalTex.colorSpace = THREE.SRGBColorSpace;
    const decalMat = new THREE.MeshBasicMaterial({
      map: decalTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
    });
    const dPts: THREE.Vector2[] = [];
    for (let y = 0.62; y <= 1.45; y += 0.05) {
      const t = (y - noseStart) / 1.35;
      const r = baseR * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.06 * t) + 0.009;
      dPts.push(new THREE.Vector2(r, y));
    }
    const dGeo = new THREE.LatheGeometry(dPts, 16, -Math.PI * 0.22, Math.PI * 0.44);
    for (let i = 0; i < 4; i++) {
      const dMesh = new THREE.Mesh(dGeo, decalMat);
      dMesh.rotation.y = (i * Math.PI) / 2;
      rocketGroup.add(dMesh);
    }

    // C) Translucent Metallic Fuel Tank
    const tankCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(baseR, baseR, CHAMBER_H, 32, 1, true),
      translucentMetalMaterial
    );
    tankCylinder.position.y = CHAMBER_CENTER_Y;
    rocketGroup.add(tankCylinder);

    // Glowing Golden Salawat Liquid inside
    const fuelMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(baseR * 0.90, baseR * 0.90, CHAMBER_H * 0.65, 24),
      fuelMaterial
    );
    fuelMesh.position.y = CHAMBER_BOTTOM_Y + (CHAMBER_H * 0.65) / 2;
    rocketGroup.add(fuelMesh);

    // 4 longitudinal metallic structural stringers
    const strutGeo = new THREE.CylinderGeometry(0.012, 0.012, CHAMBER_H, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const strut = new THREE.Mesh(strutGeo, hullMaterial);
      strut.position.set(Math.cos(a) * (baseR + 0.003), CHAMBER_CENTER_Y, Math.sin(a) * (baseR + 0.003));
      rocketGroup.add(strut);
    }

    const lowerCollar = new THREE.Mesh(new THREE.TorusGeometry(baseR + 0.005, 0.016, 10, 36), goldMaterial);
    lowerCollar.rotation.x = Math.PI / 2;
    lowerCollar.position.y = CHAMBER_BOTTOM_Y;
    rocketGroup.add(lowerCollar);

    // D) Booster Skirt & Engine Nozzle
    const skirtPts: THREE.Vector2[] = [
      new THREE.Vector2(0.24, -1.25),
      new THREE.Vector2(0.36, -1.15),
      new THREE.Vector2(0.34, -0.85),
      new THREE.Vector2(baseR, CHAMBER_BOTTOM_Y),
    ];
    const skirtGeo = new THREE.LatheGeometry(skirtPts, 32);
    const skirtMesh = new THREE.Mesh(skirtGeo, hullMaterial);
    rocketGroup.add(skirtMesh);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 0.26, 24, 1, true), nozzleMaterial);
    nozzle.position.set(0, -1.38, 0);
    rocketGroup.add(nozzle);

    // E) 4 Stabilization Base Fins (Emad has dedicated swept-delta wings with vertical fences)
    const baseFinShape = new THREE.Shape();
    if (model === "emad") {
      baseFinShape.moveTo(0, 0.06);
      baseFinShape.lineTo(0.38, -0.16);
      baseFinShape.lineTo(0.60, -0.42);
      baseFinShape.lineTo(0.60, -0.64);
      baseFinShape.lineTo(0.16, -0.64);
      baseFinShape.lineTo(0, -0.56);
      baseFinShape.closePath();
    } else {
      baseFinShape.moveTo(0, 0);
      baseFinShape.lineTo(0.48, -0.35);
      baseFinShape.lineTo(0.48, -0.58);
      baseFinShape.lineTo(0, -0.58);
      baseFinShape.closePath();
    }
    const baseFinGeo = new THREE.ExtrudeGeometry(baseFinShape, { depth: 0.025, bevelEnabled: false });

    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(baseFinGeo, hullMaterial);
      fin.position.set(0.3, -0.62, -0.0125);
      arm.add(fin);
      rocketGroup.add(arm);
    }
    } // End of else (cylinder rocket)

    // F) Active Golden Halo Base Pad if selected
    let haloMesh: THREE.Mesh | null = null;
    if (isSelected) {
      const haloGeo = new THREE.RingGeometry(0.65, 0.72, 36);
      const haloMat = new THREE.MeshBasicMaterial({
        color: GOLD_COLOR,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = -Math.PI / 2;
      haloMesh.position.y = -1.55;
      scene.add(haloMesh);
    }

    // ── 5. Animation Loop ──
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposed || !entries[0]) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    let angle = 0;
    const animate = () => {
      animId = 0;
      if (isDisposed || !isVisible) return;

      angle += 0.014;
      rocketGroup.rotation.y = angle;
      if (propMesh) {
        propMesh.rotation.z += 0.35;
      }

      if (haloMesh) {
        (haloMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(angle * 2) * 0.25;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    const detachVisibility = attachVisibilityPause(container, (visible) => {
      isVisible = visible;
      if (visible) kick();
    });

    kick();

    return () => {
      isDisposed = true;
      isVisible = false;
      if (animId !== 0) cancelAnimationFrame(animId);
      detachVisibility();
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      decalTex?.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [model, isSelected]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}
    />
  );
}

